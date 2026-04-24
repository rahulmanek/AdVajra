/**
 * GroupList.js
 *
 * Stack Card visualization for ad groups.
 * Each group appears as a stack of ad thumbnails.
 * Toolbar layout matches PlacementList exactly.
 */

import { __ } from '@wordpress/i18n';
import { useState, useMemo } from '@wordpress/element';
import { Button, Icon, TextControl, Spinner } from '@wordpress/components';
import { plus, trash, copy, pages, shuffle } from '@wordpress/icons';
import { useSelect, useDispatch } from '@wordpress/data';
import { Link, useNavigate } from 'react-router-dom';
import { STORE_NAME } from '../../store/constants';
import { useNotification } from '../../context/NotificationDataCtx';
import SmartSelect from '../../components/SmartSelect';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const GroupList = () => {
    const [search, setSearch] = useState('');
    const [filterRotation, setFilterRotation] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const navigate = useNavigate();
    const { addNotification } = useNotification();

    // Check if PRO
    const isPro = window.advajraSettings?.isPro || false;

    useDocumentTitle('Groups');

    // ── Data from centralised store ──
    const { groups, ads, isLoading } = useSelect( ( select ) => {
        const store = select( STORE_NAME );
        return {
            groups:    store.getGroups(),
            ads:       store.getAds(),
            isLoading: ! store.hasLoadedGroups() || ! store.hasLoadedAds(),
        };
    }, [] );

    const {
        deleteGroup: dispatchDeleteGroup,
        duplicateGroup: dispatchDuplicateGroup,
    } = useDispatch( STORE_NAME );

    // Get ad by ID
    const getAd = (id) => ads.find(ad => ad.id === id);

    // Filtered groups
    const filteredGroups = useMemo(() => {
        return groups.filter(group => {
            // Search by name
            if (search && !(group.title || '').toLowerCase().includes(search.toLowerCase())) {
                return false;
            }
            // Filter by rotation type
            if (filterRotation && (group.rotation || 'random') !== filterRotation) {
                return false;
            }
            // Filter by status (empty = no ads, active = has ads)
            if (filterStatus) {
                const hasAds = group.ads && group.ads.length > 0;
                if (filterStatus === 'empty' && hasAds) return false;
                if (filterStatus === 'active' && !hasAds) return false;
            }
            return true;
        });
    }, [groups, search, filterRotation, filterStatus]);

    // Delete group
    const deleteGroup = (e, id) => {
        e.preventDefault();
        e.stopPropagation();

        setTimeout(() => {
            if (!window.confirm(__('Delete this group? Ads inside will NOT be deleted.', 'advajra'))) {
                return;
            }

            dispatchDeleteGroup(id).then(() => {
                addNotification('Group deleted', 'success');
            });
        }, 0);
    };

    // Duplicate group (PRO only)
    const duplicateGroup = (e, group) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isPro) return;

        dispatchDuplicateGroup(group).then(() => {
            addNotification('Group duplicated!', 'success');
        });
    };

    // Get rotation icon
    const getRotationIcon = (rotation) => {
        switch(rotation) {
            case 'random': return shuffle;
            case 'weighted': return pages;
            case 'ordered': return pages;
            default: return shuffle;
        }
    };

    // Get rotation label
    const getRotationLabel = (rotation) => {
        switch(rotation) {
            case 'random': return __('Random', 'advajra');
            case 'weighted': return __('Weighted', 'advajra');
            case 'ordered': return __('Ordered', 'advajra');
            default: return __('Random', 'advajra');
        }
    };

    // Get ad count (handles both flat and weighted formats)
    const getAdCount = (group) => {
        if (!group.ads) return 0;
        return group.ads.length;
    };

    // Get ad ID from entry (handles both { id, weight } and plain number)
    const getAdId = (entry) => {
        return typeof entry === 'object' ? entry.id : entry;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="groups-page">
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                </div>
            </div>
        );
    }

    // Empty state (no groups at all)
    if (groups.length === 0) {
        return (
            <div className="groups-page">
                <div className="advajra-empty-state">
                    <div className="empty-icon">
                        <Icon icon={pages} />
                    </div>
                    <h2>{__('No groups yet', 'advajra')}</h2>
                    <p>{__('Groups let you bundle multiple ads together and rotate them. Create your first group to get started!', 'advajra')}</p>
                    <Link to="/groups/new">
                        <Button variant="primary" className="av-btn-primary">
                            <Icon icon={plus} /> {__('Create Group', 'advajra')}
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="groups-page">
            {/* Toolbar: Search left, Filters + Button right - Same as PlacementList */}
            <div className="av-toolbar">
                <div className="av-toolbar-search">
                    <TextControl
                        value={search}
                        onChange={setSearch}
                        placeholder={__('Search groups...', 'advajra')}
                        type="search"
                        hideLabelFromVision
                    />
                </div>
                <div className="av-toolbar-filters">
                    <SmartSelect
                        value={filterRotation}
                        onChange={setFilterRotation}
                        options={[
                            { label: __('All Rotations', 'advajra'), value: '' },
                            { label: __('Random', 'advajra'), value: 'random' },
                            { label: __('Weighted', 'advajra'), value: 'weighted' },
                            { label: __('Ordered', 'advajra'), value: 'ordered' },
                        ]}
                        className="w-44"
                    />
                    <SmartSelect
                        value={filterStatus}
                        onChange={setFilterStatus}
                        options={[
                            { label: __('All Status', 'advajra'), value: '' },
                            { label: __('Has Ads', 'advajra'), value: 'active' },
                            { label: __('Empty', 'advajra'), value: 'empty' },
                        ]}
                        className="w-36"
                    />
                    <Link to="/groups/new">
                        <Button variant="primary" className="av-btn-primary av-btn-create">
                            <Icon icon={plus} size={18} /> {__('Create Group', 'advajra')}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Groups Grid */}
            <div className="groups-grid">
                {filteredGroups.length === 0 ? (
                    <div className="av-no-results">
                        <p>{__('No groups match your filters.', 'advajra')}</p>
                    </div>
                ) : (
                    filteredGroups.map((group) => (
                        <div
                            key={group.id}
                            className="group-stack-card"
                            onClick={() => navigate(`/groups/${group.id}`)}
                        >
                            {/* Hover Actions */}
                            <div className="group-actions">
                                {/* Duplicate Button - matches CampaignSettingsCard PRO badge */}
                                <button
                                    type="button"
                                    className="action-btn duplicate"
                                    disabled={!isPro}
                                    onClick={(e) => duplicateGroup(e, group)}
                                    title={isPro ? __('Duplicate', 'advajra') : __('Duplicate (PRO)', 'advajra')}
                                >
                                    <Icon icon={copy} />
                                    <span className="pro-badge">PRO</span>
                                </button>

                                {/* Delete Button */}
                                <button
                                    type="button"
                                    className="action-btn delete"
                                    onClick={(e) => deleteGroup(e, group.id)}
                                    title={__('Delete', 'advajra')}
                                >
                                    <Icon icon={trash} />
                                </button>
                            </div>

                            {/* Stack Preview */}
                            <div className="stack-preview">
                                {group.ads && group.ads.length > 0 ? (
                                    <>
                                        {group.ads.slice(0, 3).map((entry) => {
                                            const adId = getAdId(entry);
                                            const ad = getAd(adId);
                                            return (
                                                <div key={adId} className="stack-card">
                                                    {ad?.image ? (
                                                        <img src={ad.image} alt="" />
                                                    ) : (
                                                        <div className="stack-placeholder">
                                                            <Icon icon={pages} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {group.ads.length > 3 && (
                                            <span className="stack-more">
                                                +{group.ads.length - 3}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <div className="stack-empty">
                                        <Icon icon={plus} />
                                        <span>{__('Empty', 'advajra')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Group Info */}
                            <div className="group-info">
                                <div className="group-title">{group.title}</div>
                                <div className="group-meta">
                                    <span className="meta-item">
                                        <Icon icon={pages} />
                                        {getAdCount(group)} {__('ads', 'advajra')}
                                    </span>
                                    <span className={`rotation-badge ${group.rotation || 'random'}`}>
                                        <Icon icon={getRotationIcon(group.rotation)} />
                                        {getRotationLabel(group.rotation)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GroupList;
