/**
 * InboxCard.js
 *
 * Renders an individual notification inside the inbox.
 * Contains standard severity stripes, dynamic icons, CTAs, and a springy dismiss toggle.
 */
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInbox } from '../context/InboxContext';

const timeAgo = ( timestamp ) => {
	const diff = Date.now() - timestamp;
	const minutes = Math.floor( diff / 60000 );

	if ( minutes < 1 ) {
		return 'just now';
	}

	if ( minutes < 60 ) {
		return `${ minutes }m ago`;
	}

	const hours = Math.floor( diff / 3600000 );

	if ( hours < 24 ) {
		return `${ hours }h ago`;
	}

	const days = Math.floor( diff / 86400000 );

	if ( days < 7 ) {
		return `${ days }d ago`;
	}

	return new Date( timestamp ).toLocaleDateString();
};

const InboxCard = ( {
	signal,
	onPanelClose,
	showDismiss = false,
	showDelete = false,
	onDelete,
} ) => {
	const { dismissSignal } = useInbox();
	const navigate = useNavigate();
	const [ dismissing, setDismissing ] = useState( false );
	const [ collapseHeight, setCollapseHeight ] = useState( null );
	const cardRef = useRef( null );

	const collapseThen = useCallback( ( callback ) => {
		const height = cardRef.current?.scrollHeight || 0;
		setCollapseHeight( height ? `${ height }px` : null );

		window.requestAnimationFrame( () => {
			setDismissing( true );
		} );

		// Allow time for vaporize collapse animation to play out
		setTimeout( callback, 320 );
	}, [] );

	const handleDismiss = useCallback( () => {
		collapseThen( () => dismissSignal( signal.id ) );
	}, [ collapseThen, dismissSignal, signal.id ] );

	const handleDelete = useCallback( () => {
		collapseThen( () => onDelete?.( signal.id ) );
	}, [ collapseThen, onDelete, signal.id ] );

	const handleCta = useCallback( () => {
		if ( signal.cta?.path ) {
			onPanelClose?.();
			navigate( signal.cta.path );
		}
	}, [ signal.cta, navigate, onPanelClose ] );

	return (
		<div
			ref={ cardRef }
			style={
				collapseHeight && ! dismissing
					? { maxHeight: collapseHeight }
					: undefined
			}
			className={ [
				'advajra-inbox-card',
				`advajra-inbox-card--${ signal.type }`,
				signal.dismissed ? 'is-archived' : '',
				! signal.read ? 'is-unread' : '',
				dismissing ? 'is-dismissing' : '',
			]
				.filter( Boolean )
				.join( ' ' ) }
			role="listitem"
		>
			{ /* Minimal left severity stripe */ }
			<div className="advajra-inbox-card__stripe" />

			{ /* Notification content body */ }
			<div className="advajra-inbox-card__body">
				<div className="advajra-inbox-card__header">
					<div className="advajra-inbox-card__title">
						{ ! signal.read && ! signal.dismissed && (
							<span className="advajra-inbox-card__unread-dot" />
						) }
						{ signal.title }
					</div>
					<div className="advajra-inbox-card__header-right">
						<span className="advajra-inbox-card__time">
							{ timeAgo( signal.createdAt ) }
						</span>
						{ showDismiss && ! signal.dismissed && (
							<button
								className="advajra-inbox-card__dismiss"
								onClick={ handleDismiss }
								title="Archive"
								aria-label="Archive notification"
							>
								×
							</button>
						) }
						{ showDelete && signal.dismissed && (
							<button
								className="advajra-inbox-card__dismiss advajra-inbox-card__delete"
								onClick={ handleDelete }
								title="Remove"
								aria-label="Remove notification"
							>
								×
							</button>
						) }
					</div>
				</div>

				{ signal.message && (
					<div className="advajra-inbox-card__message">
						{ signal.message }
					</div>
				) }

				{ signal.cta && ! signal.dismissed && (
					<button
						className="advajra-inbox-card__cta"
						onClick={ handleCta }
					>
						{ signal.cta.label }
						<span className="cta-arrow">→</span>
					</button>
				) }
			</div>
		</div>
	);
};

export default InboxCard;
