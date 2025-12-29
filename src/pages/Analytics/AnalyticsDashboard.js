import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Icon, Spinner } from '@wordpress/components';
import AdvTooltip from '../../components/Tooltip';
import { arrowRight, external, lock } from '@wordpress/icons';
import apiFetch from '@wordpress/api-fetch';
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { AdvajraAnalyticsIcon } from '../../components/AdvajraIcons';
import SmartSelect from '../../components/SmartSelect';

const TAB_TO_DIMENSION = {
	by_ad: 'ad',
	by_placement: 'placement',
	top_movers: '',
};

const TAB_LABELS = {
	by_ad: 'By Ad',
	by_placement: 'By Placement',
	top_movers: 'Top Movers',
};

const METRIC_META = {
	impressions: {
		label: 'Impressions',
		valueKey: 'impressions',
		line: '#2563eb',
		prev: '#93c5fd',
		yAxisId: 'left',
	},
	clicks: {
		label: 'Clicks',
		valueKey: 'clicks',
		line: '#059669',
		prev: '#6ee7b7',
		yAxisId: 'right',
	},
	ctr: {
		label: 'CTR',
		valueKey: 'ctr',
		line: '#7c3aed',
		prev: '#c4b5fd',
	},
};

const SparklineSVG = ( { data: raw, color, id } ) => {
	const width = 96;
	const height = 48;
	const padding = 4;

	if ( ! raw || raw.length < 2 || raw.every( ( value ) => value === 0 ) ) {
		return (
			<svg
				width="100%"
				height={ height }
				viewBox={ `0 0 ${ width } ${ height }` }
				preserveAspectRatio="none"
				className="av-sparkline-svg"
			>
				<line
					x1={ padding }
					y1={ height - padding }
					x2={ width - padding }
					y2={ height - padding }
					stroke={ color }
					strokeWidth="1.5"
					strokeOpacity="0.22"
				/>
			</svg>
		);
	}

	const max = Math.max( ...raw );
	const min = Math.min( ...raw );
	const range = max - min || max || 1;
	const points = raw.map( ( value, index ) => ( {
		x: ( index / ( raw.length - 1 ) ) * ( width - padding * 2 ) + padding,
		y:
			height -
			padding -
			( ( value - min ) / range ) * ( height - padding * 2 ),
	} ) );

	const line = points.reduce( ( command, point, index ) => {
		if ( index === 0 ) {
			return `M ${ point.x.toFixed( 1 ) },${ point.y.toFixed( 1 ) }`;
		}

		const previous = points[ index - 1 ];
		const controlX = ( ( previous.x + point.x ) / 2 ).toFixed( 1 );
		return `${ command } C ${ controlX },${ previous.y.toFixed(
			1
		) } ${ controlX },${ point.y.toFixed( 1 ) } ${ point.x.toFixed(
			1
		) },${ point.y.toFixed( 1 ) }`;
	}, '' );

	const lastPoint = points[ points.length - 1 ];
	const area = `${ line } L ${ lastPoint.x.toFixed(
		1
	) },${ height } L ${ points[ 0 ].x.toFixed( 1 ) },${ height } Z`;
	const gradientId = `av-sparkline-${ id }`;

	return (
		<svg
			width="100%"
			height={ height }
			viewBox={ `0 0 ${ width } ${ height }` }
			preserveAspectRatio="none"
			className="av-sparkline-svg"
		>
			<defs>
				<linearGradient id={ gradientId } x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={ color } stopOpacity="0.32" />
					<stop offset="100%" stopColor={ color } stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={ area } fill={ `url(#${ gradientId })` } />
			<path
				d={ line }
				fill="none"
				stroke={ color }
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle
				cx={ lastPoint.x.toFixed( 1 ) }
				cy={ lastPoint.y.toFixed( 1 ) }
				r="3"
				fill="#fff"
				stroke={ color }
				strokeWidth="2"
			/>
		</svg>
	);
};

const formatCompactNumber = ( value ) =>
	new Intl.NumberFormat( undefined, {
		notation: 'compact',
		maximumFractionDigits: value >= 1000 ? 1 : 0,
	} ).format( Number( value || 0 ) );

const formatFullNumber = ( value ) =>
	Number( value || 0 ).toLocaleString( undefined, {
		maximumFractionDigits: 0,
	} );

const formatPercent = ( value, digits = 2 ) =>
	`${ Number( value || 0 ).toFixed( digits ) }%`;

const formatDate = ( dateString, options ) => {
	if ( ! dateString ) {
		return '';
	}

	const parsed = new Date( `${ dateString }T00:00:00` );
	if ( Number.isNaN( parsed.getTime() ) ) {
		return dateString;
	}

	return parsed.toLocaleDateString( undefined, options );
};

const formatDateRange = ( start, end ) => {
	if ( ! start || ! end ) {
		return '';
	}

	return `${ formatDate( start, {
		month: 'short',
		day: 'numeric',
	} ) } – ${ formatDate( end, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	} ) }`;
};

const formatFreshness = ( timestamp, now ) => {
	if ( ! timestamp ) {
		return 'Not updated yet';
	}

	const seconds = Math.max( 0, Math.round( ( now - timestamp ) / 1000 ) );
	if ( seconds < 15 ) {
		return 'Updated just now';
	}
	if ( seconds < 60 ) {
		return `Updated ${ seconds }s ago`;
	}

	const minutes = Math.round( seconds / 60 );
	if ( minutes < 60 ) {
		return `Updated ${ minutes }m ago`;
	}

	const hours = Math.round( minutes / 60 );
	return `Updated ${ hours }h ago`;
};

const formatDeltaCopy = (
	value,
	unit = 'percent',
	unavailableText = 'No prior range'
) => {
	if ( value === null || value === undefined ) {
		return {
			text: unavailableText,
			direction: 'flat',
		};
	}

	let direction = 'flat';
	if ( value > 0 ) {
		direction = 'up';
	} else if ( value < 0 ) {
		direction = 'down';
	}
	const prefix = value > 0 ? '+' : '';

	if ( unit === 'points' ) {
		return {
			text: `${ prefix }${ Number( value ).toFixed( 2 ) } pts vs prev`,
			direction,
		};
	}

	return {
		text: `${ prefix }${ Math.abs( Number( value ) ).toFixed(
			1
		) }% vs prev`,
		direction,
	};
};

const getDirectionClass = ( direction, neutralClass = 'is-neutral' ) => {
	if ( direction === 'down' ) {
		return 'is-down';
	}

	if ( direction === 'up' ) {
		return 'is-up';
	}

	return neutralClass;
};

const formatStatusLabel = ( status ) => {
	if ( ! status ) {
		return '';
	}

	return status
		.replace( /_/g, ' ' )
		.replace( /\b\w/g, ( letter ) => letter.toUpperCase() );
};

const getPresetLabel = ( presets = [], presetKey, fallback = 'Last 7 Days' ) =>
	presets.find( ( option ) => option.key === presetKey )?.label || fallback;

const ChartTooltip = ( { active, payload, label } ) => {
	if ( ! active || ! payload?.length ) {
		return null;
	}

	const visibleEntries = payload.filter(
		( entry ) => entry.value !== null && entry.value !== undefined
	);
	const currentEntries = visibleEntries.filter(
		( entry ) => ! String( entry.dataKey ).startsWith( 'prev_' )
	);
	const previousEntries = visibleEntries.filter( ( entry ) =>
		String( entry.dataKey ).startsWith( 'prev_' )
	);

	return (
		<div className="av-chart-tooltip">
			<p className="av-chart-tooltip__label">{ label }</p>

			{ currentEntries.length > 0 && (
				<div className="av-chart-tooltip__group">
					<span className="av-chart-tooltip__group-label">
						Current
					</span>
					{ currentEntries.map( ( entry ) => (
						<div
							key={ entry.dataKey }
							className="av-chart-tooltip__row"
						>
							<span
								className="av-chart-tooltip__dot"
								style={ { background: entry.stroke } }
							/>
							<span className="av-chart-tooltip__name">
								{ entry.name }
							</span>
							<strong className="av-chart-tooltip__val">
								{ formatFullNumber( entry.value ) }
							</strong>
						</div>
					) ) }
				</div>
			) }

			{ previousEntries.length > 0 && (
				<div className="av-chart-tooltip__group">
					<span className="av-chart-tooltip__group-label">
						Previous
					</span>
					{ previousEntries.map( ( entry ) => (
						<div
							key={ entry.dataKey }
							className="av-chart-tooltip__row"
						>
							<span
								className="av-chart-tooltip__dot av-chart-tooltip__dot--dashed"
								style={ { borderColor: entry.stroke } }
							/>
							<span className="av-chart-tooltip__name">
								{ entry.name }
							</span>
							<strong className="av-chart-tooltip__val">
								{ formatFullNumber( entry.value ) }
							</strong>
						</div>
					) ) }
				</div>
			) }
		</div>
	);
};

const LegendToggle = ( { label, color, active, onClick } ) => (
	<button
		type="button"
		className={ `av-legend-toggle ${ active ? 'is-active' : '' }` }
		onClick={ onClick }
		aria-pressed={ active }
	>
		<span
			className="av-legend-toggle__swatch"
			style={ { '--av-legend-color': color } }
		/>
		<span className="av-legend-toggle__label">{ label }</span>
		<span className="av-legend-toggle__hint">Current + previous</span>
	</button>
);

const EmptyState = ( { title, description } ) => (
	<div className="av-empty-state">
		<strong>{ title }</strong>
		<p>{ description }</p>
	</div>
);

const BreakdownTable = ( {
	title,
	subtitle,
	notice,
	rows,
	columns,
	emptyTitle,
	emptyDescription,
} ) => (
	<Card className="av-analytics-panel">
		<CardBody>
			<div className="av-panel-head">
				<div>
					<h3>{ title }</h3>
					{ subtitle && <p>{ subtitle }</p> }
				</div>
			</div>

			{ notice && (
				<div className="av-table-notice">
					<span className="av-table-notice__text">{ notice.text }</span>
					<AdvTooltip content={ notice.tooltip } position="top" icon="ⓘ" />
				</div>
			) }

			{ rows.length === 0 ? (
				<EmptyState
					title={ emptyTitle }
					description={ emptyDescription }
				/>
			) : (
				<div className="av-breakdown-table-wrap">
					<table className="av-breakdown-table">
						<thead>
							<tr>
								{ columns.map( ( column ) => (
									<th
										key={ column.key }
										className={
											column.align === 'right'
												? 'is-right'
												: ''
										}
									>
										{ column.label }
									</th>
								) ) }
							</tr>
						</thead>
						<tbody>
							{ rows.map( ( row, index ) => (
								<tr
									key={
										row.id ||
										row.ad_id ||
										row.placement_id ||
										`${ title }-${ index }`
									}
								>
									{ columns.map( ( column ) => (
										<td
											key={ `${ column.key }-${ index }` }
											className={
												column.align === 'right'
													? 'is-right'
													: ''
											}
										>
											{ column.render
												? column.render( row, index )
												: row[ column.key ] }
										</td>
									) ) }
								</tr>
							) ) }
						</tbody>
					</table>
				</div>
			) }
		</CardBody>
	</Card>
);

const MoversTable = ( {
	title,
	subtitle,
	rows,
	emptyTitle,
	emptyDescription,
	onAction,
} ) => (
	<Card className="av-analytics-panel">
		<CardBody>
			<div className="av-panel-head">
				<div>

					<h3>{ title }</h3>
					{ subtitle && <p>{ subtitle }</p> }
				</div>
			</div>

			{ rows.length === 0 ? (
				<EmptyState
					title={ emptyTitle }
					description={ emptyDescription }
				/>
			) : (
				<div className="av-breakdown-table-wrap">
					<table className="av-breakdown-table">
						<thead>
							<tr>
								<th>#</th>
								<th>Entity</th>
								<th className="is-right">Metric</th>
								<th className="is-right">Previous</th>
								<th className="is-right">Current</th>
								<th className="is-right">Delta</th>
								<th className="is-right">Change</th>
								<th className="is-right">Action</th>
							</tr>
						</thead>
						<tbody>
							{ rows.map( ( row, index ) => (
								<tr key={ row.id || `${ title }-${ index }` }>
									<td>{ index + 1 }</td>
									<td>
										<div className="av-entity-cell">
											<strong>{ row.title }</strong>
											<div className="av-entity-meta">
												{ row.status && (
													<span
														className={ `av-status-badge is-${ row.status }` }
													>
														{ formatStatusLabel(
															row.status
														) }
													</span>
												) }
												<span className="av-entity-note">
													CTR Δ{ ' ' }
													{ row.ctr_delta_points > 0
														? '+'
														: '' }
													{ Number(
														row.ctr_delta_points ||
															0
													).toFixed( 2 ) }{ ' ' }
													pts
												</span>
											</div>
										</div>
									</td>
									<td className="is-right">
										{ row.metric_label || 'Impressions' }
									</td>
									<td className="is-right">
										{ formatFullNumber( row.previous ) }
									</td>
									<td className="is-right">
										{ formatFullNumber( row.current ) }
									</td>
									<td className="is-right">
										<span
											className={ `av-delta-badge ${ getDirectionClass(
												row.direction,
												'is-flat'
											) }` }
										>
											{ row.delta > 0 ? '+' : '' }
											{ formatCompactNumber( row.delta ) }
										</span>
									</td>
									<td className="is-right">
										{ row.change === null
											? 'New'
											: `${
													row.change > 0 ? '+' : ''
											  }${ Number( row.change ).toFixed(
													1
											  ) }%` }
									</td>
									<td className="is-right">
										<button
											type="button"
											className="av-row-action"
											onClick={ () => onAction( row ) }
										>
											Open
											<Icon
												icon={ arrowRight }
												size={ 16 }
											/>
										</button>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</div>
			) }
		</CardBody>
	</Card>
);

const AnalyticsDashboard = () => {
	const navigate = useNavigate();
	const hasLoadedDataRef = useRef( false );
	const [ data, setData ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ isRefreshing, setIsRefreshing ] = useState( false );
	const [ fetchError, setFetchError ] = useState( false );
	const [ lastUpdatedAt, setLastUpdatedAt ] = useState( null );
	const [ preset, setPreset ] = useState( 'last_7_days' );
	const [ activeTab, setActiveTab ] = useState( 'by_ad' );
	const [ metrics, setMetrics ] = useState( {
		impressions: true,
		clicks: true,
	} );
	const [ nowTick, setNowTick ] = useState( Date.now() );

	useDocumentTitle( 'Analytics' );

	useEffect( () => {
		const timer = window.setInterval(
			() => setNowTick( Date.now() ),
			30000
		);
		return () => window.clearInterval( timer );
	}, [] );

	useEffect( () => {
		let isCurrent = true;
		const hasExistingData = hasLoadedDataRef.current;

		if ( hasExistingData ) {
			setIsRefreshing( true );
		} else {
			setIsLoading( true );
		}

		setFetchError( false );

		const query = new URLSearchParams( {
			preset,
			dimension: TAB_TO_DIMENSION[ activeTab ] || '',
		} );

		apiFetch( { path: `/advajra/v1/analytics?${ query.toString() }` } )
			.then( ( response ) => {
				if ( ! isCurrent ) {
					return;
				}

				setData( response );
				hasLoadedDataRef.current = true;
				setFetchError( false );
				setLastUpdatedAt( Date.now() );
			} )
			.catch( ( err ) => {
				if ( ! isCurrent ) {
					return;
				}

				console.error('Analytics Fetch Error:', err);

				if ( ! hasExistingData ) {
					setData( null );
				}
				setFetchError( true );
			} )
			.finally( () => {
				if ( ! isCurrent ) {
					return;
				}

				setIsLoading( false );
				setIsRefreshing( false );
			} );

		return () => {
			isCurrent = false;
		};
	}, [ activeTab, preset ] );

	const isPro = !! data?.retention?.is_pro;
	const analyticsLocked = !! data?.locked;
	const trial = data?.trial || {};
	const daysRemaining = trial.days_remaining ?? 7;
	const trialExpired = !! trial.expired;
	const upgradeUrl = data?.upgrade_url || 'https://advajra.com/pricing';
	const availablePresets = useMemo( () => {
		const apiPresets = ( data?.presets || [] ).map( ( option ) => ( {
			label: option.label,
			value: option.key,
		} ) );

		if ( ! isPro ) {
			const proKeys = [
				'today',
				'yesterday',
				'this_week',
				'this_month',
				'last_week',
				'last_30_days',
				'last_month',
				'all_time',
			];
			const proLabels = {
				today: 'Today',
				yesterday: 'Yesterday',
				this_week: 'This Week',
				this_month: 'This Month',
				last_week: 'Last Week',
				last_30_days: 'Last 30 Days',
				last_month: 'Last Month',
				all_time: 'All Time',
			};

			const existingKeys = new Set( apiPresets.map( ( p ) => p.value ) );

			proKeys.forEach( ( key ) => {
				if ( ! existingKeys.has( key ) ) {
					apiPresets.push( {
						label: proLabels[ key ],
						value: key,
						disabled: true,
						isPro: true,
					} );
				}
			} );
		}

		return apiPresets;
	}, [ data?.presets, isPro ] );
	const selectedPreset = data?.selected_preset || preset;
	const rangeLabel = getPresetLabel( data?.presets, selectedPreset );
	const comparisonEnabled = !! data?.comparison_enabled;

	const prevTimeline = useMemo(
		() =>
			comparisonEnabled ? data?.comparison?.previous_timeline || [] : [],
		[ comparisonEnabled, data?.comparison?.previous_timeline ]
	);

	const hasPrevData = !! (
		comparisonEnabled &&
		data?.comparison?.previous &&
		( Number( data.comparison.previous.impressions ) > 0 ||
			Number( data.comparison.previous.clicks ) > 0 )
	);

	const prevLabel = data?.comparison?.previous
		? formatDateRange(
				data.comparison.previous.start,
				data.comparison.previous.end
		  )
		: '';

	let comparisonLabel = `${ rangeLabel } · Comparison unavailable`;
	if ( comparisonEnabled ) {
		if ( hasPrevData && prevLabel ) {
			comparisonLabel = `${ rangeLabel } vs ${ prevLabel }`;
		} else if ( prevLabel ) {
			comparisonLabel = `${ rangeLabel } · No prior data yet`;
		} else {
			comparisonLabel = `${ rangeLabel } · Awaiting prior period`;
		}
	}

	const freshnessLabel = formatFreshness( lastUpdatedAt, nowTick );
	let accessBadgeLabel = 'Trial';
	if ( isPro ) {
		accessBadgeLabel = 'PRO';
	} else if ( trialExpired ) {
		accessBadgeLabel = 'Trial Ended';
	}



	const summaryCards = useMemo( () => {
		if ( ! data?.summary ) {
			return [];
		}

		const timeline = data.timeline || [];
		const previousSummary = data?.comparison?.previous || {};
		const ctrUnit = data?.summary?.growth?.ctr_unit || 'points';
		const unavailableText = comparisonEnabled
			? 'No prior data yet'
			: 'Comparison unavailable';

		return [
			{
				id: 'impressions',
				label: 'Impressions',
				value: formatFullNumber( data.summary.impressions || 0 ),
				change: formatDeltaCopy(
					data.summary.growth?.impressions ?? null,
					'percent',
					unavailableText
				),
				previousValue: hasPrevData
					? formatFullNumber( previousSummary.impressions || 0 )
					: null,
				previousLabel: prevLabel,
				sparkline: timeline.map( ( point ) => point.impressions ),
				color: METRIC_META.impressions.line,
			},
			{
				id: 'clicks',
				label: 'Clicks',
				value: formatFullNumber( data.summary.clicks || 0 ),
				change: formatDeltaCopy(
					data.summary.growth?.clicks ?? null,
					'percent',
					unavailableText
				),
				previousValue: hasPrevData
					? formatFullNumber( previousSummary.clicks || 0 )
					: null,
				previousLabel: prevLabel,
				sparkline: timeline.map( ( point ) => point.clicks ),
				color: METRIC_META.clicks.line,
			},
			{
				id: 'ctr',
				label: 'CTR',
				value: formatPercent( data.summary.ctr || 0 ),
				change: formatDeltaCopy(
					data.summary.growth?.ctr ?? null,
					ctrUnit,
					unavailableText
				),
				previousValue: hasPrevData
					? formatPercent( previousSummary.ctr || 0 )
					: null,
				previousLabel: prevLabel,
				sparkline: timeline.map( ( point ) =>
					point.impressions > 0
						? Number(
								(
									( point.clicks / point.impressions ) *
									100
								).toFixed( 2 )
						  )
						: 0
				),
				color: METRIC_META.ctr.line,
			},
		];
	}, [ comparisonEnabled, data, hasPrevData, prevLabel ] );

	const chartData = useMemo(
		() =>
			( data?.timeline || [] ).map( ( point, index ) => ( {
				date: point.date,
				dateLabel: formatDate( point.date, {
					month: 'short',
					day: 'numeric',
				} ),
				impressions: point.impressions,
				clicks: point.clicks,
				prev_impressions: prevTimeline[ index ]?.impressions ?? null,
				prev_clicks: prevTimeline[ index ]?.clicks ?? null,
			} ) ),
		[ data?.timeline, prevTimeline ]
	);



	const handleMetricToggle = ( metricKey ) => {
		setMetrics( ( current ) => ( {
			...current,
			[ metricKey ]: ! current[ metricKey ],
		} ) );
	};

	const openActionTarget = ( row ) => {
		if ( row.entity_type === 'placement' || row.placement_id ) {
			navigate( `/placements/${ row.entity_id || row.placement_id }` );
			return;
		}

		navigate( `/ads/${ row.entity_id || row.ad_id }` );
	};

	const moversUnavailable = ! comparisonEnabled;
	const moversWaitingForData = comparisonEnabled && ! hasPrevData;

	if ( isLoading && ! data ) {
		return (
			<div className="advajra-analytics advajra-analytics--loading">
				<Spinner />
			</div>
		);
	}

	if ( ! data ) {
		return (
			<div className="advajra-analytics">
				<Card className="av-analytics-panel av-analytics-panel--empty">
					<CardBody>
						<h2>Analytics unavailable right now</h2>
						<p>
							We couldn&apos;t load analytics data. Please reload
							and try again.
						</p>
					</CardBody>
				</Card>
			</div>
		);
	}

	if ( analyticsLocked ) {
		return (
			<div className="advajra-analytics av-analytics-locked-layout">
				<div className="av-analytics-shell av-analytics-shell--locked">
					<div className="av-analytics-commandbar av-analytics-commandbar--locked">
						<div className="av-analytics-commandbar__main">

							<h1>Analytics</h1>
							<p>
								Track delivery trends, compare ranges, and
								inspect which ads or placements are moving.
							</p>
						</div>
						<div className="av-analytics-commandbar__actions">
							<div className="av-skeleton-input" />
						</div>
					</div>

					<div className="av-summary-grid av-summary-grid--skeleton">
						{ [ 1, 2, 3 ].map( ( item ) => (
							<div
								key={ item }
								className="av-summary-card av-skeleton-card"
							>
								<div className="av-skeleton-line av-skeleton-line--sm" />
								<div className="av-skeleton-line av-skeleton-line--lg" />
								<div className="av-skeleton-line av-skeleton-line--md" />
							</div>
						) ) }
					</div>

					<Card className="av-analytics-panel">
						<CardBody>
							<div className="av-panel-head">
								<div>

									<h3>Performance over time</h3>
									<p>
										Current range overlaid with the previous
										period.
									</p>
								</div>
							</div>
							<div className="av-chart-skeleton" />
						</CardBody>
					</Card>
				</div>

				<div className="av-analytics-lock-overlay-full">
					<Card className="av-analytics-lock-modal av-analytics-lock-modal--conversion">
						<CardBody>
							<div className="av-lock-icon-tile">
								<AdvajraAnalyticsIcon size={ 28 } />
							</div>
							<h2>Analytics reporting is paused</h2>
							<p>
								Your { trial.total_days || 7 }-day trial ended
								{ trial.ends_at
									? ` on ${ formatDate(
											trial.ends_at.split( ' ' )[ 0 ],
											{
												month: 'short',
												day: 'numeric',
												year: 'numeric',
											}
									  ) }.`
									: '.' }{ ' ' }
								Upgrade to restore comparison dashboards, mover
								analysis, and historical trends.
							</p>
							<div className="av-lock-benefits-grid">
								<div className="av-lock-benefit-card">
									<strong>Historical comparisons</strong>
									<span>
										See current range vs previous periods.
									</span>
								</div>
								<div className="av-lock-benefit-card">
									<strong>Ad + placement movers</strong>
									<span>
										Spot which entities gained or lost
										momentum.
									</span>
								</div>
								<div className="av-lock-benefit-card">
									<strong>PRO-only presets</strong>
									<span>
										Unlock today, weekly, monthly, 30-day,
										and all-time views.
									</span>
								</div>
							</div>
							<div className="av-lock-actions">
								<button
									type="button"
									className="av-upgrade-btn"
									onClick={ () =>
										window.open( upgradeUrl, '_blank' )
									}
								>
									Upgrade to PRO
								</button>
							</div>
						</CardBody>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="advajra-analytics">
			<div className="av-analytics-shell">
				<header className="av-analytics-commandbar">
					<div className="av-analytics-commandbar__main">

						<div className="av-commandbar-title-row">
							<h1>Analytics</h1>
							<div className="av-range-pill">
								<SmartSelect
									value={ preset }
									options={ availablePresets }
									onChange={ setPreset }
									onDisabledClick={ () => window.open( upgradeUrl, '_blank' ) }
									label=""
									className="av-analytics-range-select"
									popoverClass="min-w-[240px]"
									ariaLabel="Analytics date range"
								/>
							</div>
						</div>
						<p>
							Track delivery performance, compare ranges, and see
							which ads or placements are moving.
						</p>
						<div className="av-command-meta">
							<span className="av-chip av-chip--comparison">
								{ comparisonLabel }
							</span>
							<span className="av-chip">{ freshnessLabel }</span>
							{ isRefreshing && (
								<span className="av-chip av-chip--refreshing">
									<span className="av-inline-spinner" />
									Refreshing snapshot
								</span>
							) }
						</div>
					</div>

					<div className="av-analytics-commandbar__actions">						<div
							className={ `av-access-card ${
								isPro ? 'is-pro' : 'is-free'
							}` }
						>
							<div className="av-access-card__top">
								<span className="av-access-card__badge">
									{ accessBadgeLabel }
								</span>
								{ ! isPro && (
									<Icon icon={ lock } size={ 16 } />
								) }
							</div>
							<strong>
								{ isPro
									? 'PRO analytics unlocked'
									: '7-day analytics trial' }
							</strong>
							{ isPro && <p>Unlocked presets, comparisons, movers, and full retained history.</p> }

							{ ! isPro && (
								<button
									type="button"
									className="av-upgrade-btn"
									onClick={ () =>
										window.open( upgradeUrl, '_blank' )
									}
								>
									Upgrade to PRO
									<Icon icon={ external } size={ 14 } />
								</button>
							) }
						</div>
					</div>
				</header>

				{ fetchError && data && (
					<div className="av-inline-alert">
						We couldn&apos;t refresh analytics just now. Showing the
						last loaded snapshot.
					</div>
				) }

				<section className="av-analytics-section">
					<div className="av-section-head">
						<div>
							<h2>Delivery snapshot</h2>
							<p>
								{ comparisonEnabled
									? 'Current range totals with previous-period context.'
									: 'Current range totals for the selected preset.' }
							</p>
						</div>
					</div>

					<div className="av-summary-grid">
						{ summaryCards.map( ( card ) => {
							return (
								<div
									key={ card.id }
									className="av-summary-card"
								>
									<div className="av-summary-card__top">
										<span className="av-summary-card__label">
											{ card.label }
										</span>
										<span
											className={ `av-summary-card__delta ${ getDirectionClass(
												card.change?.direction
											) }` }
										>
											{ card.change?.text }
										</span>
									</div>
									<div className="av-summary-card__body">
										<div>
											<strong className="av-summary-card__value">
												{ card.value }
											</strong>
											{ comparisonEnabled &&
												card.previousValue && (
													<div className="av-summary-card__comparison">
														<span>Previous</span>
														<strong>
															{
																card.previousValue
															}
														</strong>
													</div>
												) }
										</div>
										<div className="av-summary-card__sparkline">
											<SparklineSVG
												data={ card.sparkline }
												color={ card.color }
												id={ card.id }
											/>
										</div>
									</div>
								</div>
							);
						} ) }
					</div>
				</section>

				<section className="av-analytics-section">
					<Card className="av-analytics-panel av-analytics-panel--chart">
						<CardBody>
							<div className="av-panel-head av-panel-head--chart">
								<div>
									<h3>Performance over time</h3>
									<p>
										{ comparisonEnabled &&
										prevTimeline.length > 0
											? `Solid = ${ rangeLabel } · Dashed = ${ prevLabel }`
											: 'Selected range performance over time.' }
									</p>
								</div>
								<div className="av-chart-legend">
									<LegendToggle
										label="Impressions"
										color={ METRIC_META.impressions.line }
										active={ metrics.impressions }
										onClick={ () =>
											handleMetricToggle( 'impressions' )
										}
									/>
									<LegendToggle
										label="Clicks"
										color={ METRIC_META.clicks.line }
										active={ metrics.clicks }
										onClick={ () =>
											handleMetricToggle( 'clicks' )
										}
									/>
								</div>
							</div>

							{ ! metrics.impressions && ! metrics.clicks ? (
								<EmptyState
									title="Choose at least one metric"
									description="Use the legend pills to plot impressions, clicks, or both."
								/>
							) : (
								<div className="av-chart-wrap">
									<ResponsiveContainer
										width="100%"
										height={ 320 }
									>
										<LineChart data={ chartData }>
											<CartesianGrid
												strokeDasharray="4 4"
												vertical={ false }
												stroke="#e2e8f0"
											/>
											<XAxis
												dataKey="dateLabel"
												tick={ { fontSize: 11 } }
												tickLine={ false }
												axisLine={ false }
											/>
											<YAxis
												yAxisId="left"
												tick={ { fontSize: 11 } }
												tickLine={ false }
												axisLine={ false }
												width={ 48 }
												tickFormatter={
													formatCompactNumber
												}
												allowDecimals={ false }
											/>
											<YAxis
												yAxisId="right"
												orientation="right"
												tick={ { fontSize: 11 } }
												tickLine={ false }
												axisLine={ false }
												width={ 48 }
												tickFormatter={
													formatCompactNumber
												}
												allowDecimals={ false }
											/>
											<Tooltip
												content={ <ChartTooltip /> }
											/>

											{ metrics.impressions && (
												<Line
													yAxisId="left"
													type="monotone"
													dataKey="impressions"
													name="Impressions"
													stroke={
														METRIC_META.impressions
															.line
													}
													strokeWidth={ 2.6 }
													dot={ false }
													activeDot={ {
														r: 4,
														fill: METRIC_META
															.impressions.line,
													} }
												/>
											) }

											{ metrics.impressions &&
												comparisonEnabled &&
												prevTimeline.length > 0 && (
													<Line
														yAxisId="left"
														type="monotone"
														dataKey="prev_impressions"
														name="Impressions"
														stroke={
															METRIC_META
																.impressions
																.prev
														}
														strokeWidth={ 1.9 }
														strokeDasharray="6 4"
														dot={ false }
														strokeOpacity={ 0.95 }
													/>
												) }

											{ metrics.clicks && (
												<Line
													yAxisId="right"
													type="monotone"
													dataKey="clicks"
													name="Clicks"
													stroke={
														METRIC_META.clicks.line
													}
													strokeWidth={ 2.6 }
													dot={ false }
													activeDot={ {
														r: 4,
														fill: METRIC_META.clicks
															.line,
													} }
												/>
											) }

											{ metrics.clicks &&
												comparisonEnabled &&
												prevTimeline.length > 0 && (
													<Line
														yAxisId="right"
														type="monotone"
														dataKey="prev_clicks"
														name="Clicks"
														stroke={
															METRIC_META.clicks
																.prev
														}
														strokeWidth={ 1.9 }
														strokeDasharray="6 4"
														dot={ false }
														strokeOpacity={ 0.95 }
													/>
												) }
										</LineChart>
									</ResponsiveContainer>
								</div>
							) }
						</CardBody>
					</Card>
				</section>

				<section className="av-analytics-section">
					<div className="av-breakdown-head">
						<div>
							<h2>Breakdown workspace</h2>
							<p>
								Use the segmented view to inspect entities and
								jump directly into the affected ad or placement.
							</p>
						</div>
						<div className="av-breakdown-tabs">
							{ Object.keys( TAB_LABELS ).map( ( tabKey ) => (
								<button
									key={ tabKey }
									type="button"
									className={
										activeTab === tabKey ? 'active' : ''
									}
									onClick={ () => setActiveTab( tabKey ) }
								>
									<span>{ TAB_LABELS[ tabKey ] }</span>
								</button>
							) ) }
						</div>
					</div>

					{ activeTab === 'by_ad' && (
						<BreakdownTable
							title="Ad performance"
							subtitle="Top ads in the selected range by delivery volume."
							rows={ data.breakdowns?.by_ad || [] }
							emptyTitle="No ad data in this range"
							emptyDescription="Tracking hasn’t recorded ad-level activity for the selected period yet."
							columns={ [
								{
									key: 'rank',
									label: '#',
									render: ( row, index ) => index + 1,
								},
								{
									key: 'title',
									label: 'Ad',
									render: ( row ) => (
										<div className="av-entity-cell">
											<strong>{ row.title }</strong>
										</div>
									),
								},
								{
									key: 'impressions',
									label: 'Impressions',
									align: 'right',
									render: ( row ) =>
										formatFullNumber( row.impressions ),
								},
								{
									key: 'clicks',
									label: 'Clicks',
									align: 'right',
									render: ( row ) =>
										formatFullNumber( row.clicks ),
								},
								{
									key: 'ctr',
									label: 'CTR',
									align: 'right',
									render: ( row ) => formatPercent( row.ctr ),
								},
								{
									key: 'action',
									label: 'Action',
									align: 'right',
									render: ( row ) => (
										<button
											type="button"
											className="av-row-action"
											onClick={ () =>
												openActionTarget( {
													entity_type: 'ad',
													entity_id: row.ad_id,
												} )
											}
										>
											Open
											<Icon
												icon={ arrowRight }
												size={ 16 }
											/>
										</button>
									),
								},
							] }
						/>
					) }

					{ activeTab === 'by_placement' && (
						<BreakdownTable
							title="Placement performance"
							subtitle="Delivery totals inferred from ads currently assigned to each slot."
							notice={ {
								text: 'Stats are attributed to placements based on their currently assigned ads.',
								tooltip: 'Placement-level data is estimated by summing the historical stats of whichever ads are assigned to each slot right now. If you re-assign ads after data was collected, these numbers will shift to reflect the new assignment.',
							} }
							rows={ data.breakdowns?.by_placement || [] }
							emptyTitle="No placement data in this range"
							emptyDescription="Placements will appear here once the selected range has tracked delivery."
							columns={ [
								{
									key: 'rank',
									label: '#',
									render: ( row, index ) => index + 1,
								},
								{
									key: 'name',
									label: 'Placement',
									render: ( row ) => (
										<div className="av-entity-cell">
											<strong>{ row.name }</strong>
											<div className="av-entity-meta">
												<span
													className={ `av-status-badge is-${ row.status }` }
												>
													{ formatStatusLabel(
														row.status
													) }
												</span>
											</div>
										</div>
									),
								},
								{
									key: 'impressions',
									label: 'Impressions',
									align: 'right',
									render: ( row ) =>
										formatFullNumber( row.impressions ),
								},
								{
									key: 'clicks',
									label: 'Clicks',
									align: 'right',
									render: ( row ) =>
										formatFullNumber( row.clicks ),
								},
								{
									key: 'ctr',
									label: 'CTR',
									align: 'right',
									render: ( row ) => formatPercent( row.ctr ),
								},
								{
									key: 'action',
									label: 'Action',
									align: 'right',
									render: ( row ) => (
										<button
											type="button"
											className="av-row-action"
											onClick={ () =>
												openActionTarget( {
													entity_type: 'placement',
													entity_id: row.placement_id,
												} )
											}
										>
											Open
											<Icon
												icon={ arrowRight }
												size={ 16 }
											/>
										</button>
									),
								},
							] }
						/>
					) }

					{ activeTab === 'top_movers' && (
						<div className="av-movers-layout">
							{ moversUnavailable && (
								<Card className="av-analytics-panel">
									<CardBody>
										<EmptyState
											title="Comparison is unavailable for this preset"
											description="Top movers are only available on presets that include a previous-period comparison."
										/>
									</CardBody>
								</Card>
							) }
							{ moversWaitingForData && (
								<Card className="av-analytics-panel">
									<CardBody>
										<EmptyState
											title="Previous-period comparison isn’t available yet"
											description="Top movers compare the selected range against the immediately preceding range. Once prior data exists, this tab will highlight the entities with the biggest delivery shifts."
										/>
									</CardBody>
								</Card>
							) }
							{ ! moversUnavailable && ! moversWaitingForData && (
								<>
									<MoversTable
										title="Ad movers"
										subtitle="Ads with the largest delivery swing versus the previous range."
										rows={
											data.breakdowns?.top_movers
												?.by_ad || []
										}
										emptyTitle="No major ad movers detected"
										emptyDescription="Ad delivery stayed fairly steady across the current and previous ranges."
										onAction={ openActionTarget }
									/>
									<MoversTable
										title="Placement movers"
										subtitle="Estimated movers based on currently assigned ads."
										rows={
											data.breakdowns?.top_movers
												?.by_placement || []
										}
										emptyTitle="No major placement movers detected"
										emptyDescription="Placement delivery stayed fairly stable across the comparison window."
										onAction={ openActionTarget }
									/>
								</>
							) }
						</div>
					) }
				</section>
			</div>
		</div>
	);
};

export default AnalyticsDashboard;
