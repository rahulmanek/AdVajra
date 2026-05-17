/**
 * DirtyStateContext.js
 *
 * Centralized unsaved-changes tracking infrastructure for AdVajra.
 *
 * @package advajra
 */
import { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react';

const DirtyStateContext = createContext( null );

/**
 * Access the DirtyState context.
 * Must be used within a DirtyStateProvider.
 */
export const useDirtyStateContext = () => {
	const context = useContext( DirtyStateContext );
	if ( ! context ) {
		throw new Error( 'useDirtyStateContext must be used within a DirtyStateProvider' );
	}
	return context;
};

/**
 * DirtyStateProvider
 *
 * Wraps the application to provide centralized dirty-state management.
 * Place this INSIDE the HashRouter but outside route components so it
 * has access to router context.
 */
export const DirtyStateProvider = ( { children } ) => {
	const registryRef = useRef( {} );

	const [ version, setVersion ] = useState( 0 );

	/**
	 * Mark a module as dirty (has unsaved changes).
	 *
	 * @param {string} moduleId - Unique identifier for the module (e.g., 'ad-editor-5', 'settings').
	 */
	const markDirty = useCallback( ( moduleId ) => {
		if ( ! moduleId ) {
			return;
		}
		if ( ! registryRef.current[ moduleId ] ) {
			registryRef.current[ moduleId ] = true;
			setVersion( ( v ) => v + 1 );
		}
	}, [] );

	/**
	 * Clear dirty state for a module (after successful save or intentional discard).
	 *
	 * @param {string} moduleId - Unique identifier for the module.
	 */
	const clearDirty = useCallback( ( moduleId ) => {
		if ( ! moduleId ) {
			return;
		}
		if ( registryRef.current[ moduleId ] ) {
			delete registryRef.current[ moduleId ];
			setVersion( ( v ) => v + 1 );
		}
	}, [] );

	/**
	 * Clear ALL dirty state across all modules.
	 * Useful for hard-reset scenarios.
	 */
	const clearAll = useCallback( () => {
		if ( Object.keys( registryRef.current ).length > 0 ) {
			registryRef.current = {};
			setVersion( ( v ) => v + 1 );
		}
	}, [] );

	/**
	 * Check if any module (or a specific module) has unsaved changes.
	 *
	 * @param {string} [moduleId] - If provided, checks only that module. Otherwise checks all.
	 * @return {boolean} True if dirty.
	 */
	const isDirty = useCallback( ( moduleId ) => {
		if ( moduleId ) {
			return Boolean( registryRef.current[ moduleId ] );
		}
		return Object.keys( registryRef.current ).length > 0;
	}, [] );

	/**
	 * Get list of all currently dirty module IDs.
	 *
	 * @return {string[]} Array of dirty module IDs.
	 */
	const getDirtyModules = useCallback( () => {
		return Object.keys( registryRef.current );
	}, [] );

	useEffect( () => {
		const handleBeforeUnload = ( e ) => {
			if ( Object.keys( registryRef.current ).length > 0 ) {
				// Modern browsers ignore custom text; the standard mechanism is enough.
				e.preventDefault();
				// Chrome requires returnValue to be set.
				e.returnValue = '';
			}
		};

		window.addEventListener( 'beforeunload', handleBeforeUnload );
		return () => {
			window.removeEventListener( 'beforeunload', handleBeforeUnload );
		};
	}, [] );

	useEffect( () => {
		const handleWPNavClick = ( e ) => {
			// Only intercept WordPress admin menu links (not our SPA nav)
			const link = e.target.closest( '#adminmenu a, #wp-admin-bar-root-default a' );
			if ( ! link ) {
				return;
			}

			// Skip if no dirty state
			if ( Object.keys( registryRef.current ).length === 0 ) {
				return;
			}

			// Skip if link points to our own SPA page (hash links handled by router guard)
			const href = link.getAttribute( 'href' ) || '';
			if ( href.includes( 'page=advajra' ) && href.includes( '#' ) ) {
				return;
			}

			// Show native confirmation for external WP admin navigation
			// eslint-disable-next-line no-alert
			const confirmed = window.confirm(
				'You have unsaved changes. Are you sure you want to leave this page?'
			);

			if ( ! confirmed ) {
				e.preventDefault();
				e.stopPropagation();
			}
		};

		// Use capture phase to intercept before WordPress handlers
		document.addEventListener( 'click', handleWPNavClick, true );
		return () => {
			document.removeEventListener( 'click', handleWPNavClick, true );
		};
	}, [] );

	const contextValue = {
		markDirty,
		clearDirty,
		clearAll,
		isDirty,
		getDirtyModules,
		version, // Allows consumers to re-render on dirty state changes
	};

	return (
		<DirtyStateContext.Provider value={ contextValue }>
			{ children }
		</DirtyStateContext.Provider>
	);
};
