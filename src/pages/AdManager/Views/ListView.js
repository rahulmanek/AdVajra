/**
 * Views/ListView.js
 */
import { memo, useMemo, useRef, useEffect, useState } from 'react';
import { List } from 'react-window';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@wordpress/components';
import { edit, trash, copy, code as codeIcon, alignLeft, image as imageIcon, calendar } from '@wordpress/icons';
import Sparkline from '../../../components/Sparkline';
import ActionDropdown from '../../../components/ActionDropdown';
import Tooltip from '../../../components/Tooltip';
import { STATUS_CONFIG } from '../AdSchema';
import { AdvajraAnalyticsIcon } from '../../../components/AdvajraIcons';

const adTypesRegistry = (typeof window !== 'undefined' && window.advajraSettings && window.advajraSettings.adTypes) ? window.advajraSettings.adTypes : {};
const registryKeys = Object.keys(adTypesRegistry || {});
const defaultType = registryKeys.includes('plain') ? 'plain' : (registryKeys.length ? registryKeys[0] : 'plain');

// --- STYLES REMOVED (Moved to src/scss/pages/_ad-manager.scss) ---

const COL_CONFIG = {
    title:    { width: 'minmax(160px, 1fr)',   label: 'Creative' },
    stats:    { width: 'minmax(120px, 0.5fr)', label: 'Stats' },
    schedule: { width: 'minmax(150px, 0.6fr)', label: 'Schedule' },
    trend:    { width: '120px', label: 'Trend', align: 'center' },
    date:     { width: '140px', label: 'Created' },
    modified: { width: '140px', label: 'Modified' },
};

const getColWidth = (key) => COL_CONFIG[key]?.width || 'minmax(100px, 1fr)';
const getColLabel = (key) => COL_CONFIG[key]?.label || key.charAt(0).toUpperCase() + key.slice(1);

const formatSchedule = (startDate, endDate, status) => {
    const now = new Date();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // Helper for datetime formatting
    const dateTimeStr = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateStr = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // 0. EXPIRED Status (Explicit from Backend)
    // Fix: Only treat as expired if end date is actually in the past
    if (status === 'expired' && (!end || end < now)) {
        return {
            text: end ? `Expired ${dateTimeStr(end)}` : 'Expired',
            color: 'red'
        };
    }

    // Determine if Start is "Set" (Future) or "Empty" (Past/Null)
    const isStartFuture = start && start > now;

    // 1. Start Empty (Past), End Set -> "Expires DATE"
    if (!isStartFuture && end) {
        return { text: `Expires ${dateStr(end)}`, color: 'orange' };
    }

    // 2. Start Empty (Past), End Empty -> Empty (render nothing)
    if (!isStartFuture && !end) {
        // Double check status just in case
        return { text: null, isActive: true };
    }

    // 3. Start Set (Future), End Set -> "DATE - DATE"
    if (isStartFuture && end) {
        return { text: `${dateStr(start)} - ${dateStr(end)}`, color: 'blue' };
    }

    // 4. Start Set (Future), End Empty -> "From DATE"
    if (isStartFuture && !end) {
        return { text: `From ${dateStr(start)}`, color: 'blue' };
    }

    return { text: null, isActive: true };
};

// --- CELL COMPONENTS ---

// 1. Smart Thumbnail
const SmartThumbnail = ({ type, src, alt }) => {
    if (src && src.length > 0) {
        return (
            <div className="glass-thumb no-pad">
                <img
                    src={src}
                    alt={alt || 'Ad'}
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            </div>
        );
    }

    let iconDef = alignLeft;
    let typeClass = 'default';

    if (type === 'plain') {
        iconDef = codeIcon;
        typeClass = 'plain';
    } else if (type === 'image') {
        iconDef = imageIcon;
        typeClass = 'image';
    }

    return (
        <div className={`glass-thumb ${typeClass}`}>
            <Icon icon={iconDef} className={`thumb-icon ${typeClass}`} />
        </div>
    );
};

const CreativeCell = ({ item }) => {
    const now = new Date();
    let statusKey = item.status;

    // Check for Scheduled
    if ( item.status === 'publish' && item.start_date ) {
        const startDate = new Date( item.start_date );
        if ( startDate > now ) {
            statusKey = 'future';
        }
    }

    // Fix: If status is 'expired' but end_date is in future, recalculate
    if ( item.status === 'expired' && item.end_date ) {
        const endDate = new Date( item.end_date );
        if ( endDate > now ) {
             // It is NOT expired. Check if future or active.
             if ( item.start_date && new Date(item.start_date) > now ) {
                 statusKey = 'future';
             } else {
                 statusKey = 'publish';
             }
        }
    }

    // Get config from Schema
    const config = STATUS_CONFIG[ statusKey ] || STATUS_CONFIG['draft'];

    return (
        <div className="ad-creative-cell">
            <Tooltip
                content={(item.type || defaultType)}
                style={{ fontSize: '0.9em' }}
            >
                <div className="cursor-help">
                    <SmartThumbnail type={item.type} src={item.image} alt={item.title?.raw} />
                </div>
            </Tooltip>
            <div className="min-w-0">
                <div className="ad-title" title={item.title?.raw || item.title}>
                    {item.title?.raw || item.title}
                </div>
                <div className="ad-meta">
                    <span className={`av-status-dot ${statusKey}`} />
                    <span>{config.label}</span>
                    <span className="opacity-40">•</span>
                    <span className="ad-id">#{item.id}</span>
                </div>
            </div>
        </div>
    );
};

const StatsCell = ({ item }) => (
    <div className="ad-stats-cell">
        <div className="stat-stack">
            <span className="stat-value">{item.impressions?.toLocaleString() || '0'}</span>
            <span className="stat-label">IMPR</span>
        </div>
        <div className="stat-stack">
            <span className="stat-value">{item.clicks?.toLocaleString() || '0'}</span>
            <span className="stat-label">CLICKS</span>
        </div>
        <div className="stat-stack">
            <span className={`stat-value ${(item.ctr || 0) >= 2 ? 'good' : (item.ctr || 0) >= 1 ? 'mid' : 'neutral'}`}>
                {item.ctr || 0}%
            </span>
            <span className="stat-label">CTR</span>
        </div>
    </div>
);

const TrendCell = ({ item, isPublished, trendData }) => (
    <div className="text-center">
        <Sparkline width={80} height={28} color={isPublished ? '#10b981' : '#cbd5e1'} data={trendData} />
    </div>
);

const ScheduleCell = ({ item }) => {
    const schedule = formatSchedule(item.start_date, item.end_date, item.status);
    if (!schedule.text) return <div className="ad-schedule-cell"></div>;

    const isRed = schedule.color === 'red';
    const isOrange = schedule.color === 'orange';

    let style = {};
    if (isOrange) style = { background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' };
    if (isRed)    style = { background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' };

    return (
        <div className="ad-schedule-cell">
            <div className={`schedule-badge ${schedule.color === 'blue' ? 'active' : 'warning'}`} style={style}>
                <Icon icon={calendar} />
                <span>{schedule.text}</span>
            </div>
        </div>
    );
};

const DateCell = ({ date }) => (
    <span className="ad-date-text">
        {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
    </span>
);




// 2. The Glass Row (Memoized for Performance)
const Row = memo( ({ index, style, data }) => {
    const { items, selectedIds, actions: { onEdit, onDuplicate, onDelete, navigate, onSelect }, isPro, visibleColumns, gridTemplateColumns, trends } = data;
    const item = items[index];

    if (!item) return null;

    const isSelected = selectedIds.has(item.id);
    const isPublished = item.status === 'publish';
    const trendData = trends ? trends[item.id] : undefined;

    // Row Styling
    const rowStyle = {
        ...style,
        height: (typeof style.height === 'number' ? style.height : 92) - 12, // 92px height, 12px gap
        top: (typeof style.top === 'number' ? style.top : 0) + 6,
        left: 16,
        width: `calc(100% - 32px)`,
        zIndex: isSelected ? 20 : 1, // Elevate selected
        gridTemplateColumns, // DYNAMIC GRID
    };

    return (
        <div
            style={rowStyle}
            className={`glass-row glass-grid-layout ${isSelected ? 'selected' : ''}`}
            onClick={(e) => onEdit(item.id)}
            role="row"
            aria-selected={isSelected}
        >
            {/* Selection Trigger (Check Ring) */}
            <div
                className="selection-trigger"
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(item.id, e); // Pass event for shift+click range selection
                }}
            >
                <div className="selection-ring">
                    {/* SVG Checkmark */}
                     <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                </div>
            </div>

            {/* DYNAMIC CELLS */}
            {visibleColumns.map(colKey => (
                <div key={colKey}>
                    {colKey === 'title' && <CreativeCell item={item} />}
                    {colKey === 'stats' && <StatsCell item={item} />}
                    {colKey === 'trend' && <TrendCell item={item} isPublished={isPublished} trendData={trendData} />}
                    {colKey === 'schedule' && <ScheduleCell item={item} />}
                    {colKey === 'date' && <DateCell date={item.date} />}
                    {colKey === 'modified' && <DateCell date={item.modified} />}

                </div>
            ))}

            {/* Actions */}
            <div className="text-center" onClick={(e) => e.stopPropagation()}>
                <ActionDropdown
                    actions={[
                        { icon: edit, label: 'Edit', onClick: () => onEdit(item.id), variant: 'primary' },
                        {
                            icon: copy,
                            label: (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Duplicate
                                    {!isPro && <span className="pro-badge pro-badge--dropdown">PRO</span>}
                                </span>
                            ),
                            onClick: () => onDuplicate(item.id),
                            variant: 'primary'
                        },
                        { icon: AdvajraAnalyticsIcon, label: 'Analytics', onClick: () => navigate('/analytics'), variant: 'info' },
                        { divider: true },
                        { icon: trash, label: 'Delete', onClick: () => setTimeout(() => onDelete(item.id), 10), variant: 'danger' },
                    ]}
                />
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom Comparator
    // Only re-render if:
    // 1. Item at index changed (rare, usually data reference changes)
    // 2. Selection state for THIS index changed
    // 3. Grid Layout Changed (visibleColumns)

    if (prevProps.index !== nextProps.index) return false;

    // Check Grid Layout
    if (prevProps.data.gridTemplateColumns !== nextProps.data.gridTemplateColumns) return false;

    const prevItem = prevProps.data.items[prevProps.index];
    const nextItem = nextProps.data.items[nextProps.index];

    // If item data itself changed (e.g. title update)
    if (prevItem !== nextItem) return false;

    // If selection Set changed, we must check if THIS ID's status changed
    const id = prevItem.id;
    const prevSelected = prevProps.data.selectedIds.has(id);
    const nextSelected = nextProps.data.selectedIds.has(id);

    if (prevSelected !== nextSelected) return false;

    // Check if trends updated for this item
    const prevTrend = prevProps.data.trends ? prevProps.data.trends[id] : undefined;
    const nextTrend = nextProps.data.trends ? nextProps.data.trends[id] : undefined;
    if (prevTrend !== nextTrend) return false;

    // We assume 'actions' methods are stable refs (useMemo)
    return true; // Props are equal enough, do not re-render
});

// 3. ListView Component
// Selection state now received from parent (AdList.js)
const ListView = ({
    schema,
    data,
    visibleColumns,
    // Selection props from parent
    selectedIds,
    onSelect,
    // Action handlers from parent
    onEdit,
    onDelete,
    onDuplicate,
    isPro,
    trends = {},
}) => {
    const navigate = useNavigate();

    // Responsive sizing logic
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // ORDER MATTERS: Use COL_CONFIG keys as the source of truth for order
    const sortedColumns = useMemo(() => {
        const masterOrder = Object.keys(COL_CONFIG);
        return masterOrder.filter(key => visibleColumns.includes(key));
    }, [visibleColumns]);

    // CALCULATE DYNAMIC GRID
    const gridTemplateColumns = useMemo(() => {
        return [
            '20px', // Checkbox
            ...sortedColumns.map(key => getColWidth(key)),
            '48px' // Actions
        ].join(' ');
    }, [sortedColumns]);

    // Bundle data for virtualized rows
    const itemData = useMemo(() => ({
        items: data,
        selectedIds,
        actions: { onEdit, onDuplicate, onDelete, navigate, onSelect },
        isPro,
        visibleColumns: sortedColumns,
        gridTemplateColumns,
        trends
    }), [data, navigate, isPro, selectedIds, sortedColumns, gridTemplateColumns, onEdit, onDuplicate, onDelete, onSelect, trends]);

	return (
		<div className="glass-container rounded-2xl">
            {/* Styles removed (moved to SCSS) */}

            {/* The Ambient "Nebula" Background */}
            <div className="glass-ambient-layer">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

			<div
                className="glass-header glass-grid-layout"
                style={{ gridTemplateColumns }}
            >
                <div></div> {/* Checkbox Spacer */}

                {/* Dynamic Headers */}
                {sortedColumns.map(key => (
                    <div key={key} className={COL_CONFIG[key]?.align === 'center' ? 'text-center' : ''}>
                        {getColLabel(key)}
                    </div>
                ))}

                <div></div> {/* Actions Spacer */}
			</div>

            {/* Virtualized "Glass Deck" Container */}
			<div ref={containerRef} style={{ flex: 1, minHeight: 0, width: '100%', zIndex: 5, position: 'relative' }}>
                {dimensions.height > 0 && (
                    <List
                        style={{ height: dimensions.height, width: dimensions.width }}
                        height={dimensions.height}
                        width={dimensions.width}
                        rowCount={data.length}
                        rowHeight={76}
                        rowComponent={Row}
                        rowProps={{ data: itemData }}
                    />
                )}
			</div>

            {/* NOTE: Bulk HUD removed - now rendered by parent (AdList.js) */}
		</div>
	);
};

export default ListView;
