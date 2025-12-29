/**
 * GroupEditor.js
 *
 * Two-column deck builder for group editing.
 * Left = Available Ads, Right = Group Stack
 * Drag-drop between columns, reorder within stack.
 */

import { __ } from '@wordpress/i18n';
import { useState, useEffect, useRef } from '@wordpress/element';
import { Icon, arrowLeft, plus, trash, menu, shuffle, pages } from '@wordpress/icons';
import { useSelect, useDispatch } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { useParams, useNavigate } from 'react-router-dom';
import { STORE_NAME } from '../../store/constants';
import { useNotification } from '../../context/NotificationDataCtx';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { SaveActionIcon } from '../../components/AdvajraIcons';

const GroupEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const isNew = !id || id === 'new';

    // State
    const [groupName, setGroupName] = useState('');

    useDocumentTitle(isNew ? 'New Group' : (groupName || 'Edit Group'));
    const [rotation, setRotation] = useState('random');
    const [groupAds, setGroupAds] = useState([]); // IDs in group
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
                    setGroupAds( group.ads || [] );
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
        const inGroup = groupAds.includes(ad.id);
        const title = getAdTitle(ad);
        const matchSearch = title.toLowerCase().includes(search.toLowerCase());
        return !inGroup && matchSearch;
    });

    // Trigger confetti explosion
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

        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

        for (let i = 0; i < 60; i++) {
            const particle = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 12 + 6;
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 300 + 150;
            const x = Math.cos(angle) * velocity;
            const y = Math.sin(angle) * velocity - 150;
            const rotation = Math.random() * 720 - 360;
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
                --rotation: ${rotation}deg;
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
                ads: groupAds
            };

            const result = await dispatchSave( isNew ? null : id, data );

            if ( isNew ) {
                // 🎉 Confetti on new group creation!
                triggerConfetti();
                addNotification('Group created! 🎉', 'success');

                // Navigate after a brief moment to see the confetti
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
        if (!groupAds.includes(adId)) {
            setGroupAds([...groupAds, adId]);
        }
    };

    // Remove ad from group
    const removeFromGroup = (adId) => {
        setGroupAds(groupAds.filter(id => id !== adId));
    };

    // Move ad in group (reorder)
    const moveAd = (fromIndex, toIndex) => {
        const newAds = [...groupAds];
        const [moved] = newAds.splice(fromIndex, 1);
        newAds.splice(toIndex, 0, moved);
        setGroupAds(newAds);
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
        if (draggedAd && !groupAds.includes(draggedAd)) {
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
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <div className="av-spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="group-editor">
            {/* Header Bar */}
            <div className="group-editor-header">
                <button
                    className="back-btn"
                    onClick={() => navigate('/groups')}
                    title={__('Back to Groups', 'advajra')}
                >
                    <Icon icon={arrowLeft} />
                </button>

                <input
                    type="text"
                    className="group-name-input"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder={__('Group Name...', 'advajra')}
                    autoFocus={isNew}
                />

                <button
                    className="av-btn av-btn-primary"
                    onClick={saveGroup}
                    disabled={isSaving}
                >
                    <SaveActionIcon size={16} />
                    <span style={{ marginLeft: '8px' }}>
                        {isSaving ? __('Saving...', 'advajra') : __('Save Group', 'advajra')}
                    </span>
                </button>
            </div>

            {/* Two Column Layout */}
            <div className="group-editor-columns">
                {/* Left Column: Available Ads */}
                <div className="editor-column">
                    <div className="column-header">
                        <h3>
                            📦 {__('Available Ads', 'advajra')}
                            <span className="count">{availableAds.length}</span>
                        </h3>
                    </div>

                    <div className="column-search">
                        <input
                            type="text"
                            placeholder={__('Search ads...', 'advajra')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="available-ads-list">
                        {availableAds.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                {search ? __('No ads match your search', 'advajra') : __('All ads are in this group', 'advajra')}
                            </div>
                        ) : (
                            availableAds.map((ad) => (
                                <div
                                    key={ad.id}
                                    className={`available-ad-item ${draggedAd === ad.id ? 'dragging' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, ad.id)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="ad-thumb">
                                        {ad.image ? (
                                            <img src={ad.image} alt="" />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Icon icon={pages} size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="ad-info">
                                        <div className="ad-name">{getAdTitle(ad)}</div>
                                        <div className="ad-type">{ad.type}</div>
                                    </div>
                                    <button
                                        className="add-btn"
                                        onClick={() => addToGroup(ad.id)}
                                        title={__('Add to group', 'advajra')}
                                    >
                                        <Icon icon={plus} size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Group Stack */}
                <div className="editor-column">
                    <div className="column-header">
                        <h3>
                            🎴 {__('Group Stack', 'advajra')}
                            <span className="count">{groupAds.length}</span>
                        </h3>
                    </div>

                    <div
                        className={`group-stack-list ${draggedAd ? 'drag-active' : ''}`}
                        onDrop={handleDropOnStack}
                        onDragOver={handleDragOver}
                    >
                        {groupAds.length === 0 ? (
                            <div className={`drop-zone ${draggedAd ? 'active' : ''}`}>
                                <Icon icon={plus} />
                                <div>{__('Drop ads here or click + to add', 'advajra')}</div>
                            </div>
                        ) : (
                            <>
                                {groupAds.map((adId, index) => {
                                    const ad = getAd(adId);
                                    if (!ad) return null;

                                    return (
                                        <div
                                            key={adId}
                                            className="group-ad-item"
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
                                            <div className="drag-handle">
                                                <Icon icon={menu} />
                                            </div>
                                            <div className="order-num">{index + 1}</div>
                                            <div className="ad-thumb">
                                                {ad.image ? (
                                                    <img src={ad.image} alt="" />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Icon icon={pages} size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ad-info">
                                                <div className="ad-name">{getAdTitle(ad)}</div>
                                                <div className="ad-meta">{ad.type} • {ad.status}</div>
                                            </div>
                                            <button
                                                className="remove-btn"
                                                onClick={() => removeFromGroup(adId)}
                                                title={__('Remove from group', 'advajra')}
                                            >
                                                <Icon icon={trash} size={14} />
                                            </button>
                                        </div>
                                    );
                                })}

                                {/* Drop zone at bottom when items exist */}
                                {draggedAd && (
                                    <div className={`drop-zone active`}>
                                        <Icon icon={plus} />
                                        <div>{__('Drop here', 'advajra')}</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Rotation Mode Selector */}
            <div className="rotation-selector">
                <label>{__('Rotation Mode:', 'advajra')}</label>
                <div className="rotation-options">
                    <button
                        className={`rotation-option ${rotation === 'random' ? 'active' : ''}`}
                        onClick={() => setRotation('random')}
                    >
                        <Icon icon={shuffle} />
                        {__('Random', 'advajra')}
                    </button>
                    <button
                        className={`rotation-option ${rotation === 'ordered' ? 'active' : ''}`}
                        onClick={() => setRotation('ordered')}
                    >
                        <Icon icon={pages} />
                        {__('Ordered', 'advajra')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupEditor;
