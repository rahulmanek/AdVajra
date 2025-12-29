/**
 * AdList.js
 *
 * The main "Ads" page.
 * Displays the toolbar and the list/gallery of ads.
 *
 * Architecture:
 * - Selection state lifted to this parent component
 * - BulkHUD rendered once here (not in individual views)
 * - Views receive selection state as props (dumb components)
 *
 * Extensible via hooks:
 * - advajra.ads.filters: Add custom filter dropdowns (PRO can add Performance filter)
 */

import React, { useState, useEffect, useMemo, useCallback, lazy } from 'react';
import { useSelect, useDispatch } from '@wordpress/data';
import { STORE_NAME } from '../../store/constants';
import { AdSchema, STATUS_CONFIG } from '../../pages/AdManager/AdSchema';
import { TextControl, Button, ButtonGroup, DropdownMenu, Icon, Spinner } from '@wordpress/components';
import { listView, grid, calendar, layout, plus } from '@wordpress/icons';
import { useNavigate, Link } from 'react-router-dom';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import SmartSelect from '../../components/SmartSelect';
import { applyFilters, doAction } from '../../hooks';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { AdsNavIcon } from '../../components/AdvajraIcons';

// Shared Selection & Bulk HUD
import useSelection from '../../hooks/useSelection';
import BulkHUD from '../../components/BulkHUD';

// Views
// Lazy-load heavy views to reduce initial bundle size
const ListView = lazy(() => import(/* webpackChunkName: "views-list" */ '../../pages/AdManager/Views/ListView'));
const GalleryView = lazy(() => import(/* webpackChunkName: "views-gallery" */ '../../pages/AdManager/Views/GalleryView'));
const TimelineView = lazy(() => import(/* webpackChunkName: "views-timeline" */ '../../pages/AdManager/Views/TimelineView'));
import LazyView from '../../components/LazyView';

/**
 * NOTE: BASE_FILTERS moved inside the component so it can use the runtime
 * ad type registry exposed via `window.advajraSettings.adTypes`.
 */

const AdList = () => {
    const navigate = useNavigate();
    const isPro = window.advajraSettings?.isPro || false;

    useDocumentTitle('Ads');

    // ── Data from centralised store ──
    const { ads: allAds, loading } = useSelect( ( select ) => {
        const store = select( STORE_NAME );
        return {
            ads:     store.getAds(),
            loading: ! store.hasLoadedAds(),
        };
    }, [] );

    const {
        deleteAd,
        duplicateAd,
        refreshEntity,
    } = useDispatch( STORE_NAME );

    const refresh = useCallback( () => refreshEntity( 'ads' ), [ refreshEntity ] );

    // ── Local UI preferences (not server data) ──
    const [ view, setViewState ] = useState( () => {
        const saved = localStorage.getItem( 'advajra_ads_view' );
        return saved || 'list';
    } );
    const setView = ( newView ) => {
        setViewState( newView );
        localStorage.setItem( 'advajra_ads_view', newView );
    };

    const [ filter, setFilter ] = useState( '' );

    const [ visibleColumns, setVisibleColumns ] = useState( () => {
        const saved = localStorage.getItem( 'advajra_visible_columns' );
        return saved ? JSON.parse( saved ) : [];
    } );

    useEffect( () => {
        if ( visibleColumns.length > 0 ) {
            localStorage.setItem( 'advajra_visible_columns', JSON.stringify( visibleColumns ) );
        }
    }, [ visibleColumns ] );

    const toggleColumn = ( key ) => {
        const newCols = visibleColumns.includes( key )
            ? visibleColumns.filter( k => k !== key )
            : [ ...visibleColumns, key ];
        setVisibleColumns( newCols );
    };

    // Computed: apply text filter
    const ads = useMemo( () =>
        allAds.filter( ad => {
            if ( ! filter ) return true;
            const title = ad.title?.raw || ad.title || '';
            return title.toLowerCase().includes( filter.toLowerCase() );
        } ),
    [ allAds, filter ] );

    const adTypesRegistry = (typeof window !== 'undefined' && window.advajraSettings && window.advajraSettings.adTypes) ? window.advajraSettings.adTypes : {};

    const BASE_FILTERS = [
        {
            id: 'status',
            label: __('All Status', 'advajra'),
            options: [
                { label: __('All Status', 'advajra'), value: '' },
                { label: __('Active', 'advajra'), value: 'publish' },
                { label: __('Scheduled', 'advajra'), value: 'future' },
                { label: __('Draft', 'advajra'), value: 'draft' },
                { label: __('Paused', 'advajra'), value: 'paused' },
                { label: __('Expired', 'advajra'), value: 'expired' },
            ],
            defaultValue: '',
            filterFn: (ad, value) => !value || ad.status === value,
        },
        {
            id: 'type',
            label: __('All Types', 'advajra'),
            options: [
                { label: __('All Types', 'advajra'), value: '' },
                ...Object.keys(adTypesRegistry).map(k => ({ label: (adTypesRegistry[k]?.label) || k, value: k })),
            ],
            defaultValue: '',
            filterFn: (ad, value) => !value || ad.type === value,
        },
    ];

    // Get filters (extensible via hook)
    const filters = useMemo(() => {
        return applyFilters('advajra.ads.filters', BASE_FILTERS, ads);
    }, [ads]);

    // Dynamic filter state - one state object for all filters
    const [filterValues, setFilterValues] = useState({});

    // Update a specific filter value
    const setFilterValue = (id, value) => {
        setFilterValues(prev => ({ ...prev, [id]: value }));
    };

const DEFAULT_COLUMNS = ['title', 'stats', 'trend', 'schedule', 'date', 'modified'];

	// Initialize defaults if empty
	useEffect( () => {
		if ( visibleColumns.length === 0 ) {
			setVisibleColumns( DEFAULT_COLUMNS );
		}
	}, [] );

	// Debounced Search Handle
	const [ localFilter, setLocalFilter ] = useState( filter );

	useEffect( () => {
		const handler = setTimeout( () => {
			setFilter( localFilter );
		}, 300 );
		return () => clearTimeout( handler );
	}, [ localFilter, setFilter ] );

    // Filter ads based on search + all dynamic filters
    const filteredAds = useMemo(() => {
        return ads.filter(ad => {
            // Search filter
            if (localFilter) {
                const title = typeof ad.title === 'string' ? ad.title : (ad.title?.rendered || ad.title?.raw || '');
                if (!title.toLowerCase().includes(localFilter.toLowerCase())) {
                    return false;
                }
            }
            // Apply all dynamic filters
            for (const f of filters) {
                const value = filterValues[f.id] ?? f.defaultValue;
                if (f.filterFn && !f.filterFn(ad, value)) {
                    return false;
                }
            }
            return true;
        });
    }, [ads, localFilter, filters, filterValues]);

    // Async Fetch Trends
    const [trendsMap, setTrendsMap] = useState({});

    useEffect(() => {
        if (filteredAds.length === 0) return;

        // Find IDs we don't have trends for yet
        const missingIds = filteredAds.map(ad => ad.id).filter(id => !trendsMap[id]);
        
        if (missingIds.length === 0) return;

        let isMounted = true;
        const timer = setTimeout(() => {
            apiFetch({
                path: '/advajra/v1/analytics/trends',
                method: 'POST',
                data: { ad_ids: missingIds }
            }).then(res => {
                if (isMounted && res && typeof res === 'object') {
                    setTrendsMap(prev => ({ ...prev, ...res }));
                }
            }).catch(err => {
                console.error('Failed to fetch ad trends', err);
            });
        }, 300); // 300ms debounce
        
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [filteredAds, trendsMap]);

    // --- CENTRALIZED SELECTION STATE ---
    // Selection state lifted to parent - views receive as props
    const selection = useSelection(filteredAds);

    // Global keyboard shortcuts for selection
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Cmd/Ctrl + A: Select All
            if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                selection.selectAll();
            }
            // Escape: Clear selection
            if (e.key === 'Escape') {
                selection.clear();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection]);

    // Bulk Action Handlers
    const handleBulkDuplicate = useCallback(async () => {
        if (!selection.hasSelection) return;

        if (!isPro) {
            window.open('https://advajra.com/pricing', '_blank');
            return;
        }

        // Process sequentially to be safe with state updates
        for (const id of selection.selectedIds) {
            await duplicateAd(id);
        }
        selection.clear();
    }, [selection, isPro, duplicateAd]);

    const handleBulkDelete = useCallback(async () => {
        if (!selection.hasSelection) return;

        if (window.confirm(`${__('Are you sure you want to delete', 'advajra')} ${selection.selectedCount} ${__('ad(s)?', 'advajra')}`)) {
            // Parallel execution for speed
            const promises = Array.from(selection.selectedIds).map(id => deleteAd(id, { silent: true }));
            await Promise.all(promises);
            selection.clear();
        }
    }, [selection, deleteAd]);

    // Single item handlers passed to views
    const handleEdit = useCallback((id) => {
        navigate(`/ads/${id}`);
    }, [navigate]);

    const handleDelete = useCallback((id) => {
        deleteAd(id);
        // Also remove from selection if selected
        if (selection.isSelected(id)) {
            selection.toggle(id);
        }
    }, [deleteAd, selection]);

    const handleDuplicate = useCallback((id) => {
        if (isPro) {
            duplicateAd(id);
        } else {
            window.open('https://advajra.com/pricing', '_blank');
        }
    }, [isPro, duplicateAd]);

	const renderView = () => {
        // Common props passed to all views
        const viewProps = {
            schema: AdSchema,
            data: filteredAds,
            trends: trendsMap,
            // Selection props (lifted state)
            selectedIds: selection.selectedIds,
            onSelect: selection.toggle,
            // Action handlers
            onEdit: handleEdit,
            onDelete: handleDelete,
            onDuplicate: handleDuplicate,
            isPro,
        };

        switch ( view ) {
            case 'list':
                return (
                    <LazyView>
                        <ListView {...viewProps} visibleColumns={visibleColumns} />
                    </LazyView>
                );
            case 'gallery':
                return (
                    <LazyView>
                        <GalleryView {...viewProps} />
                    </LazyView>
                );
            case 'timeline':
                return (
                    <LazyView>
                        <TimelineView {...viewProps} />
                    </LazyView>
                );
            default:
                return (
                    <LazyView>
                        <ListView {...viewProps} visibleColumns={visibleColumns} />
                    </LazyView>
                );
        };
	};

	return (
		<div className="advajra-ad-list-page">
            {/* Loading State - Prevent toolbar flicker */}
            { loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                </div>
            ) : ads.length === 0 && ! filter ? (
                <div className="advajra-empty-state">
                    <div className="empty-icon">
                        <AdsNavIcon size={32} />
                    </div>
                    <h2>{__('No ads yet', 'advajra')}</h2>
                    <p>{__('Ads are the core of AdVajra. Create your first ad to start managing your campaigns.', 'advajra')}</p>
                    <Link to="/ads/new">
                        <Button variant="primary" className="av-btn-primary">
                            <Icon icon={plus} /> {__('Create Ad', 'advajra')}
                        </Button>
                    </Link>
                </div>
            ) : (
                <>
			{/* Toolbar: Search left, Filters + Views + Button right */}
			<div className="av-toolbar">
				<div className="av-toolbar-search">
					<TextControl
						value={ localFilter }
						onChange={ setLocalFilter }
						placeholder={__('Search ads...', 'advajra')}
						type="search"
                        hideLabelFromVision
					/>
				</div>
				<div className="av-toolbar-filters">
                    {/* Dynamic Filter Dropdowns */}
                    {filters.map(f => (
                        <SmartSelect
                            key={f.id}
                            value={filterValues[f.id] ?? f.defaultValue}
                            onChange={(val) => setFilterValue(f.id, val)}
                            options={f.options}
                            className="min-w-fit"
                        />
                    ))}

                    <ButtonGroup>
                        <Button
                            icon={ listView }
                            isPressed={ view === 'list' }
                            onClick={ () => setView( 'list' ) }
                            label={__('List View', 'advajra')}
                        />
                        <Button
                            icon={ grid }
                            isPressed={ view === 'gallery' }
                            onClick={ () => setView( 'gallery' ) }
                            label={__('Gallery View', 'advajra')}
                        />
                        <Button
                            icon={ calendar }
                            isPressed={ view === 'timeline' }
                            onClick={ () => setView( 'timeline' ) }
                            label={__('Timeline View', 'advajra')}
                        />
                    </ButtonGroup>

                    <DropdownMenu
                        icon={ layout }
                        label={__('Columns', 'advajra')}
                        controls={ Object.keys( AdSchema ).map( key => {
                            if ( key === 'title' ) return null; // Always show title
                            if ( AdSchema[key].hiddenInList ) return null;

                            return {
                                title: AdSchema[ key ].label,
                                icon: visibleColumns.includes( key ) ? 'yes' : null,
                                onClick: () => toggleColumn( key ),
                            };
                        } ).filter( Boolean ) }
                    />

                    <Button
                        variant="primary"
                        className="av-btn-primary av-btn-create"
                        onClick={ () => navigate('/ads/new') }
                    >
                        <Icon icon={plus} size={18} /> {__('Create Ad', 'advajra')}
                    </Button>
                </div>
			</div>

			{/* Main Content Area */}
			<div className="advajra-view-container" style={{
                borderRadius: '8px',
                height: 'calc(100vh - 220px)', // All views now have fixed height for virtualization
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {filteredAds.length === 0 ? (
                    <div className="av-no-results" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        <p>{__('No ads match your filters.', 'advajra')}</p>
                    </div>
                ) : (
				    renderView()
                )}
			</div>

            {/* CENTRALIZED BULK HUD - Single instance for all views */}
            <BulkHUD
                selectedCount={selection.selectedCount}
                totalCount={filteredAds.length}
                isAllSelected={selection.isAllSelected}
                onSelectAll={selection.selectAll}
                onClear={selection.clear}
                onDuplicate={handleBulkDuplicate}
                onDelete={handleBulkDelete}
                isPro={isPro}
            />
                </>
            )}
		</div>
	);
};

export default AdList;
