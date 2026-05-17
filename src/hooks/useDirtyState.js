/**
 * useDirtyState Hook
 *
 * High-level hook for editor components to track unsaved changes.
 * Wraps the centralized DirtyStateContext with a convenient API.
 *
 * Features:
 * - Explicit `markDirty()` / `clearDirty()` — no deep comparison overhead.
 * - Auto-cleanup on unmount (clears dirty state for this module).
 * - `wrapSave()` helper integrates with save lifecycle (preserves dirty on failure).
 * - `isDirty` boolean for UI feedback (e.g., dot indicator on save button).
 *
 * Usage:
 *   const { markDirty, clearDirty, isDirty, wrapSave } = useDirtyState('ad-editor-5');
 *
 *   // Mark dirty on any change:
 *   const handleTitleChange = (e) => { setTitle(e.target.value); markDirty(); };
 *
 *   // Wrap save handler to auto-clear on success:
 *   const handleSave = wrapSave(async () => { await dispatchSave(id, data); });
 *
 * @package advajra
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useDirtyStateContext } from '../context/DirtyStateContext';

/**
 * @param {string} moduleId - Unique identifier for this editor/module instance.
 *                            Convention: 'ad-editor-{id}', 'group-editor-{id}',
 *                            'placement-editor-{id}', 'settings', etc.
 * @return {Object} Dirty state API for this module.
 */
const useDirtyState = ( moduleId ) => {
	const {
		markDirty: ctxMarkDirty,
		clearDirty: ctxClearDirty,
		isDirty: ctxIsDirty,
		version,
	} = useDirtyStateContext();

	const markDirty = useCallback( () => {
		ctxMarkDirty( moduleId );
	}, [ moduleId, ctxMarkDirty ] );

	const clearDirty = useCallback( () => {
		ctxClearDirty( moduleId );
	}, [ moduleId, ctxClearDirty ] );

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const isDirty = useMemo( () => ctxIsDirty( moduleId ), [ moduleId, ctxIsDirty, version ] );

	const wrapSave = useCallback( ( saveFn ) => {
		return async ( ...args ) => {
			const result = await saveFn( ...args );
			clearDirty();
			return result;
		};
	}, [ clearDirty ] );

	useEffect( () => {
		return () => {
			ctxClearDirty( moduleId );
		};
	}, [ moduleId, ctxClearDirty ] );

	return {
		markDirty,
		clearDirty,
		isDirty,
		wrapSave,
	};
};

export default useDirtyState;
