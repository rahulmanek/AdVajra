/**
 * AdSchema.js
 *
 * Single source of truth for Ad Definitions.
 * This drives the List, Timeline, and Gallery views.
 */
import React from 'react';

// Status Definitions (labels only - colors in CSS via --av-status-* variables)
export const STATUS_CONFIG = {
    publish:  { label: 'Active',    key: 'publish' },
    future:   { label: 'Scheduled', key: 'future' },
    draft:    { label: 'Draft',     key: 'draft' },
    paused:   { label: 'Paused',    key: 'paused' },
    expired:  { label: 'Expired',   key: 'expired' },
    archived: { label: 'Archived',  key: 'archived' },
    pending:  { label: 'Pending',   key: 'pending' },
};

const TextRenderer = ( val ) => <span>{ val }</span>;

export const BadgeRenderer = ( val ) => {
    // Fallback for unknown statuses
	const config = STATUS_CONFIG[ val ] || { label: val, key: 'draft' };

    // Uses av-status-badge class from _status.scss
	return (
		<span className={`av-status-badge ${config.key || val}`}>
			{ config.label }
		</span>
	);
};

export const AdSchema = {
	title: {
		label: 'Ad Name',
		type: 'text',
		sortable: true,
		width: '300px',
		render: TextRenderer,
	},

	stats: {
		label: 'Performance',
		type: 'custom',
		sortable: false,
		width: '180px',
		render: ( _, item ) => (
			<div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', lineHeight: '1.4' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
					<span style={{ minWidth: '35px' }}>Imps:</span>
					<span style={{ fontWeight: 600, color: '#334155' }}>{ item.impressions ? item.impressions.toLocaleString() : 0 }</span>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
					<span style={{ minWidth: '35px' }}>Clicks:</span>
					<span style={{ fontWeight: 600, color: '#334155' }}>
                        { item.clicks ? item.clicks.toLocaleString() : Math.round((item.impressions || 0) * ((item.ctr || 0) / 100)).toLocaleString() }
                    </span>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
					<span style={{ minWidth: '35px' }}>CTR:</span>
					{item.impressions > 0 ? (
						<span style={{
							fontWeight: 600,
							color: (item.ctr || 0) > 1.5 ? '#10b981' : ((item.ctr || 0) > 0.5 ? '#334155' : '#94a3b8'),
							padding: '0 4px',
							borderRadius: '4px',
							background: (item.ctr || 0) > 1.5 ? '#ecfdf5' : 'transparent',
						}}>
							{ item.ctr || 0 }%
						</span>
					) : (
						<span style={{ color: '#94a3b8' }}>—</span>
					)}
				</div>
			</div>
		),
	},
	// Fields hidden in list view but used in other views
	image: {
		label: 'Creative',
		type: 'image',
		hiddenInList: true,
	},
	schedule: {
		label: 'Schedule',
		type: 'date-range',
		sortable: true,
		width: '150px',
	},
	trend: {
		label: 'Trend',
		type: 'custom',
		sortable: false,
		width: '100px',
	},
	date: {
		label: 'Created',
		type: 'date',
		sortable: true,
		width: '140px',
	},
	modified: {
		label: 'Modified',
		type: 'date',
		sortable: true,
		width: '140px',
	}
};
