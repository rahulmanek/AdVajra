/**
 * InboxBell.js
 *
 * Glassmorphic circular bell button mounted in the AdVajra top navigation slot.
 * Draws dynamic segmented HSL arcs surrounding the bell relative to current warning/critical split.
 * Pulses a very light, faint radar sweep when unread critical warnings exist.
 */
import { useState, useEffect, useRef } from 'react';
import { useInbox } from '../context/InboxContext';
import InboxPanel from './InboxPanel';

const PulseRing = ( { criticalCount, warningCount, infoCount } ) => {
	const SIZE = 48;
	const CENTER = SIZE / 2;
	const RADIUS = 20;
	const STROKE = 2.5;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	const total = criticalCount + warningCount + infoCount;

	if ( total === 0 ) {
		return null;
	}

	const segments = [];
	const items = [
		{ count: criticalCount, color: '#ef4444', cls: 'ring-critical' },
		{ count: warningCount, color: '#f59e0b', cls: 'ring-warning' },
		{ count: infoCount, color: '#3b82f6', cls: 'ring-info' },
	].filter( ( i ) => i.count > 0 );

	const GAP = items.length > 1 ? 4 : 0;
	const usable = CIRCUMFERENCE - GAP * items.length;

	let offset = 0;

	items.forEach( ( item ) => {
		const arcLen = ( item.count / total ) * usable;
		const dash = arcLen;
		const gap = CIRCUMFERENCE - arcLen;
		segments.push( {
			...item,
			strokeDasharray: `${ dash } ${ gap }`,
			strokeDashoffset: -( offset + CIRCUMFERENCE * 0.25 ),
		} );
		offset += arcLen + GAP;
	} );

	return (
		<svg
			className="advajra-inbox-bell__ring"
			width={ SIZE }
			height={ SIZE }
			viewBox={ `0 0 ${ SIZE } ${ SIZE }` }
			aria-hidden="true"
		>
			{ /* Soft background track ring */ }
			<circle
				className="ring-track"
				cx={ CENTER }
				cy={ CENTER }
				r={ RADIUS }
				fill="none"
				stroke="var(--av-primary)"
				strokeWidth={ STROKE }
			/>

			{ /* Severity-colored arcs */ }
			{ segments.map( ( seg ) => (
				<circle
					key={ seg.cls }
					className={ seg.cls }
					cx={ CENTER }
					cy={ CENTER }
					r={ RADIUS }
					fill="none"
					stroke={ seg.color }
					strokeWidth={ STROKE }
					strokeLinecap="round"
					strokeDasharray={ seg.strokeDasharray }
					strokeDashoffset={ seg.strokeDashoffset }
					style={ {
						transition:
							'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease',
					} }
				/>
			) ) }
		</svg>
	);
};

const BellIcon = () => (
	<svg
		className="advajra-inbox-bell__icon"
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
		<path d="M13.73 21a2 2 0 0 1-3.46 0" />
	</svg>
);

const getBadgeToneClass = ( criticalCount, warningCount ) => {
	if ( criticalCount > 0 ) {
		return 'is-critical';
	}

	if ( warningCount > 0 ) {
		return 'is-warning';
	}

	return 'is-info';
};

const InboxBell = () => {
	const {
		activeSignals,
		unreadCount,
		criticalCount,
		warningCount,
		infoCount,
	} = useInbox();
	const [ open, setOpen ] = useState( false );
	const [ ringing, setRinging ] = useState( false );

	const prevCountRef = useRef( activeSignals.length );
	const bellRef = useRef( null );

	// Swing bell when new items are appended
	useEffect( () => {
		const previousCount = prevCountRef.current;
		const currentCount = activeSignals.length;
		prevCountRef.current = currentCount;

		if ( currentCount > previousCount ) {
			setRinging( true );
			const timeoutId = setTimeout( () => setRinging( false ), 750 );
			return () => clearTimeout( timeoutId );
		}

		return undefined;
	}, [ activeSignals.length ] );

	const handlePanelClose = () => {
		setOpen( false );
		window.requestAnimationFrame( () => bellRef.current?.focus() );
	};

	return (
		<div className="advajra-nav-right">
			<button
				className={ [
					'advajra-inbox-bell',
					ringing ? 'is-ringing' : '',
					criticalCount > 0 ? 'has-critical' : '',
					warningCount > 0 ? 'has-warning' : '',
					unreadCount > 0 && criticalCount === 0 && warningCount === 0
						? 'has-info'
						: '',
				]
					.filter( Boolean )
					.join( ' ' ) }
				onClick={ () => setOpen( ( o ) => ! o ) }
				aria-label={ `Vajra Inbox${
					unreadCount > 0 ? ` — ${ unreadCount } unread` : ''
				}` }
				aria-expanded={ open }
				data-tooltip="Vajra Inbox"
				ref={ bellRef }
			>
				{ /* Segmented active severity ring */ }
				<PulseRing
					criticalCount={ criticalCount }
					warningCount={ warningCount }
					infoCount={ infoCount }
				/>

				{ /* Main Bell */ }
				<BellIcon />

				{ /* Badge Indicator Dot */ }
				{ unreadCount > 0 && (
					<span
						className={ [
							'advajra-inbox-bell__badge',
							getBadgeToneClass( criticalCount, warningCount ),
						].join( ' ' ) }
						key={ unreadCount }
					>
						{ unreadCount > 99 ? '99+' : unreadCount }
					</span>
				) }
			</button>

			{ /* Slide drawer */ }
			{ open && <InboxPanel onClose={ handlePanelClose } /> }
		</div>
	);
};

export default InboxBell;
