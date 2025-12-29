/**
 * BulkHUD.js
 */
import React, { memo } from 'react';
import { Icon } from '@wordpress/components';
import { copy, trash } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';

/**
 * @typedef {Object} BulkHUDProps
 * @property {number} selectedCount - Number of selected items
 * @property {number} totalCount - Total number of items
 * @property {boolean} isAllSelected - Whether all items are selected
 * @property {() => void} onSelectAll - Callback to select all items
 * @property {() => void} onClear - Callback to clear selection
 * @property {() => void} onDuplicate - Callback for bulk duplicate
 * @property {() => void} onDelete - Callback for bulk delete
 * @property {boolean} isPro - Whether PRO features are available
 * @property {Array<Object>} customActions - Optional custom actions to add
 */

const BulkHUD = memo(({
    selectedCount = 0,
    totalCount = 0,
    isAllSelected = false,
    onSelectAll,
    onClear,
    onDuplicate,
    onDelete,
    isPro = false,
    customActions = [],
}) => {
    const isVisible = selectedCount > 0;

    return (
        <div className={`bulk-hud ${isVisible ? 'visible' : ''}`}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                    {selectedCount} {__('Selected', 'advajra')}
                </div>
                {!isAllSelected && totalCount > 0 && (
                    <button
                        onClick={onSelectAll}
                        className="hud-text-btn"
                    >
                        {__('Select All', 'advajra')} {totalCount}
                    </button>
                )}
            </div>

            <div className="hud-divider" />


            <button
                className="hud-btn"
                onClick={onDuplicate}
            >
                <Icon icon={copy} style={{ width: 16, height: 16 }} />
                {__('Duplicate', 'advajra')}
                {!isPro && <span className="pro-badge pro-badge--hud">PRO</span>}
            </button>

            <button
                className="hud-btn danger"
                onClick={onDelete}
            >
                <Icon icon={trash} style={{ width: 16, height: 16 }} />
                {__('Delete', 'advajra')}
            </button>


            {customActions.map((action, index) => (
                <button
                    key={index}
                    className={`hud-btn ${action.variant || ''}`}
                    onClick={action.onClick}
                    disabled={action.disabled}
                >
                    {action.icon && <Icon icon={action.icon} style={{ width: 16, height: 16 }} />}
                    {action.label}
                    {action.isPro && !isPro && <span className="pro-badge pro-badge--hud">PRO</span>}
                </button>
            ))}

            <div className="hud-divider" />


            <button
                className="hud-btn cancel"
                onClick={onClear}
            >
                {__('Cancel', 'advajra')}
            </button>
        </div>
    );
});

BulkHUD.displayName = 'BulkHUD';

export default BulkHUD;
