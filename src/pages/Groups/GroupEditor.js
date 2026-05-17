/**
 * GroupEditor.js
 *
 * Two-column deck builder for group editing.
 * Left = Available Ads (compact), Right = Group Stack
 * Bottom = Distribution Visualiser + Rotation Mode
 *
 * Supports weighted pool model:
 *   ads = [ { id: 5, weight: 10 }, { id: 12, weight: 20 }, ... ]
 *   rotation = 'random' | 'weighted' | 'ordered'
 */

import { __ } from '@wordpress/i18n';
import { useState, useEffect, useMemo } from '@wordpress/element';
import { Button, Icon } from '@wordpress/components';
import { arrowLeft, chevronLeft, plus, trash, menu, shuffle, pages } from '@wordpress/icons';
import { useSelect, useDispatch } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { useParams, useNavigate } from 'react-router-dom';
import { STORE_NAME } from '../../store/constants';
import { useNotification } from '../../context/NotificationDataCtx';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { SaveActionIcon } from '../../components/AdvajraIcons';
import useDirtyState from '../../hooks/useDirtyState';

// Rotation mode definitions with explanations.
const ROTATION_MODES = [
    {
        id: 'random',
        label: __( 'Random', 'advajra' ),
        shortDesc: __( 'Equal chance', 'advajra' ),
        desc: __( 'Each page load picks one ad with equal probability. Weights are ignored.', 'advajra' ),
        icon: '🎲',
    },
    {
        id: 'weighted',
        label: __( 'Weighted', 'advajra' ),
        shortDesc: __( 'By weight', 'advajra' ),
        desc: __( 'Higher weight = more impressions. Set 70 and 30 for a 70/30 split.', 'advajra' ),
        icon: '⚖️',
    },
    {
        id: 'ordered',
        label: __( 'Ordered', 'advajra' ),
        shortDesc: __( 'Sequential', 'advajra' ),
        desc: __( 'Cycles through ads in order: 1 → 2 → 3 → 1… Equal distribution guaranteed.', 'advajra' ),
        icon: '📋',
    },
];

// Distribution colors — brand-aligned palette (navy-gold-teal family)
const DIST_COLORS = [
    '#0f1c2e', '#edaf03', '#10b981', '#3b82f6',
    '#f59e0b', '#1f2e44', '#14b8a6', '#ef4444',
];

const DEFAULT_WEIGHT = 10;

const GroupEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const isNew = !id || id === 'new';

    const moduleId = isNew ? 'group-editor-new' : `group-editor-${ id }`;
    const { markDirty, clearDirty } = useDirtyState( moduleId );

    // State
    const [groupName, setGroupName] = useState('');

    useDocumentTitle(isNew ? 'New Group' : (groupName || 'Edit Group'));
    const [rotation, setRotation] = useState('random');
    const [groupAds, setGroupAds] = useState([]); // Array of { id, weight }
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [draggedAd, setDraggedAd] = useState(null);

    // ── Data from centralised store ──
    const { allAds, cachedGroup, isStoreLoaded } = useSelect( ( select ) => {
        const store = select( STORE_NAME );
        return {
            allAds:        store.getAds(),
            cachedGroup:   ! isNew ? store.getGroup( parseInt( id, 10 ) ) : null,
            isStoreLoaded: store.hasLoadedAds(),
        };
    }, [ id, isNew ] );

    const {
        saveGroup: dispatchSave,
        receiveEntity,
    } = useDispatch( STORE_NAME );

    // Hydrate local form state from store cache (or fetch single if missing)
    useEffect( () => {
        const hydrate = async () => {
            setIsLoading( true );

            if ( ! isStoreLoaded ) {
                return; // Wait for ads to load first.
            }

            if ( ! isNew ) {
                let group = cachedGroup;
                if ( ! group ) {
                    group = await apiFetch( { path: `/advajra/v1/groups/${ id }` } ).catch( () => null );
                    if ( group ) {
                        receiveEntity( 'groups', group );
                    }
                }
                if ( group ) {
                    setGroupName( group.title || '' );
                    setRotation( group.rotation || 'random' );
                    // Ensure ads are in weighted format
                    const ads = (group.ads || []).map( entry => ({
                        id: typeof entry === 'object' ? entry.id : entry,
                        weight: typeof entry === 'object' ? (entry.weight || DEFAULT_WEIGHT) : DEFAULT_WEIGHT,
                    }));
                    setGroupAds( ads );
                }
            }

            setIsLoading( false );
        };

        hydrate();
    }, [ id, isNew, isStoreLoaded, cachedGroup ] );

    // Get ad by ID
    const getAd = (adId) => allAds.find(ad => ad.id === adId);

    // Helper to get ad title (handles object or string)
    const getAdTitle = (ad) => {
        if (!ad || !ad.title) return 'Untitled';
        if (typeof ad.title === 'object') {
            return ad.title.raw || 'Untitled';
        }
        return ad.title;
    };

    // Available ads (not in group, filtered by search)
    const availableAds = allAds.filter(ad => {
        const inGroup = groupAds.some(g => g.id === ad.id);
        const title = getAdTitle(ad);
        const matchSearch = title.toLowerCase().includes(search.toLowerCase());
        return !inGroup && matchSearch;
    });

    // ── Weight calculations ──
    const totalWeight = useMemo( () =>
        groupAds.reduce( ( sum, entry ) => sum + entry.weight, 0 )
    , [ groupAds ] );

    const getPercentage = ( weight ) => {
        if ( totalWeight === 0 ) return 0;
        return Math.round( ( weight / totalWeight ) * 100 );
    };

    // ── Confetti ──
    const triggerConfetti = () => {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(container);

        const colors = ['#0f1c2e', '#edaf03', '#10b981', '#3b82f6', '#f59e0b', '#1f2e44'];

        for (let i = 0; i < 60; i++) {
            const particle = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 12 + 6;
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 300 + 150;
            const x = Math.cos(angle) * velocity;
            const y = Math.sin(angle) * velocity - 150;
            const rot = Math.random() * 720 - 360;
            const delay = Math.random() * 0.15;

            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
                animation: confettiExplode 1.2s ease-out ${delay}s forwards;
                --x: ${x}px;
                --y: ${y}px;
                --rotation: ${rot}deg;
            `;
            container.appendChild(particle);
        }

        setTimeout(() => container.remove(), 1800);
    };

    // Save group
    const saveGroup = async () => {
        if (!groupName.trim()) {
            addNotification('Please enter a group name', 'warning');
            return;
        }

        setIsSaving(true);

        try {
            const data = {
                title: groupName,
                rotation: rotation,
                ads: groupAds,
            };

            const result = await dispatchSave( isNew ? null : id, data );

            clearDirty();

            if ( isNew ) {
                triggerConfetti();
                addNotification('Group created! 🎉', 'success');
                setTimeout(() => {
                    navigate(`/groups/${ result.id }`);
                }, 800);
            } else {
                addNotification('Group saved!', 'success');
            }
        } catch (error) {
            console.error(error);
            addNotification('Error saving group', 'error');
        }

        setIsSaving(false);
    };

    // Add ad to group
    const addToGroup = (adId) => {
        if (!groupAds.some(g => g.id === adId)) {
            setGroupAds([...groupAds, { id: adId, weight: DEFAULT_WEIGHT }]);
            markDirty();
        }
    };

    // Remove ad from group
    const removeFromGroup = (adId) => {
        setGroupAds(groupAds.filter(entry => entry.id !== adId));
        markDirty();
    };

    // Update weight
    const updateWeight = (adId, newWeight) => {
        const clamped = Math.max(1, Math.min(100, parseInt(newWeight, 10) || 1));
        setGroupAds(groupAds.map(entry =>
            entry.id === adId ? { ...entry, weight: clamped } : entry
        ));
        markDirty();
    };

    // Move ad in group (reorder)
    const moveAd = (fromIndex, toIndex) => {
        const newAds = [...groupAds];
        const [moved] = newAds.splice(fromIndex, 1);
        newAds.splice(toIndex, 0, moved);
        setGroupAds(newAds);
        markDirty();
    };

    // Drag handlers for available ads
    const handleDragStart = (e, adId) => {
        setDraggedAd(adId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedAd(null);
    };

    // Drop handler for group stack
    const handleDropOnStack = (e) => {
        e.preventDefault();
        if (draggedAd && !groupAds.some(g => g.id === draggedAd)) {
            addToGroup(draggedAd);
        }
        setDraggedAd(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="group-editor">
                <div className="flex items-center justify-center p-16">
                    <div className="av-spinner" />
                </div>
            </div>
        );
    }

    // Should we show weight column
    const showWeights = rotation === 'weighted';

    return (
        <div className="group-editor">
            {/* ════ HEADER (matches AdEditor toolbar) ════ */}
            <div className="advajra-editor-toolbar">
                <div className="toolbar-left items-center">
                    <Button
                        icon={chevronLeft}
                        className="back-btn"
                        onClick={() => {
                            if ( window.__advajraGuardedNavigate ) {
                                window.__advajraGuardedNavigate('/groups');
                            } else {
                                navigate('/groups');
                            }
                        }}
                        label={__('Back to Groups', 'advajra')}
                    />
                    <div className="ad-identity-group">
                        <input
                            type="text"
                            className="av-toolbar-input"
                            value={groupName}
                            onChange={(e) => { setGroupName(e.target.value); markDirty(); }}
                            placeholder={__('Group Name...', 'advajra')}
                            autoFocus={isNew}
                        />
                    </div>
                </div>
                <div className="toolbar-right">
                    <Button
                        isPrimary
                        className="save-btn"
                        isBusy={isSaving}
                        onClick={saveGroup}
                    >
                        <SaveActionIcon size={16} />
                        <span>{isSaving ? __('Saving...', 'advajra') : __('Save Group', 'advajra')}</span>
                    </Button>
                </div>
            </div>

            {/* ════ MAIN CANVAS ════ */}
            <div className="ge-canvas">

                {/* ── LEFT: Available Ads ── */}
                <div className="ge-pool">
                    <div className="ge-pool-header">
                        <h3 className="ge-pool-title">
                            {__('Available Ads', 'advajra')}
                        </h3>
                        <span className="ge-pool-count">{availableAds.length}</span>
                    </div>

                    <div className="ge-pool-search">
                        <input
                            type="text"
                            placeholder={__('Search ads...', 'advajra')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="ge-pool-list">
                        {availableAds.length === 0 ? (
                            <div className="ge-pool-empty">
                                {search ? __('No ads match your search', 'advajra') : __('All ads are in this group', 'advajra')}
                            </div>
                        ) : (
                            availableAds.map((ad) => (
                                <div
                                    key={ad.id}
                                    className={`ge-pool-item ${draggedAd === ad.id ? 'dragging' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, ad.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => addToGroup(ad.id)}
                                >
                                    <div className="ge-pool-item-thumb">
                                        {ad.image ? (
                                            <img src={ad.image} alt="" />
                                        ) : (
                                            <span className="ge-pool-item-icon">
                                                <Icon icon={pages} size={14} />
                                            </span>
                                        )}
                                    </div>
                                    <span className="ge-pool-item-name">{getAdTitle(ad)}</span>
                                    <span className="ge-pool-item-add">+</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Group Stack + Controls ── */}
                <div className="ge-main">

                    {/* Stack */}
                    <div className="ge-stack-section">
                        <div className="ge-stack-header">
                            <h3 className="ge-stack-title">
                                {__('Group Stack', 'advajra')}
                            </h3>
                            <span className="ge-stack-count">{groupAds.length} {__('ads', 'advajra')}</span>
                        </div>

                        <div
                            className={`ge-stack-list ${draggedAd ? 'drag-active' : ''}`}
                            onDrop={handleDropOnStack}
                            onDragOver={handleDragOver}
                        >
                            {groupAds.length === 0 ? (
                                <div className={`drop-zone ${draggedAd ? 'active' : ''}`}>
                                    <Icon icon={plus} />
                                    <div>{__('Drag ads here or click them to add', 'advajra')}</div>
                                </div>
                            ) : (
                                <>
                                    {/* Column header */}
                                    {showWeights && (
                                        <div className="ge-stack-colheader">
                                            <span className="ge-colh-ad">{__('Ad', 'advajra')}</span>
                                            <span className="ge-colh-weight">{__('Weight', 'advajra')}</span>
                                            <span className="ge-colh-share">{__('Share', 'advajra')}</span>
                                        </div>
                                    )}

                                    {groupAds.map((entry, index) => {
                                        const ad = getAd(entry.id);
                                        if (!ad) return null;

                                        const pct = getPercentage(entry.weight);
                                        const color = DIST_COLORS[index % DIST_COLORS.length];

                                        return (
                                            <div
                                                key={entry.id}
                                                className="ge-stack-item"
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('text/plain', index.toString());
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                                    if (!isNaN(fromIndex) && fromIndex !== index) {
                                                        moveAd(fromIndex, index);
                                                    }
                                                }}
                                                onDragOver={(e) => e.preventDefault()}
                                            >
                                                <div className="ge-stack-grip">
                                                    <Icon icon={menu} size={16} />
                                                </div>
                                                <span className="ge-stack-num">{index + 1}</span>
                                                <div className="ge-stack-thumb">
                                                    {ad.image ? (
                                                        <img src={ad.image} alt="" />
                                                    ) : (
                                                        <span className="ge-stack-thumb-icon">
                                                            <Icon icon={pages} size={14} />
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="ge-stack-info">
                                                    <span className="ge-stack-name">{getAdTitle(ad)}</span>
                                                    <span className="ge-stack-meta">{ad.type}</span>
                                                </div>

                                                {/* Weight control */}
                                                {showWeights && (
                                                    <div className="ge-weight-cell">
                                                        <input
                                                            type="number"
                                                            className="ge-weight-input"
                                                            value={entry.weight}
                                                            onChange={(e) => updateWeight(entry.id, e.target.value)}
                                                            min={1}
                                                            max={100}
                                                        />
                                                        <span className="ge-weight-pct">{pct}%</span>
                                                    </div>
                                                )}

                                                <button
                                                    className="ge-stack-remove"
                                                    onClick={() => removeFromGroup(entry.id)}
                                                    title={__('Remove', 'advajra')}
                                                >
                                                    <Icon icon={trash} size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {/* Drop zone at bottom when dragging */}
                                    {draggedAd && (
                                        <div className="drop-zone active ge-drop-mini">
                                            <span>+</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ════ ROTATION MODE ════ */}
                    <div className="ge-rotation-section">
                        <h3 className="ge-section-title">{__('Rotation Mode', 'advajra')}</h3>
                        <div className="ge-rotation-grid">
                            {ROTATION_MODES.map((mode) => (
                                <button
                                    key={mode.id}
                                    className={`ge-rot-card ${rotation === mode.id ? 'active' : ''}`}
                                    onClick={() => { setRotation(mode.id); markDirty(); }}
                                >
                                    <span className="ge-rot-icon">{mode.icon}</span>
                                    <span className="ge-rot-label">{mode.label}</span>
                                    <span className="ge-rot-short">{mode.shortDesc}</span>
                                    <span className="ge-rot-desc">{mode.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ════ DISTRIBUTION VISUALISER ════ */}
                    {groupAds.length > 1 && (
                        <div className="ge-dist-section">
                            <div className="ge-dist-header">
                                <h3 className="ge-section-title">{__('Impression Distribution', 'advajra')}</h3>
                                <span className="ge-dist-tag">
                                    {rotation === 'random' && __('Equal split', 'advajra')}
                                    {rotation === 'weighted' && __('Weight-based', 'advajra')}
                                    {rotation === 'ordered' && __('Sequential', 'advajra')}
                                </span>
                            </div>

                            <div className="ge-dist-ring-wrap">
                                {/* Donut Ring */}
                                <div className="ge-dist-ring">
                                    <svg viewBox="0 0 100 100" className="ge-dist-svg">
                                        {(() => {
                                            let cumulative = 0;
                                            const total = rotation === 'weighted' ? totalWeight : groupAds.length;

                                            return groupAds.map((entry, i) => {
                                                const share = rotation === 'weighted'
                                                    ? entry.weight / total
                                                    : 1 / groupAds.length;
                                                const startAngle = cumulative * 360;
                                                const endAngle = (cumulative + share) * 360;
                                                cumulative += share;

                                                const startRad = ((startAngle - 90) * Math.PI) / 180;
                                                const endRad = ((endAngle - 90) * Math.PI) / 180;
                                                const largeArc = share > 0.5 ? 1 : 0;
                                                const r = 40;
                                                const cx = 50, cy = 50;

                                                const x1 = cx + r * Math.cos(startRad);
                                                const y1 = cy + r * Math.sin(startRad);
                                                const x2 = cx + r * Math.cos(endRad);
                                                const y2 = cy + r * Math.sin(endRad);

                                                return (
                                                    <path
                                                        key={entry.id}
                                                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                        fill={DIST_COLORS[i % DIST_COLORS.length]}
                                                        stroke="#fff"
                                                        strokeWidth="1.5"
                                                        className="ge-dist-slice"
                                                    />
                                                );
                                            });
                                        })()}
                                        <circle cx="50" cy="50" r="22" fill="#fff" />
                                        <text x="50" y="48" textAnchor="middle" className="ge-dist-center-num">
                                            {groupAds.length}
                                        </text>
                                        <text x="50" y="58" textAnchor="middle" className="ge-dist-center-label">
                                            ads
                                        </text>
                                    </svg>
                                </div>

                                {/* Legend with live bars */}
                                <div className="ge-dist-legend">
                                    {groupAds.map((entry, i) => {
                                        const ad = getAd(entry.id);
                                        const pct = rotation === 'weighted'
                                            ? getPercentage(entry.weight)
                                            : Math.round(100 / groupAds.length);
                                        const color = DIST_COLORS[i % DIST_COLORS.length];

                                        return (
                                            <div key={entry.id} className="ge-dist-leg-row">
                                                <span className="ge-dist-dot" style={{ backgroundColor: color }} />
                                                <span className="ge-dist-leg-name">{getAdTitle(ad)}</span>
                                                <div className="ge-dist-leg-bar-track">
                                                    <div
                                                        className="ge-dist-leg-bar-fill"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundColor: color,
                                                        }}
                                                    />
                                                </div>
                                                <span className="ge-dist-leg-pct">{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════ PRO FEATURES TEASER ════ */}
                    {!window.advajraSettings?.isPro && (
                        <div className="ge-pro-tease">
                            <div className="ge-pro-tease-inner">
                                <span className="ge-pro-badge">PRO</span>
                                <div className="ge-pro-text">
                                    <span className="ge-pro-title">{__('Unlock Advanced Rotation', 'advajra')}</span>
                                    <span className="ge-pro-desc">
                                        {__('Auto-refresh rotation, time-based scheduling, A/B test mode, and per-group analytics.', 'advajra')}
                                    </span>
                                </div>
                                <button className="ge-pro-cta" onClick={() => navigate('/settings')}>
                                    {__('Upgrade', 'advajra')} →
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default GroupEditor;
