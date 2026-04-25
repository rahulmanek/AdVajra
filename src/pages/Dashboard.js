import React, { useEffect, useState } from 'react';
import { Button, Icon, Slot, Spinner } from '@wordpress/components';
import { arrowRight, external, plus, warning } from '@wordpress/icons';
import { useSelect } from '@wordpress/data';
import { Link } from 'react-router-dom';
import apiFetch from '@wordpress/api-fetch';
import { STORE_NAME } from '../store/constants';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { applyFilters } from '../hooks';
import { useNotification } from '../context/NotificationDataCtx';
import Tooltip from '../components/Tooltip';

const Dashboard = () => {
	const [ overview, setOverview ] = useState( null );
	const [ dashboardSettings, setDashboardSettings ] = useState( {} );
	const [ switchState, setSwitchState ] = useState( {} );
	const [ switchBusy, setSwitchBusy ] = useState( '' );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ analyticsError, setAnalyticsError ] = useState( false );
	const [ activeModules, setActiveModules ] = useState(
		window.advajraSettings?.activeModules || []
	);
	const { addNotification } = useNotification();

	useDocumentTitle( 'Overview' );

	const { ads, groups, placements, isStoreReady } = useSelect( ( select ) => {
		const store = select( STORE_NAME );
		return {
			ads: store.getAds(),
			groups: store.getGroups(),
			placements: store.getPlacements(),
			isStoreReady:
				store.hasLoadedAds() &&
				store.hasLoadedGroups() &&
				store.hasLoadedPlacements(),
		};
	}, [] );

	useEffect( () => {
		if ( ! isStoreReady ) {
			return;
		}

		let isMounted = true;

		const loadData = async () => {
			let settingsPayload = {};
			try {
				settingsPayload =
					( await apiFetch( { path: '/advajra/v1/settings' } ) ) ||
					{};
			} catch ( error ) {
				settingsPayload = {};
			}

			if ( isMounted ) {
				setDashboardSettings( settingsPayload );
			}

			try {
				const overviewPayload = await apiFetch( {
					path: '/advajra/v1/dashboard/overview',
				} );
				if ( ! isMounted ) {
					return;
				}
				if ( isOverviewV2Payload( overviewPayload ) ) {
					setOverview( overviewPayload );
					setSwitchState(
						getSwitchState( overviewPayload?.switchboard || [] )
					);
					setIsLoading( false );
					return;
				}

				const adapted = convertLegacyToV2(
					overviewPayload || {},
					placements,
					settingsPayload,
					activeModules
				);
				setOverview( adapted );
				setSwitchState( getSwitchState( adapted?.switchboard || [] ) );
				setAnalyticsError( true );
				setIsLoading( false );
			} catch ( error ) {
				if ( ! isMounted ) {
					return;
				}
				const fallback = buildFallbackOverviewV2(
					ads,
					groups,
					placements,
					settingsPayload,
					activeModules
				);
				setOverview( fallback );
				setSwitchState( getSwitchState( fallback?.switchboard || [] ) );
				setAnalyticsError( true );
				setIsLoading( false );
			}
		};

		loadData();

		return () => {
			isMounted = false;
		};
	}, [ isStoreReady, ads, groups, placements, activeModules ] );

	const toggleSwitch = async ( switchItem ) => {
		if ( ! switchItem?.editable ) {
			return;
		}

		const currentEnabled = !! switchState[ switchItem.id ];
		const nextEnabled = ! currentEnabled;

		setSwitchBusy( switchItem.id );
		setSwitchState( ( prev ) => ( {
			...prev,
			[ switchItem.id ]: nextEnabled,
		} ) );

		try {
			if ( switchItem.action_type === 'setting' ) {
				const nextValue =
					switchItem.action_key === 'disable_all_ads'
						? ! nextEnabled
						: nextEnabled;

				const updatedSettings = await apiFetch( {
					path: '/advajra/v1/settings',
					method: 'POST',
					data: { [ switchItem.action_key ]: nextValue },
				} );

				setDashboardSettings( ( prev ) => ( {
					...prev,
					...updatedSettings,
				} ) );
			}

			if ( switchItem.action_type === 'module' ) {
				const response = await apiFetch( {
					path: '/advajra/v1/modules/toggle',
					method: 'POST',
					data: { id: switchItem.action_key, active: nextEnabled },
				} );

				if ( ! response?.success ) {
					throw new Error( 'module_toggle_failed' );
				}

				setActiveModules( ( prev ) => {
					if ( nextEnabled ) {
						if ( prev.includes( switchItem.action_key ) ) {
							return prev;
						}
						return [ ...prev, switchItem.action_key ];
					}
					return prev.filter(
						( moduleId ) => moduleId !== switchItem.action_key
					);
				} );
			}

			addNotification( { type: 'success', message: 'Updated.' } );
		} catch ( error ) {
			setSwitchState( ( prev ) => ( {
				...prev,
				[ switchItem.id ]: currentEnabled,
			} ) );
			addNotification( {
				type: 'error',
				message: 'Could not update this control.',
			} );
		} finally {
			setSwitchBusy( '' );
		}
	};

	if ( isLoading || ! overview ) {
		return (
			<div className="advajra-overview advajra-overview--loading">
				<div className="av-overview-spinner">
					<Spinner />
				</div>
			</div>
		);
	}

	const switchboard = ( overview.switchboard || [] ).map( ( item ) => ( {
		...item,
		enabled: switchState[ item.id ] ?? !! item.enabled,
	} ) );

	const overviewContext = {
		overview,
		ads,
		groups,
		placements,
		dashboardSettings,
		activeModules,
		isPro: !! window.advajraSettings?.isPro,
	};

	const riskQueue = applyFilters(
		'advajra.dashboard.riskQueue',
		overview.risk_queue || [],
		overviewContext
	);
	const optimizationQueue = applyFilters(
		'advajra.dashboard.optimizationQueue',
		overview.optimization_queue || [],
		overviewContext
	);
	const activityFeed = applyFilters(
		'advajra.dashboard.activityFeed',
		overview.activity_feed || [],
		overviewContext
	);
	const state = overview.state || {};
	const kpis = overview.kpis || {};
	const inventoryRows = overview.inventory_health?.rows || [];
	const advanced = overview.advanced_optimization || {};
	const licenseValue = getLicenseLabel( state?.license );
	const onJoinWaitlist = () => {
		addNotification( {
			type: 'success',
			message:
				'Waitlist action saved. We will connect this in a later update.',
		} );
	};

	const stateRail = [
		{
			id: 'last_sync',
			label: 'Last Sync',
			value: state?.last_sync?.label || 'Not available',
			status: state?.tracking_pipeline?.status || 'pending',
			help: state?.last_sync?.help,
		},
		{
			id: 'pipeline',
			label: 'Tracking Status',
			value: state?.tracking_pipeline?.message || 'Pending',
			status: state?.tracking_pipeline?.status || 'pending',
			help: state?.tracking_pipeline?.help,
		},
		{
			id: 'license',
			label: 'License State',
			value: licenseValue,
			status: state?.license?.locked ? 'degraded' : 'healthy',
			help: state?.license?.help,
		},
		{
			id: 'api',
			label: 'API Status',
			value: state?.api_degradation?.message || 'Normal',
			status: state?.api_degradation?.status || 'healthy',
			help: state?.api_degradation?.help,
		},
	];

	return (
		<div className="advajra-overview">
			<div className="av-overview-shell av-overview-shell--v3">
				<div className="av-overview-headline av-overview-headline--v3">
					<div>
						<h1>Overview</h1>
						<p>
							Ops-first command deck for delivery, risks, and
							optimization decisions.
						</p>
					</div>
					<div className="av-headline-actions">
						<Link to="/ads/new">
							<Button variant="primary">
								<Icon icon={ plus } size={ 18 } /> New Ad
							</Button>
						</Link>
						<Link to="/placements/new">
							<Button variant="secondary">New Placement</Button>
						</Link>
					</div>
				</div>

				<div className="av-state-rail">
					{ stateRail.map( ( railItem ) => (
						<div
							key={ railItem.id }
							className={ `av-state-tile av-state-tile--${
								railItem.status || 'pending'
							}` }
						>
							<div className="av-label-row">
								<span>{ railItem.label }</span>
								<HelpHint text={ railItem.help } />
							</div>
							<strong>{ railItem.value }</strong>
						</div>
					) ) }
				</div>

				<div className="av-panel av-panel--snapshot">
					<div className="av-panel-head">
						<div>
							<h3>Performance Snapshot</h3>
							<p>Core metrics with quick in-context help.</p>
						</div>
						{ analyticsError && (
							<span className="av-state-chip av-state-chip--warn">
								<Icon icon={ warning } size={ 14 } />{ ' ' }
								Compatibility mode
							</span>
						) }
					</div>
					<div className="av-kpi-grid">
						{ [
							'ad_requests',
							'coverage',
							'impressions',
							'ctr',
							'impression_rpm',
							'avg_viewable_time',
						].map( ( key ) => (
							<KpiCard
								key={ key }
								kpiKey={ key }
								card={ kpis[ key ] || {} }
								onJoinWaitlist={ onJoinWaitlist }
							/>
						) ) }
					</div>
				</div>

				<div className="av-panel av-panel--risk-queue">
					<div className="av-panel-head">
						<div>
							<h3>Delivery Risk Queue</h3>
							<p>
								Ranked by severity and impact. Each action opens
								the exact settings or list screen.
							</p>
						</div>
					</div>
					<div className="av-card-stack">
						{ riskQueue.length > 0 ? (
							riskQueue.map( ( item ) => (
								<QueueItem key={ item.id } item={ item } />
							) )
						) : (
							<EmptyAction
								title="No immediate delivery risks"
								description="System is healthy. Keep monitoring inventory and tracking."
								actionLabel="Open Analytics"
								actionTarget="/analytics"
							/>
						) }
					</div>
				</div>

				<div className="av-overview-grid av-overview-grid--two-up">
					<div className="av-panel av-panel--inventory-map">
						<div className="av-panel-head">
							<div>
								<h3>Inventory Health Map</h3>
								<p>
									Coverage, assignment, and disabled slots by
									placement type
								</p>
							</div>
						</div>
						<div className="av-inventory-table">
							{ inventoryRows.map( ( row ) => (
								<div
									key={ row.type }
									className="av-inventory-row"
								>
									<div>
										<strong>{ row.label }</strong>
										<span>{ row.coverage }% coverage</span>
									</div>
									<div className="av-inventory-meta">
										<span>
											{ row.assigned }/{ row.total }
										</span>
										<em>{ row.disabled } disabled</em>
									</div>
								</div>
							) ) }
						</div>
					</div>

					<div className="av-panel av-panel--switchboard">
						<div className="av-panel-head">
							<div>
								<h3>Execution Switchboard</h3>
								<p>
									Names match Settings exactly to avoid
									confusion.
								</p>
							</div>
						</div>
						<div className="av-switch-grid">
							{ switchboard.map( ( item ) => (
								<SwitchControl
									key={ item.id }
									item={ item }
									isBusy={ switchBusy === item.id }
									onToggle={ () => toggleSwitch( item ) }
								/>
							) ) }
						</div>
					</div>
				</div>

				<div className="av-overview-grid av-overview-grid--two-up">
					<div className="av-panel">
						<div className="av-panel-head">
							<div>
								<h3>Optimization Queue</h3>
								<p>
									Auto-generated from recent trends. Appears
									only when thresholds are crossed.
								</p>
							</div>
						</div>
						<div className="av-card-stack">
							{ optimizationQueue.length > 0 ? (
								optimizationQueue.map( ( item ) => (
									<QueueItem
										key={ item.id }
										item={ item }
										type="upside"
									/>
								) )
							) : (
								<EmptyAction
									title="No active optimization alerts"
									description="Performance is stable. Track momentum in Analytics."
									actionLabel="Open Analytics"
									actionTarget="/analytics"
								/>
							) }
						</div>
					</div>

					<div className="av-panel">
						<div className="av-panel-head">
							<div>
								<h3>Team Activity Feed</h3>
								<p>Who changed what, when, and the next step</p>
							</div>
						</div>
						<div className="av-card-stack">
							{ activityFeed.map( ( item ) => (
								<ActivityItem key={ item.id } item={ item } />
							) ) }
						</div>
					</div>
				</div>

				<div className="av-panel av-panel--advanced-opt">
					<div className="av-panel-head">
						<div>
							<h3>Advanced Optimization</h3>
							<p>
								{ advanced.description ||
									'Context-aware advanced actions' }
							</p>
						</div>
					</div>
					{ advanced.status === 'available' ? (
						<div className="av-card-stack">
							{ ( advanced.items || [] ).map( ( item ) => (
								<QueueItem
									key={ item.id }
									item={ item }
									type="upside"
								/>
							) ) }
						</div>
					) : (
						<div className="av-pro-default">
							<p>
								{ advanced.description ||
									'Unlock advanced forecasting and optimization automation.' }
							</p>
							<ActionLink
								target={
									advanced.cta?.target ||
									'https://advajra.com/pricing'
								}
								label={
									advanced.cta?.label || 'Upgrade to PRO'
								}
								className="av-inline-link"
							/>
						</div>
					) }
				</div>

				<Slot
					name="AdvajraDashboardInsights"
					fillProps={ overviewContext }
				/>
			</div>
		</div>
	);
};

const KpiCard = ( { card, kpiKey, onJoinWaitlist } ) => {
	const isRpmComingSoon =
		kpiKey === 'impression_rpm' && card.connected === false;

	return (
		<div
			className={ `av-kpi-card ${
				isRpmComingSoon ? 'av-kpi-card--coming-soon' : ''
			}` }
		>
			<div className="av-label-row">
				<span className="av-kpi-label">
					{ isRpmComingSoon ? 'Revenue RPM' : card.label || 'Metric' }
				</span>
				{ isRpmComingSoon && (
					<em className="av-soon-pill">Coming soon</em>
				) }
				<HelpHint text={ card.help } />
			</div>
			{ ! isRpmComingSoon && <strong>{ card.display || '0' }</strong> }
			{ isRpmComingSoon && (
				<span className="av-kpi-note">AdSense + GAM integration</span>
			) }
			{ isRpmComingSoon && (
				<button
					type="button"
					className="av-kpi-cta av-kpi-cta--text"
					onClick={ onJoinWaitlist }
				>
					Join waitlist
				</button>
			) }
			{ ! isRpmComingSoon && card.connected === false && card.cta && (
				<ActionLink
					target={ card.cta }
					label="Connect"
					className="av-kpi-cta"
				/>
			) }
		</div>
	);
};

const QueueItem = ( { item, type = 'risk' } ) => (
	<div
		className={ `av-queue-item av-queue-item--${ type } av-queue-item--${
			item.severity || 'low'
		}` }
	>
		<div>
			<strong>{ item.title }</strong>
			<span>{ item.description || item.value || '' }</span>
		</div>
		<div className="av-queue-meta">
			{ item.severity && <em>{ item.severity }</em> }
			<ActionLink
				target={ item.action_target }
				label={ item.action_label || 'Open' }
				className="av-inline-link"
			/>
		</div>
	</div>
);

const SwitchControl = ( { item, isBusy, onToggle } ) => {
	if ( ! item.editable ) {
		return (
			<Link
				to={ item.action_target || '/settings' }
				className="av-link-card"
			>
				<div>
					<strong>{ item.label }</strong>
					<span>
						{ item.description ||
							( item.enabled ? 'Configured' : 'Needs setup' ) }
					</span>
				</div>
				<Icon icon={ arrowRight } size={ 14 } />
			</Link>
		);
	}

	return (
		<button
			type="button"
			className={ `av-mini-switch ${
				item.enabled ? 'is-on' : 'is-off'
			}` }
			disabled={ isBusy }
			onClick={ onToggle }
		>
			<div>
				<strong>{ item.label }</strong>
				<span>
					{ item.description ||
						( item.enabled ? 'Enabled' : 'Disabled' ) }
				</span>
			</div>
			<em>{ item.enabled ? 'ON' : 'OFF' }</em>
		</button>
	);
};

const HelpHint = ( { text } ) => {
	if ( ! text ) {
		return null;
	}

	return <Tooltip content={ text } position="bottom" icon="?" />;
};

const ActivityItem = ( { item } ) => (
	<div className="av-activity-item">
		<div>
			<strong>{ item.summary }</strong>
			<span>
				{ item.actor } • { item.time_ago || 'recent' }
			</span>
		</div>
		<ActionLink
			target={ item?.next_step?.target }
			label={ item?.next_step?.label || 'Open' }
			className="av-inline-link"
		/>
	</div>
);

const EmptyAction = ( { title, description, actionLabel, actionTarget } ) => (
	<div className="av-empty-action">
		<strong>{ title }</strong>
		<span>{ description }</span>
		<ActionLink
			target={ actionTarget }
			label={ actionLabel }
			className="av-inline-link"
		/>
	</div>
);

const ActionLink = ( { target, label, className } ) => {
	if ( ! target ) {
		return null;
	}

	if ( isExternal( target ) ) {
		return (
			<a
				href={ target }
				target="_blank"
				rel="noreferrer"
				className={ className }
			>
				{ label } <Icon icon={ external } size={ 12 } />
			</a>
		);
	}

	return (
		<Link to={ target } className={ className }>
			{ label } <Icon icon={ arrowRight } size={ 12 } />
		</Link>
	);
};

const isExternal = ( target ) => target && /^https?:\/\//.test( target );

const isOverviewV2Payload = ( payload ) =>
	!! payload &&
	typeof payload === 'object' &&
	!! payload.state &&
	!! payload.kpis &&
	Array.isArray( payload.risk_queue ) &&
	Array.isArray( payload.switchboard );

const getSwitchState = ( switchboard ) =>
	switchboard.reduce(
		( acc, item ) => ( {
			...acc,
			[ item.id ]: !! item.enabled,
		} ),
		{}
	);

const getLicenseLabel = ( license = {} ) => {
	if ( license?.tier === 'pro' ) {
		return 'PRO';
	}
	if ( license?.tier === 'trial' ) {
		return `Trial (${ license?.trial_days_remaining || 0 }d left)`;
	}
	return 'Locked';
};

const buildInventoryRows = ( placements ) => {
	const labels = {
		header: 'Header',
		before_content: 'Before Content',
		after_content: 'After Content',
		after_paragraph: 'After Paragraph',
		shortcode: 'Manual Supply',
		footer: 'Footer',
	};

	const stats = {};
	Object.keys( labels ).forEach( ( type ) => {
		stats[ type ] = {
			type,
			label: labels[ type ],
			total: 0,
			assigned: 0,
			disabled: 0,
			coverage: 0,
		};
	} );

	placements.forEach( ( placement ) => {
		const type = stats[ placement.type ]
			? placement.type
			: 'before_content';
		stats[ type ].total += 1;
		if ( placement.item_id ) {
			stats[ type ].assigned += 1;
		}
		if (
			String( placement.status ) === 'disabled' ||
			Number( placement.status ) === 0 ||
			placement.disabled
		) {
			stats[ type ].disabled += 1;
		}
	} );

	return Object.values( stats ).map( ( row ) => ( {
		...row,
		coverage:
			row.total > 0
				? Math.round( ( row.assigned / row.total ) * 1000 ) / 10
				: 0,
	} ) );
};

const buildFallbackOverviewV2 = (
	ads,
	groups,
	placements,
	settings = {},
	activeModules = []
) => {
	const inventoryRows = buildInventoryRows( placements );
	const totalAssigned = placements.filter(
		( placement ) => placement.item_id
	).length;
	const totalPlacements = placements.length;
	const draftAds = ads.filter( ( ad ) => ad.status === 'draft' ).length;
	const unassigned = Math.max( 0, totalPlacements - totalAssigned );

	return {
		state: {
			last_sync: { label: 'No sync data yet' },
			tracking_pipeline: {
				status: 'pending',
				message: 'Waiting for first tracking batch',
			},
			license: { tier: 'trial', trial_days_remaining: 7, locked: false },
			api_degradation: {
				status: 'healthy',
				message: 'Compatibility mode',
			},
		},
		kpis: {
			ad_requests: { label: 'Ad Requests', value: 0, display: '0' },
			coverage: {
				label: 'Coverage',
				value:
					totalPlacements > 0
						? Math.round(
								( totalAssigned / totalPlacements ) * 1000
						  ) / 10
						: 0,
				display:
					totalPlacements > 0
						? `${
								Math.round(
									( totalAssigned / totalPlacements ) * 1000
								) / 10
						  }%`
						: '0%',
			},
			impressions: { label: 'Impressions', value: 0, display: '0' },
			ctr: { label: 'CTR', value: 0, display: '0.00%' },
			impression_rpm: {
				label: 'Impression RPM',
				value: null,
				display: 'Not connected',
				connected: false,
				cta: '/settings',
			},
			avg_viewable_time: {
				label: 'Avg Viewable Time',
				value: 0,
				display: '0.00s',
			},
		},
		risk_queue: [
			...( unassigned > 0
				? [
						{
							id: 'unfilled_inventory',
							title: 'Unfilled Inventory',
							description: `${ unassigned } placements are still unassigned.`,
							severity: 'medium',
							impact_score: unassigned * 10,
							action_label: 'Assign Placements',
							action_target: '/placements',
						},
				  ]
				: [] ),
			...( draftAds > 0
				? [
						{
							id: 'draft_ads',
							title: 'Draft Ads Pending',
							description: `${ draftAds } drafts are ready to review.`,
							severity: 'low',
							impact_score: 20,
							action_label: 'Review Ads',
							action_target: '/ads',
						},
				  ]
				: [] ),
		],
		inventory_health: {
			summary: {
				total: totalPlacements,
				assigned: totalAssigned,
				coverage:
					totalPlacements > 0
						? Math.round(
								( totalAssigned / totalPlacements ) * 1000
						  ) / 10
						: 0,
			},
			rows: inventoryRows,
		},
		switchboard: [
			{
				id: 'ad_system',
				label: 'Ad System',
				description: 'Master on/off for ad rendering.',
				enabled: ! settings?.disable_all_ads,
				editable: true,
				action_type: 'setting',
				action_key: 'disable_all_ads',
				action_target: '/settings',
			},
			{
				id: 'bot_protection',
				label: 'Bot Protection',
				description: 'Blocks bot and crawler traffic.',
				enabled: activeModules.includes( 'bot_protection' ),
				editable: true,
				action_type: 'module',
				action_key: 'bot_protection',
				action_target: '/settings',
			},
			{
				id: 'ip_blocker',
				label: 'IP Blocker',
				description:
					Array.isArray( settings?.blocked_ips ) &&
					settings.blocked_ips.length > 0
						? `${ settings.blocked_ips.length } blocked IPs configured.`
						: 'Enable module and add blocked IPs.',
				enabled: activeModules.includes( 'ip_blocker' ),
				editable: true,
				action_type: 'module',
				action_key: 'ip_blocker',
				action_target: '/settings/ip_blocker',
			},
			{
				id: 'ad_groups',
				label: 'Ad Groups & Rotation',
				description: 'Rotates ads in shared placements.',
				enabled: activeModules.includes( 'ad_groups' ),
				editable: true,
				action_type: 'module',
				action_key: 'ad_groups',
				action_target: '/settings',
			},
			{
				id: 'tracking',
				label: 'Tracking (Impressions + Clicks)',
				description:
					'Turns impression/click tracking on or off globally.',
				enabled: settings?.analytics_enabled !== false,
				editable: true,
				action_type: 'setting',
				action_key: 'analytics_enabled',
				action_target: '/settings/analytics',
			},
		],
		optimization_queue: groups.length
			? []
			: [
					{
						id: 'enable_groups',
						title: 'Enable Rotation Structure',
						description:
							'Set up Ad Groups for inventory rotation and pacing.',
						upside_score: 40,
						action_label: 'Open Groups',
						action_target: '/groups',
					},
			  ],
		activity_feed: [
			{
				id: 1,
				actor: 'System',
				summary: 'No team activity logged yet.',
				time_ago: 'now',
				next_step: { label: 'Create Ad', target: '/ads/new' },
			},
		],
		advanced_optimization: {
			status: 'locked',
			description:
				'Advanced forecasting and optimization automation available with PRO.',
			cta: { label: 'Upgrade to PRO', target: 'https://advajra.com/pricing' },
		},
	};
};

const convertLegacyToV2 = ( payload, placements, settings, activeModules ) => {
	const pulse = payload?.pulse || {};
	const meta = payload?.meta || {};
	const health = payload?.health || [];
	const priorities = payload?.priorities || [];
	const opportunities = payload?.opportunities || [];

	const mappedRisk = priorities.slice( 0, 5 ).map( ( item ) => ( {
		id: item.id,
		title: item.title,
		description: String( item.value ?? item.description ?? '' ),
		severity: item.severity || item.status || 'medium',
		impact_score: 40,
		action_label: item.action_label || 'Open',
		action_target: item.action_target || '/settings',
	} ) );

	const mappedOptimization = opportunities.slice( 0, 5 ).map( ( item ) => ( {
		id: item.id,
		title: item.title,
		description: String( item.value ?? '' ),
		upside_score: 35,
		action_label: item.action_label || 'Open',
		action_target: item.action_target || '/settings',
	} ) );

	return {
		...buildFallbackOverviewV2(
			[],
			[],
			placements,
			settings,
			activeModules
		),
		state: {
			last_sync: { label: 'Legacy overview mode' },
			tracking_pipeline: {
				status: 'pending',
				message: 'Legacy overview payload detected',
				help: 'Tracking events are collected first, then synced on interval.',
			},
			license: {
				tier: payload?.locked ? 'free_locked' : 'trial',
				locked: !! payload?.locked,
				help: 'Plan status controls analytics and advanced features.',
			},
			api_degradation: {
				status: 'degraded',
				message: 'Compatibility mode enabled',
				help: 'Dashboard is using fallback payload mapping.',
			},
		},
		kpis: {
			ad_requests: { label: 'Ad Requests', value: 0, display: '0' },
			coverage: {
				label: 'Coverage',
				value:
					meta.totalPlacements > 0
						? ( ( meta.assignedPlacements || 0 ) /
								meta.totalPlacements ) *
						  100
						: 0,
				display:
					meta.totalPlacements > 0
						? `${ (
								( ( meta.assignedPlacements || 0 ) /
									meta.totalPlacements ) *
								100
						  ).toFixed( 1 ) }%`
						: '0%',
			},
			impressions: {
				label: 'Impressions',
				value: Number( pulse.impressions || 0 ),
				display: String( pulse.impressions || 0 ),
			},
			ctr: {
				label: 'CTR',
				value: Number( pulse.ctr || 0 ),
				display: `${ Number( pulse.ctr || 0 ).toFixed( 2 ) }%`,
			},
			impression_rpm: {
				label: 'Impression RPM',
				value: null,
				display: 'Not connected',
				connected: false,
				cta: '/settings',
			},
			avg_viewable_time: {
				label: 'Avg Viewable Time',
				value: 0,
				display: '0.00s',
			},
		},
		risk_queue: mappedRisk,
		optimization_queue: mappedOptimization,
		activity_feed: health.slice( 0, 3 ).map( ( item, index ) => ( {
			id: `legacy-${ index }`,
			actor: 'System',
			summary: `${ item.title }: ${ item.value }`,
			time_ago: 'recent',
			next_step: {
				label: item.action_label || 'Open',
				target: item.action_target || '/settings',
			},
		} ) ),
	};
};

export default Dashboard;
