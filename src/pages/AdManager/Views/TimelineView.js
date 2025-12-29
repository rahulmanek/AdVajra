/**
 * Views/TimelineView.js
 */
import React, { useMemo, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Button, Tooltip } from '@wordpress/components';
import { chevronLeft, chevronRight } from '@wordpress/icons';

const CELL_WIDTH = 40;
const SIDEBAR_WIDTH = 240;

const TimelineView = ( { data, schema, onEdit } ) => {
	const [ startOffset, setStartOffset ] = useState( -5 ); // Start 5 days in the past
	const [ daysToShow ] = useState( 35 ); // Show 5 weeks

	// Generate Date Range
	const dates = useMemo( () => {
		const arr = [];
		const today = new Date();
		// Normalize today to midnight
		today.setHours( 0, 0, 0, 0 );

		for ( let i = 0; i < daysToShow; i++ ) {
			const d = new Date( today );
			d.setDate( today.getDate() + ( startOffset + i ) );
			arr.push( d );
		}
		return arr;
	}, [ startOffset, daysToShow ] );

	// Navigate Time
	const handleShift = ( days ) => {
		setStartOffset( prev => prev + days );
	};

	// Determine bar segments for an ad on a specific day
	// Returns: { type, state, cssStatus, tooltipText } or null if no bar
	const getAdStatusOnDay = ( item, date ) => {
		// 1. Skip non-displayable statuses
		if ( item.status === 'draft' || item.status === 'trash' ) return null;

		// Normalize dates for comparison
		const today = new Date();
		today.setHours( 0, 0, 0, 0 );

		const dateNorm = new Date( date );
		dateNorm.setHours( 0, 0, 0, 0 );

		// 2. Parse Schedule - API returns start_date and end_date at top level
		let start = item.start_date ? new Date( item.start_date ) : null;
		let end = item.end_date ? new Date( item.end_date ) : null;

		// Normalize start/end to midnight for clean day comparisons
		if ( start ) start.setHours( 0, 0, 0, 0 );
		if ( end ) end.setHours( 0, 0, 0, 0 );

		// Determine time relationship of the cell date to today
		const isPast = dateNorm.getTime() < today.getTime();
		const isToday = dateNorm.getTime() === today.getTime();
		const isFuture = dateNorm.getTime() > today.getTime();

		// 3. No dates = Always On - ad is active now and will continue forever
		if ( ! start && ! end ) {
			// Always-on ad - check if ad is paused
			if ( item.status === 'paused' ) {
				return {
					type: 'always-on',
					state: isPast ? 'past' : ( isToday ? 'today' : 'future' ),
					cssStatus: 'paused',
					tooltipText: __( 'Paused', 'advajra' )
				};
			}
			// Always-on published ad: green on ALL days (past, today, future)
			// Future days are "Active" because ad IS active and will continue
			return {
				type: 'always-on',
				state: isPast ? 'past' : ( isToday ? 'today' : 'future' ),
				cssStatus: isPast ? 'was-active' : 'active',
				tooltipText: isPast ? __( 'Was Active', 'advajra' ) : __( 'Active', 'advajra' )
			};
		}

		// 4. Check if date is within the scheduled range
		// Before start → NO BAR (ad didn't exist yet)
		if ( start && dateNorm.getTime() < start.getTime() ) return null;

		// After end → NO BAR (campaign ended/expired)
		if ( end && dateNorm.getTime() > end.getTime() ) return null;

		// 5. Within range - determine per-day status
		// Check if ad is paused
		if ( item.status === 'paused' ) {
			return {
				type: 'scheduled',
				state: isPast ? 'past' : ( isToday ? 'today' : 'future' ),
				cssStatus: 'paused',
				tooltipText: __( 'Paused', 'advajra' )
			};
		}

		// Check if the ad has started running yet
		const adHasStarted = ! start || today.getTime() >= start.getTime();

		// Determine display based on day relation to today AND whether ad has started
		let cssStatus, tooltipText;
		if ( isPast ) {
			cssStatus = 'was-active';
			tooltipText = __( 'Was Active', 'advajra' );
		} else if ( isToday ) {
			cssStatus = 'active';
			tooltipText = __( 'Active Now', 'advajra' );
		} else {
			// Future day - check if ad has already started running
			if ( adHasStarted ) {
				// Ad is currently running and will continue on this future day
				cssStatus = 'active';
				tooltipText = __( 'Active', 'advajra' );
			} else {
				// Ad hasn't started yet - this future day is scheduled
				cssStatus = 'scheduled';
				tooltipText = __( 'Scheduled', 'advajra' );
			}
		}

		return {
			type: 'scheduled',
			state: isPast ? 'past' : ( isToday ? 'today' : 'future' ),
			cssStatus,
			tooltipText
		};
	};

	return (
		<div className="av-timeline-view">
			{/* Timeline Controls */}
			<div className="av-timeline-controls">
				<div className="av-current-month">
					{ dates[0].toLocaleDateString( undefined, { month: 'long', year: 'numeric' } ) }
				</div>
				<div className="av-nav-group">
					<Button icon={ chevronLeft } size="small" onClick={ () => handleShift( -7 ) } label={ __( 'Previous Week', 'advajra' ) } />
					<Button variant="secondary" size="small" onClick={ () => setStartOffset( -5 ) }>
						{ __( 'Today', 'advajra' ) }
					</Button>
					<Button icon={ chevronRight } size="small" onClick={ () => handleShift( 7 ) } label={ __( 'Next Week', 'advajra' ) } />
				</div>
			</div>

			{/* Scrolling Grid Area */}
			<div className="av-timeline-scroll-area">
				<div className="av-timeline-grid" style={{
					gridTemplateColumns: `${SIDEBAR_WIDTH}px repeat(${dates.length}, ${CELL_WIDTH}px)`
				}}>

					{/* Corner Cell */}
					<div className="av-timeline-corner">
						{ __( 'Campaign Name', 'advajra' ) }
					</div>

					{/* Date Headers */}
					{ dates.map( ( d, i ) => {
						const isToday = new Date().toDateString() === d.toDateString();
						const isWeekend = d.getDay() === 0 || d.getDay() === 6;

						return (
							<div key={ i } className={`av-timeline-header-cell ${ isToday ? 'is-today' : '' } ${ isWeekend ? 'is-weekend' : '' }`}>
								<div className="av-day-num">{ d.getDate() }</div>
								<div className="av-day-name">
									{ d.toLocaleDateString( 'en-US', { weekday: 'narrow' } ) }
								</div>
							</div>
						);
					} ) }

					{/* Data Rows */}
					{ data.map( item => {
						const title = item.title && item.title.raw
						? item.title.raw
							: __( '(No Title)', 'advajra' );

						return (
							<React.Fragment key={ item.id }>
								{/* Sidebar Cell */}
								<Tooltip text={ title }>
									<div className="av-timeline-sidebar-cell" onClick={ () => onEdit && onEdit( item.id ) }>
										<div className="av-ad-title">
											{ title }
										</div>
									</div>
								</Tooltip>

								{/* Day Cells */}
								{ dates.map( ( d, i ) => {
									const status = getAdStatusOnDay( item, d );
									const isToday = new Date().toDateString() === d.toDateString();
									const isWeekend = d.getDay() === 0 || d.getDay() === 6;

									return (
										<div key={ i } className={`av-timeline-cell ${ isToday ? 'is-today' : '' } ${ isWeekend ? 'is-weekend' : '' }`}>
											{ status && (
												<Tooltip text={ status.tooltipText }>
													<div
														className={`av-timeline-bar status-${status.cssStatus} type-${status.type} state-${status.state}`}
														onClick={ () => onEdit && onEdit( item.id ) }
													/>
												</Tooltip>
											) }
										</div>
									);
								} ) }
							</React.Fragment>
						);
					} ) }
				</div>
			</div>
		</div>
	);
};

export default TimelineView;
