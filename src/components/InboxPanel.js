/**
 * InboxPanel.js
 *
 * Sliding panel containing undismissed (Active) and dismissed (Archive) notifications.
 * Renders as a React Portal inside document.body to bypass stacking context limits.
 *
 * Visual features:
 * - Clean light-mode frosted-glass layout (Aether Theme).
 * - Division of Active notifications into "New" (unread) and "Earlier" (read) subgroups.
 * - Selective actions row ("Mark all read", "Clear archive").
 * - Clean transitions and layout spacing.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useInbox } from '../context/InboxContext';
import InboxCard from './InboxCard';

const InboxSection = ( { title, signals, isNew = false, onPanelClose } ) => {
	if ( signals.length === 0 ) {
		return null;
	}

	return (
		<div className="advajra-inbox-section">
			<div className="advajra-inbox-section__header">
				{ isNew && <span className="section-glow section-glow--new" /> }
				{ title }
			</div>
			<div className="advajra-inbox-section__list">
				{ signals.map( ( signal ) => (
					<InboxCard
						key={ signal.id }
						signal={ signal }
						onPanelClose={ onPanelClose }
						showDismiss
					/>
				) ) }
			</div>
		</div>
	);
};

const InboxPanel = ( { onClose } ) => {
	const {
		activeSignals,
		archiveSignals,
		markAllRead,
		clearAllArchive,
		deleteSignal,
	} = useInbox();

	const [ rail, setRail ] = useState( 'active' );
	const [ isClosing, setIsClosing ] = useState( false );
	const panelRef = useRef( null );
	const closeRef = useRef( null );
	const closingRef = useRef( false );

	const handleClose = useCallback( () => {
		if ( closingRef.current ) {
			return;
		}

		closingRef.current = true;
		setIsClosing( true );
		setTimeout( () => {
			onClose();
		}, 250 );
	}, [ onClose ] );

	useEffect( () => {
		closeRef.current?.focus();
	}, [] );

	// Keep keyboard focus inside the drawer while it is open.
	useEffect( () => {
		const handler = ( e ) => {
			if ( e.key === 'Escape' ) {
				handleClose();
				return;
			}

			if ( e.key !== 'Tab' || ! panelRef.current ) {
				return;
			}

			const focusable = panelRef.current.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const first = focusable[ 0 ];
			const last = focusable[ focusable.length - 1 ];

			if ( ! first || ! last ) {
				return;
			}

			const activeElement = panelRef.current.ownerDocument.activeElement;

			if ( e.shiftKey && activeElement === first ) {
				e.preventDefault();
				last.focus();
			} else if ( ! e.shiftKey && activeElement === last ) {
				e.preventDefault();
				first.focus();
			}
		};

		document.addEventListener( 'keydown', handler );
		return () => document.removeEventListener( 'keydown', handler );
	}, [ handleClose ] );

	const handleClearArchive = useCallback( () => {
		clearAllArchive();
		setRail( 'active' );
	}, [ clearAllArchive ] );

	// Split active cards into fresh (unread) and past (read) groups
	const freshSignals = useMemo(
		() => activeSignals.filter( ( s ) => ! s.read ),
		[ activeSignals ]
	);
	const pastSignals = useMemo(
		() => activeSignals.filter( ( s ) => s.read ),
		[ activeSignals ]
	);

	const isEmpty =
		rail === 'active'
			? activeSignals.length === 0
			: archiveSignals.length === 0;

	const hasActions =
		( rail === 'active' && freshSignals.length > 0 ) ||
		( rail === 'archive' && archiveSignals.length > 0 );

	const renderList = () => {
		if ( rail === 'active' ) {
			return (
				<>
					<InboxSection
						title="New"
						signals={ freshSignals }
						isNew
						onPanelClose={ onClose }
					/>
					<InboxSection
						title="Earlier"
						signals={ pastSignals }
						onPanelClose={ onClose }
					/>
				</>
			);
		}

		return archiveSignals.map( ( signal ) => (
			<InboxCard
				key={ signal.id }
				signal={ signal }
				onPanelClose={ onClose }
				showDelete
				onDelete={ deleteSignal }
			/>
		) );
	};

	const panel = (
		<>
			{ /* Soft Backdrop */ }
			<div
				className={ `advajra-inbox-backdrop ${
					isClosing ? 'is-closing' : ''
				}` }
				onClick={ handleClose }
				role="presentation"
			/>

			{ /* Slide-out Panel */ }
			<aside
				className={ `advajra-inbox-panel ${
					isClosing ? 'is-closing' : ''
				}` }
				role="dialog"
				aria-modal="true"
				aria-label="Vajra Inbox"
				ref={ panelRef }
			>
				{ /* Header */ }
				<div className="advajra-inbox-panel__header">
					<h2>
						<span className="bell-emoji">🔔</span>
						Vajra Inbox
					</h2>
					<button
						className="advajra-inbox-panel__close"
						onClick={ handleClose }
						aria-label="Close Vajra Inbox"
						ref={ closeRef }
					>
						×
					</button>
				</div>

				{ /* Tab switcher capsule */ }
				<div className="advajra-inbox-panel__tabs" role="tablist">
					<button
						role="tab"
						aria-selected={ rail === 'active' }
						className={ `advajra-inbox-panel__tab-btn ${
							rail === 'active' ? 'active' : ''
						}` }
						onClick={ () => setRail( 'active' ) }
					>
						Active
						{ activeSignals.length > 0 && (
							<span>{ activeSignals.length }</span>
						) }
					</button>
					<button
						role="tab"
						aria-selected={ rail === 'archive' }
						className={ `advajra-inbox-panel__tab-btn ${
							rail === 'archive' ? 'active' : ''
						}` }
						onClick={ () => setRail( 'archive' ) }
					>
						Archived
						{ archiveSignals.length > 0 && (
							<span>{ archiveSignals.length }</span>
						) }
					</button>
				</div>

				{ /* Selective Actions Row */ }
				{ hasActions && (
					<div className="advajra-inbox-panel__actions">
						{ rail === 'active' && freshSignals.length > 0 && (
							<button
								className="advajra-inbox-panel__action-btn"
								onClick={ markAllRead }
							>
								Mark all read
							</button>
						) }
						{ rail === 'archive' && archiveSignals.length > 0 && (
							<button
								className="advajra-inbox-panel__action-btn"
								onClick={ handleClearArchive }
							>
								Clear Archived
							</button>
						) }
					</div>
				) }

				{ /* Notification List Scroll View */ }
				{ isEmpty ? (
					<div className="advajra-inbox-panel__empty">
						<div className="empty-icon">
							{ rail === 'active' ? '🎉' : '📭' }
						</div>
						<p>
							{ rail === 'active'
								? 'All caught up!\nNo new notifications.'
								: 'Archived list is empty.' }
						</p>
					</div>
				) : (
					<div className="advajra-inbox-panel__list" role="list">
						{ renderList() }
					</div>
				) }
			</aside>
		</>
	);

	return createPortal( panel, document.body );
};

export default InboxPanel;
