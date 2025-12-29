/**
 * useSelection.js
 */
import { useState, useCallback, useMemo, useRef } from 'react';

/**
 * @typedef {Object} SelectionState
 * @property {Set<any>} selectedIds - Set of selected item IDs
 * @property {number} selectedCount - Count of selected items
 * @property {boolean} isAllSelected - Whether all items are selected
 * @property {boolean} hasSelection - Whether any items are selected
 * @property {(id: any) => boolean} isSelected - Check if an ID is selected
 * @property {(id: any, event?: MouseEvent) => void} toggle - Toggle selection (supports shift+click)
 * @property {() => void} selectAll - Select all items
 * @property {() => void} clear - Clear selection
 * @property {(startId: any, endId: any) => void} rangeSelect - Select range between two IDs
 * @property {() => void} invert - Invert selection
 */

/**
 * @param {Array} items - Array of items to select from
 * @param {Object} options - Configuration options
 * @param {(item: any) => any} options.getKey - Function to extract ID from item (default: item => item.id)
 * @returns {SelectionState}
 */
const useSelection = (items = [], options = {}) => {
    const { getKey = item => item.id } = options;

    // State: Set for O(1) operations
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Track last selected ID for range selection
    const lastSelectedRef = useRef(null);

    // Memoize item IDs array
    const itemIds = useMemo(() => items.map(getKey), [items, getKey]);

    // Check if ID is selected (O(1))
    const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

    // Toggle single ID
    const toggleSingle = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
        lastSelectedRef.current = id;
    }, []);

    // Range selection: select all items between startId and endId
    const rangeSelect = useCallback((startId, endId) => {
        const startIdx = itemIds.indexOf(startId);
        const endIdx = itemIds.indexOf(endId);

        if (startIdx === -1 || endIdx === -1) return;

        const [minIdx, maxIdx] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeIds = itemIds.slice(minIdx, maxIdx + 1);

        setSelectedIds(prev => {
            const next = new Set(prev);
            rangeIds.forEach(id => next.add(id));
            return next;
        });
    }, [itemIds]);

    // Toggle with Shift+Click support
    const toggle = useCallback((id, event) => {
        // Shift+Click for range selection
        if (event?.shiftKey && lastSelectedRef.current !== null) {
            rangeSelect(lastSelectedRef.current, id);
            lastSelectedRef.current = id;
            return;
        }

        toggleSingle(id);
    }, [toggleSingle, rangeSelect]);

    // Select all
    const selectAll = useCallback(() => {
        setSelectedIds(new Set(itemIds));
    }, [itemIds]);

    // Clear selection
    const clear = useCallback(() => {
        setSelectedIds(new Set());
        lastSelectedRef.current = null;
    }, []);

    // Invert selection
    const invert = useCallback(() => {
        setSelectedIds(prev => {
            const next = new Set();
            itemIds.forEach(id => {
                if (!prev.has(id)) {
                    next.add(id);
                }
            });
            return next;
        });
    }, [itemIds]);

    // Remove deleted items from selection (when items array changes)
    // This is handled automatically since we reference itemIds

    // Computed values
    const selectedCount = selectedIds.size;
    const hasSelection = selectedCount > 0;
    const isAllSelected = items.length > 0 && selectedCount === items.length;

    // Return stable object reference when possible
    return useMemo(() => ({
        selectedIds,
        selectedCount,
        hasSelection,
        isAllSelected,
        isSelected,
        toggle,
        selectAll,
        clear,
        rangeSelect,
        invert,
    }), [
        selectedIds,
        selectedCount,
        hasSelection,
        isAllSelected,
        isSelected,
        toggle,
        selectAll,
        clear,
        rangeSelect,
        invert,
    ]);
};

export default useSelection;
