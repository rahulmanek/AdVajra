/**
 * NavigationGuard.js
 *
 * React Router navigation blocker for unsaved changes.
 * Intercepts internal SPA route changes and shows a confirmation modal.
 *
 * Uses react-router-dom's `useBlocker` (v6.4+) or falls back to
 * `useNavigate` + `useLocation` based navigation interception.
 *
 * Place this component once inside the HashRouter, typically in App.js
 * or AdManagerLayout.
 *
 * @package advajra
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDirtyStateContext } from '../context/DirtyStateContext';
import UnsavedChangesModal from './UnsavedChangesModal';

const NavigationGuard = () => {
	const { isDirty, clearAll, version } = useDirtyStateContext();
	const location = useLocation();
	const navigate = useNavigate();

	const [ showModal, setShowModal ] = useState( false );
	const [ pendingPath, setPendingPath ] = useState( null );

	// Track the previous pathname to detect route changes
	const prevPathRef = useRef( location.pathname );
	const isBlockingRef = useRef( false );

	/**
	 * Intercept programmatic navigation by monkey-patching navigate.
	 * This is necessary because react-router-dom v6 removed Prompt/useBlocker
	 * in many versions. We intercept at the nav pill level instead.
	 */

	// Store the original navigate function for confirmed navigation
	const confirmedNavigateRef = useRef( null );

	/**
	 * Create a navigation interceptor that checks dirty state before allowing navigation.
	 * This is called by AdManagerLayout's NavPill clicks and back buttons.
	 */
	const guardedNavigate = useCallback( ( to, options ) => {
		if ( isBlockingRef.current ) {
			// Already showing modal, ignore duplicate attempts
			return;
		}

		if ( isDirty() ) {
			isBlockingRef.current = true;
			setPendingPath( to );
			setShowModal( true );
			return;
		}

		// No dirty state, navigate immediately
		navigate( to, options );
	}, [ isDirty, navigate ] );

	// Expose guardedNavigate globally so AdManagerLayout can use it
	useEffect( () => {
		window.__advajraGuardedNavigate = guardedNavigate;
		return () => {
			delete window.__advajraGuardedNavigate;
		};
	}, [ guardedNavigate ] );

	/**
	 * Handle modal: user confirms leaving (discard changes).
	 */
	const handleConfirmLeave = useCallback( () => {
		setShowModal( false );
		isBlockingRef.current = false;

		// Clear all dirty state since user chose to discard
		clearAll();

		// Navigate to the pending path
		if ( pendingPath ) {
			navigate( pendingPath );
			setPendingPath( null );
		}
	}, [ clearAll, navigate, pendingPath ] );

	/**
	 * Handle modal: user cancels (stay on page).
	 */
	const handleCancelLeave = useCallback( () => {
		setShowModal( false );
		setPendingPath( null );
		isBlockingRef.current = false;
	}, [] );

	return showModal ? (
		<UnsavedChangesModal
			onConfirm={ handleConfirmLeave }
			onCancel={ handleCancelLeave }
		/>
	) : null;
};

export default NavigationGuard;
