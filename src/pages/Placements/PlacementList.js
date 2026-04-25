/**
 * PlacementList.js
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button, Spinner, Icon, TextControl } from '@wordpress/components';
import { plus, edit, copy, trash, layout, paragraph, header, footer, code, widget, starFilled, starEmpty, external } from '@wordpress/icons';
import { useSelect, useDispatch } from '@wordpress/data';
import { Link, useNavigate } from 'react-router-dom';
import { STORE_NAME } from '../../store/constants';
import { __ } from '@wordpress/i18n';
import SmartSelect from '../../components/SmartSelect';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useSelection from '../../hooks/useSelection';
import BulkHUD from '../../components/BulkHUD';
import { useNotification } from '../../context/NotificationDataCtx';
import { PlacementStatusToggleIcon, PlacementsNavIcon } from '../../components/AdvajraIcons';

// Location type icons and labels
const LOCATION_CONFIG = {
    'before_content': { icon: header, label: 'Before Content', color: '#6366f1', pill: 'In Content' },
    'after_content': { icon: footer, label: 'After Content', color: '#8b5cf6', pill: 'In Content' },
    'after_paragraph': { icon: paragraph, label: 'After Paragraph', color: '#10b981', pill: 'In Content' },
    'header': { icon: header, label: 'Header', color: '#3b82f6', pill: 'Header' },
    'footer': { icon: footer, label: 'Footer', color: '#64748b', pill: 'Footer' },
    'shortcode': { icon: code, label: 'Shortcode', color: '#ec4899', pill: 'Manual' },
};

/**
 * Abstract schematic SVG showing placement position
 * Each type has a unique visual representation
 */
const PlacementSchematic = ({ type, color }) => {
    const schematics = {
        'before_content': (
            <svg viewBox="0 0 48 36" className="av-schematic">
                <rect x="2" y="2" width="44" height="6" rx="2" fill={color} opacity="0.9"/>
                <rect x="2" y="12" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="18" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="24" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="30" width="30" height="3" rx="1" fill="#e2e8f0"/>
            </svg>
        ),
        'after_content': (
            <svg viewBox="0 0 48 36" className="av-schematic">
                <rect x="2" y="2" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="8" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="14" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="20" width="30" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="28" width="44" height="6" rx="2" fill={color} opacity="0.9"/>
            </svg>
        ),
        'after_paragraph': (
            <svg viewBox="0 0 48 36" className="av-schematic">
                <rect x="2" y="2" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="8" width="30" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="14" width="44" height="5" rx="2" fill={color} opacity="0.9"/>
                <rect x="2" y="22" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="28" width="44" height="3" rx="1" fill="#e2e8f0"/>
            </svg>
        ),
        'header': (
            <svg viewBox="0 0 48 36" className="av-schematic">
                <rect x="2" y="2" width="44" height="8" rx="2" fill={color} opacity="0.9"/>
                <rect x="2" y="14" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="20" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="26" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="32" width="30" height="2" rx="1" fill="#e2e8f0"/>
            </svg>
        ),
        'footer': (
            <svg viewBox="0 0 48 36" className="av-schematic">
                <rect x="2" y="2" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="8" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="14" width="30" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="20" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="26" width="44" height="8" rx="2" fill={color} opacity="0.9"/>
            </svg>
        ),
        'shortcode': (
            <svg viewBox="0 0 48 36" className="av-schematic">
                <rect x="2" y="2" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="8" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="8" y="14" width="32" height="8" rx="3" fill={color} opacity="0.9" strokeDasharray="3 2" stroke={color}/>
                <text x="24" y="20" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="bold">[ad]</text>
                <rect x="2" y="26" width="44" height="3" rx="1" fill="#e2e8f0"/>
                <rect x="2" y="32" width="30" height="2" rx="1" fill="#e2e8f0"/>
            </svg>
        ),
    };
    return schematics[type] || schematics['before_content'];
};

// Status badge component
const StatusBadge = ({ status }) => {
    const config = {
        active: { label: 'Active', className: 'av-badge-success' },
        disabled: { label: 'Disabled', className: 'av-badge-muted' },
        empty: { label: 'Empty', className: 'av-badge-warning' },
    };
    const { label, className } = config[status] || config.disabled;
    return (
        <span className={`av-badge ${className}`}>
            {status === 'empty' && <span className="av-pulse-dot" />}
            {label}
        </span>
    );
};

// Format relative time (e.g., "2h ago", "3d ago", "Feb 6, 2026")
const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

// Content types that show a position label (non-content types rely on the pill badge)
const CONTENT_TYPES = ['before_content', 'after_content', 'after_paragraph'];

// Single placement card
const PlacementCard = ({ placement, ads, groups = [], onDuplicate, onToggle, onDelete, onAssign, onPin, isSelected = false, onSelect, addNotification }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const isPro = window.advajraSettings?.isPro || false;

    // Selection ring when selected
    const selectionRingStyle = isSelected ? {
        boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.5), 0 12px 40px rgba(0, 0, 0, 0.15)',
    } : {};

    const checkboxBg = isSelected ? { background: '#10b981', borderColor: '#10b981' } : {};
    const pluginUrl = window.advajraSettings?.pluginUrl || '';
    const locationType = placement.type || 'before_content';
    const locationConfig = LOCATION_CONFIG[locationType] || LOCATION_CONFIG['before_content'];

    // Determine status from placement or by checking item_id
    const itemId = placement.item_id ? parseInt(placement.item_id, 10) : null;
    const itemType = placement.item_type || 'ad';
    let status = 'active';
    if (placement.status === 'disabled' || placement.disabled) status = 'disabled';
    else if (placement.status === 'empty' || !itemId) status = 'empty';

    // Get title helper — use raw (plain text from DB)
    const getTitle = (item) => {
        if (!item?.title) return 'Untitled';
        if (typeof item.title === 'string') return item.title;
        return item.title.raw || 'Untitled';
    };

    // Position label
    let positionLabel = locationConfig.label;
    if (locationType === 'after_paragraph' && placement.args?.paragraph) {
        positionLabel = `After Paragraph ${placement.args.paragraph}`;
    }

    // Build options for dropdown with section headers
    const itemOptions = [
        { label: '— No Ad Assigned —', value: '' },
        // Ads section
        ...(ads.length > 0 ? [
            { label: '📢 ADS', value: '__header_ads__', isHeader: true },
            ...ads.map(ad => ({
                label: getTitle(ad),
                value: `ad:${ad.id}`,
            })),
        ] : []),
        // Groups section
        ...(groups.length > 0 ? [
            { label: '📁 GROUPS', value: '__header_groups__', isHeader: true },
            ...groups.map(g => ({
                label: getTitle(g),
                value: `group:${g.id}`,
            })),
        ] : []),
    ];

    // Current value for SmartSelect
    const currentValue = itemId ? `${itemType}:${itemId}` : '';

    const handleAssignChange = (value) => {
        if (value === '') {
            // Clear assignment
            onAssign(placement, 'ad', null);
        } else {
            const [type, id] = value.split(':');
            onAssign(placement, type, parseInt(id, 10));
        }
    };

    const handleCopyShortcode = async () => {
        const shortcode = `[advajra placement="${placement.id}"]`;

        try {
            await navigator.clipboard.writeText(shortcode);
            addNotification?.({ type: 'success', message: 'Shortcode copied to clipboard.' });
        } catch {
            try {
                const ta = document.createElement('textarea');
                ta.value = shortcode;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                addNotification?.({ type: 'success', message: 'Shortcode copied to clipboard.' });
            } catch {
                addNotification?.({ type: 'error', message: 'Failed to copy shortcode. Please try again.' });
            }
        }
    };

    return (
        <div
            className={`av-placement-card-v2 ${status === 'empty' ? 'is-empty' : ''} ${status === 'disabled' ? 'is-disabled' : ''} ${isDropdownOpen ? 'has-dropdown-open' : ''} ${isSelected ? 'is-selected' : ''}`}
            style={selectionRingStyle}
        >
            {/* Selection Checkbox */}
            <div
                className={`av-card-checkbox ${isSelected ? 'checked' : ''}`}
                style={checkboxBg}
                onClick={(e) => { e.stopPropagation(); onSelect && onSelect(placement.id, e); }}
            >
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            </div>

            {/* Header */}
            <div className="av-card-header-v2">
                <div className="av-schematic-box" style={{ '--accent-color': locationConfig.color }}>
                    <PlacementSchematic type={locationType} color={locationConfig.color} />
                </div>
                <div className="av-header-meta">
                    <span className="av-placement-type-tag" style={{ backgroundColor: `${locationConfig.color}18`, color: locationConfig.color }}>
                        {locationConfig.pill}
                    </span>
                    <StatusBadge status={status} />
                </div>
            </div>

            {/* Main Content */}
            <div className="av-card-body-v2">
                <div className="av-card-title-row">
                    <h3 className="av-card-title" title={placement.name}>{placement.name}</h3>
                    <button
                        className={`av-pin-btn ${placement.is_pinned ? 'is-pinned' : ''}`}
                        onClick={() => onPin(placement)}
                        title={placement.is_pinned ? 'Unpin' : 'Pin to top'}
                    >
                        <Icon icon={placement.is_pinned ? starFilled : starEmpty} size={16} />
                    </button>
                </div>
                {CONTENT_TYPES.includes(locationType) && (
                    <p className="av-card-position">
                        <Icon icon={locationConfig.icon} size={14} />
                        <span>{positionLabel}</span>
                    </p>
                )}
                {placement.updated_at && (
                    <p className="av-card-updated">Updated {formatRelativeTime(placement.updated_at)}</p>
                )}
            </div>

            {/* Ad Selector - Always Visible */}
            <div className="av-ad-selector-v2">
                <span className="av-selector-label">Displays</span>
                <SmartSelect
                    options={itemOptions}
                    value={currentValue}
                    onChange={handleAssignChange}
                    onOpenChange={setIsDropdownOpen}
                    className="av-inline-select"
                />
            </div>

            {/* Action Bar */}
            <div className="av-card-actions-v2">
                <Link to={`/placements/${placement.id}`} className="av-action-btn av-action-edit" title="Edit placement">
                    <Icon icon={edit} size={15} />
                    <span>Edit</span>
                </Link>
                <a
                    href={`${window.location.origin}/?advajra_preview=${placement.id}&advajra_preview_nonce=${window.advajraSettings.previewNonce}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="av-action-btn av-action-preview"
                    title="Preview on site"
                >
                    <Icon icon={external} size={15} />
                </a>
                <button
                    className="av-action-btn"
                    onClick={isPro ? () => onDuplicate(placement) : undefined}
                    disabled={!isPro}
                    title={isPro ? 'Duplicate' : 'Duplicate (PRO)'}
                >
                    <Icon icon={copy} size={15} />
                    {!isPro && <span className="pro-badge">PRO</span>}
                </button>
                <button
                    className="av-action-btn"
                    onClick={() => onToggle(placement)}
                    title={status === 'disabled' ? 'Enable' : 'Disable'}
                >
                    <PlacementStatusToggleIcon size={15} />
                </button>
                {locationType === 'shortcode' && (
                    <button
                        className="av-action-btn av-action-shortcode"
                        onClick={handleCopyShortcode}
                        title="Copy shortcode"
                        aria-label="Copy shortcode"
                    >
                        <Icon icon={code} size={15} />
                        <span className="av-action-shortcode-label">SC</span>
                    </button>
                )}
                <button
                    className="av-action-btn av-action-delete"
                    onClick={() => onDelete(placement)}
                    title="Delete"
                >
                    <Icon icon={trash} size={15} />
                </button>
            </div>
        </div>
    );
};

// Empty state component
const EmptyState = () => (
    <div className="advajra-empty-state">
        <div className="empty-icon">
            <PlacementsNavIcon size={32} />
        </div>
        <h2>Create Your First Placement</h2>
        <p>Placements control where your ads appear on your site.</p>
        <Link to="/placements/new">
            <Button variant="primary" className="av-btn-primary av-btn-create">
                <Icon icon={plus} /> Create Placement
            </Button>
        </Link>
    </div>
);

// Main component
const PlacementList = () => {
    useDocumentTitle('Placements');
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const isPro = window.advajraSettings?.isPro || false;
    const [search, setSearch] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // ── Data from centralised store ──
    const { placements, ads, groups, isLoading } = useSelect( ( select ) => {
        const store = select( STORE_NAME );
        return {
            placements: store.getPlacements(),
            ads:        store.getAds(),
            groups:     store.getGroups(),
            isLoading:  ! store.hasLoadedPlacements() || ! store.hasLoadedAds() || ! store.hasLoadedGroups(),
        };
    }, [] );

    const {
        savePlacement,
        createPlacement,
        deletePlacement: dispatchDelete,
        duplicatePlacement: dispatchDuplicate,
        updateEntityRecord,
    } = useDispatch( STORE_NAME );

    // Actions
    const handleDuplicate = async (placement) => {
        if (!isPro) {
            window.open('https://advajra.com/pricing', '_blank');
            return;
        }
        try {
            const result = await dispatchDuplicate(placement);

            if (result?.success && result?.data?.id) {
                addNotification(__('Placement duplicated!', 'advajra'), 'success');
                return;
            }

            addNotification(
                result?.reason ? `${__('Failed to duplicate placement:', 'advajra')} ${result.reason}` : __('Failed to duplicate placement.', 'advajra'),
                'error'
            );
        } catch (err) {
            console.error(err);
            addNotification(
                err?.message ? `${__('Failed to duplicate placement:', 'advajra')} ${err.message}` : __('Failed to duplicate placement.', 'advajra'),
                'error'
            );
        }
    };

    const handleToggle = async (placement) => {
        const isCurrentlyDisabled = placement.status === 'disabled' || placement.disabled;
        const newStatus = isCurrentlyDisabled ? (placement.item_id ? 'active' : 'empty') : 'disabled';

        // Optimistic update via store
        updateEntityRecord('placements', placement.id, { status: newStatus, disabled: newStatus === 'disabled' });

        try {
            await savePlacement(placement.id, { status: newStatus });
        } catch (err) {
            console.error(err);
            // Revert on failure
            updateEntityRecord('placements', placement.id, { status: placement.status, disabled: placement.disabled });
        }
    };

    const handleDelete = async (placement) => {
        if (!window.confirm('Delete this placement?')) return;

        try {
            await dispatchDelete(placement.id);
        } catch (err) {
            console.error(err);
            alert('Failed to delete placement');
        }
    };

    // Assign ad/group to placement
    const handleAssign = async (placement, itemType, itemId) => {
        // Optimistic update via store
        updateEntityRecord('placements', placement.id, {
            item_type: itemType,
            item_id: itemId,
            status: 'active',
        });

        try {
            await savePlacement(placement.id, {
                item_type: itemType,
                item_id: itemId,
                status: 'active',
            });
        } catch (err) {
            console.error(err);
            // Revert
            updateEntityRecord('placements', placement.id, {
                item_type: placement.item_type,
                item_id: placement.item_id,
                status: placement.status,
            });
            alert('Failed to assign ad');
        }
    };

    // Pin/unpin placement
    const handlePin = async (placement) => {
        const newPinned = !placement.is_pinned;
        // Optimistic update via store
        updateEntityRecord('placements', placement.id, { is_pinned: newPinned });

        try {
            await savePlacement(placement.id, { is_pinned: newPinned });
        } catch (err) {
            console.error(err);
            updateEntityRecord('placements', placement.id, { is_pinned: placement.is_pinned });
        }
    };

    // Filtered placements - newest first
    const filteredPlacements = useMemo(() => {
        return placements.filter(p => {
            // Search
            if (search && !(p.name || '').toLowerCase().includes(search.toLowerCase())) {
                return false;
            }
            // Location filter
            if (filterLocation && p.type !== filterLocation) {
                return false;
            }
            // Status filter
            if (filterStatus) {
                const status = p.disabled ? 'disabled' : (!p.item_id ? 'empty' : 'active');
                if (status !== filterStatus) return false;
            }
            return true;
        }).sort((a, b) => {
            // Pinned items first, then newest
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return b.id - a.id; // Newest first
        });
    }, [placements, search, filterLocation, filterStatus]);

    // ── Bulk Selection ──
    const selection = useSelection(filteredPlacements);

    // Keyboard shortcuts for selection
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                selection.selectAll();
            }
            if (e.key === 'Escape') {
                selection.clear();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection]);

    // Bulk Handlers
    const handleBulkDelete = useCallback(async () => {
        if (!selection.hasSelection) return;
        if (window.confirm(`${__('Delete', 'advajra')} ${selection.selectedCount} ${__('placement(s)?', 'advajra')}`)) {
            const promises = Array.from(selection.selectedIds).map(id => dispatchDelete(id));
            await Promise.all(promises);
            selection.clear();
        }
    }, [selection, dispatchDelete]);

    const handleBulkDuplicate = useCallback(async () => {
        if (!selection.hasSelection) return;
        if (!isPro) {
            window.open('https://advajra.com/pricing', '_blank');
            return;
        }

        let duplicatedCount = 0;

        for (const id of selection.selectedIds) {
            const p = placements.find(pl => pl.id === id);
            if (!p) {
                continue;
            }

            const result = await dispatchDuplicate(p);

            if (!result?.success || !result?.data?.id) {
                addNotification(
                    result?.reason ? `${__('Failed to duplicate placement:', 'advajra')} ${result.reason}` : __('Failed to duplicate placement.', 'advajra'),
                    'error'
                );
                return;
            }

            duplicatedCount += 1;
        }

        if (duplicatedCount > 0) {
            addNotification(
                duplicatedCount === 1
                    ? __('Placement duplicated!', 'advajra')
                    : `${duplicatedCount} ${__('placements duplicated!', 'advajra')}`,
                'success'
            );
        }

        selection.clear();
    }, [selection, placements, dispatchDuplicate, isPro, addNotification]);

    const handleBulkToggle = useCallback(async () => {
        if (!selection.hasSelection) return;
        for (const id of selection.selectedIds) {
            const p = placements.find(pl => pl.id === id);
            if (!p) continue;
            const isCurrentlyDisabled = p.status === 'disabled' || p.disabled;
            const newStatus = isCurrentlyDisabled ? (p.item_id ? 'active' : 'empty') : 'disabled';

            // Optimistic update
            updateEntityRecord('placements', id, { status: newStatus, disabled: newStatus === 'disabled' });
            savePlacement(id, { status: newStatus }).catch(() => {
                // Revert on failure
                updateEntityRecord('placements', id, { status: p.status, disabled: p.disabled });
            });
        }
        selection.clear();
    }, [selection, placements, updateEntityRecord, savePlacement]);

    if (isLoading) {
        return (
            <div className="av-loading-container">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="av-placements-page">
            {placements.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    {/* Toolbar: Search left, Filters + Button right */}
                    <div className="av-toolbar">
                        <div className="av-toolbar-search">
                            <TextControl
                                value={search}
                                onChange={setSearch}
                                placeholder="Search placements..."
                                type="search"
                                hideLabelFromVision
                            />
                        </div>
                        <div className="av-toolbar-filters">
                            <SmartSelect
                                value={filterLocation}
                                onChange={setFilterLocation}
                                options={[
                                    { label: 'All Positions', value: '' },
                                    { label: 'Before Content', value: 'before_content' },
                                    { label: 'After Content', value: 'after_content' },
                                    { label: 'After Paragraph', value: 'after_paragraph' },
                                    { label: 'Header', value: 'header' },
                                    { label: 'Footer', value: 'footer' },
                                    { label: 'Shortcode', value: 'shortcode' },
                                ]}
                                className="w-44"
                            />
                            <SmartSelect
                                value={filterStatus}
                                onChange={setFilterStatus}
                                options={[
                                    { label: 'All Status', value: '' },
                                    { label: 'Active', value: 'active' },
                                    { label: 'Disabled', value: 'disabled' },
                                    { label: 'Empty', value: 'empty' },
                                ]}
                                className="w-36"
                            />
                            <Link to="/placements/new">
                                <Button variant="primary" className="av-btn-primary av-btn-create">
                                    <Icon icon={plus} size={18} /> Create Placement
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Card Grid */}
                    <div className="av-placement-grid">
                        {filteredPlacements.length === 0 ? (
                            <div className="av-no-results">
                                <p>No placements match your filters.</p>
                            </div>
                        ) : (
                            filteredPlacements.map(placement => (
                                <PlacementCard
                                    key={placement.id}
                                    placement={placement}
                                    ads={ads}
                                    groups={groups}
                                    onDuplicate={handleDuplicate}
                                    onToggle={handleToggle}
                                    onDelete={handleDelete}
                                onAssign={handleAssign}
                                onPin={handlePin}
                                isSelected={selection.isSelected(placement.id)}
                                onSelect={selection.toggle}
                                addNotification={addNotification}
                            />
                            ))
                        )}
                    </div>

                    {/* Bulk Action HUD — Portal to body so position:fixed works regardless of parent transforms */}
                    {createPortal(
                        <BulkHUD
                            selectedCount={selection.selectedCount}
                            totalCount={filteredPlacements.length}
                            isAllSelected={selection.isAllSelected}
                            onSelectAll={selection.selectAll}
                            onClear={selection.clear}
                            onDuplicate={handleBulkDuplicate}
                            onDelete={handleBulkDelete}
                            isPro={isPro}
                            customActions={[{
                                icon: PlacementStatusToggleIcon,
                                label: __('Toggle', 'advajra'),
                                onClick: handleBulkToggle,
                            }]}
                        />,
                        document.body
                    )}
                </>
            )}
        </div>
    );
};

export default PlacementList;
