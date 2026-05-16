/**
 * AdEditor.js
 *
 * The command center for creating and editing ads.
 * Refactored for Phase 13 "Studio Layout" (70/30 Split with Tabs).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PRICING_URL } from '../../utils/urls';
import { Button, Spinner, Popover, Modal, ButtonGroup } from '@wordpress/components';
import { check, chevronLeft, tablet, desktop, mobile, upload, code, formatAscii, calendar, globe, edit, clock, settings, trash, pause } from '@wordpress/icons';
import { useSelect, useDispatch } from '@wordpress/data';
import { useNotification } from '../../context/NotificationDataCtx';
import apiFetch from '@wordpress/api-fetch';
import { MediaUpload } from '@wordpress/media-utils';
import { Icon } from '@wordpress/components';
import { STORE_NAME } from '../../store/constants';

// Components
import TargetingBuilder from '../../components/TargetingBuilder';
import WPEditor from '../../components/WPEditor';
import SegmentedControl from '../../components/SegmentedControl';
import SmartSelect from '../../components/SmartSelect';
import LayoutSelector from '../../components/LayoutSelector';
import BoxModelControl from '../../components/BoxModelControl'; // Replaces SpacingControl
import { TrackingIcons } from '../../components/TrackingIcons';
import { STATUS_CONFIG } from '../AdManager/AdSchema';
import CampaignSettingsCard from '../../components/CampaignSettingsCard';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { SaveActionIcon } from '../../components/AdvajraIcons';
import useDirtyState from '../../hooks/useDirtyState';

// Tracking mode options for the per-ad SmartSelect. Defined at module level to avoid re-creation on every render.
const TRACKING_OPTIONS = [
    { label: 'Default',            value: 'default',     icon: TrackingIcons.Default },
    { label: 'All (Imp + Click)',  value: 'both',        icon: TrackingIcons.Both },
    { label: 'Impressions Only',   value: 'impressions', icon: TrackingIcons.Impressions },
    { label: 'Clicks Only',        value: 'clicks',      icon: TrackingIcons.Clicks },
    { label: 'Disabled',           value: 'disabled',    icon: TrackingIcons.Disabled },
];


const AdEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const isNew = !id;
    const isPro = !! window.advajraSettings?.isPro;

    const moduleId = isNew ? 'ad-editor-new' : `ad-editor-${ id }`;
    const { markDirty, clearDirty, isDirty, wrapSave } = useDirtyState( moduleId );

    // State
    // Removed activeSection - defaulting to Single View
    const [ loading, setLoading ] = useState(!isNew);
    const [ saving, setSaving ] = useState(false);

    // Ad Data
    const [ title, setTitle ] = useState('');
    const [ adType, setAdType ] = useState('image');

    useDocumentTitle(isNew ? 'New Ad' : (title || 'Edit Ad'));
    const [ content, setContent ] = useState('');
    const [ url, setUrl ] = useState('');
    const [ target, setTarget ] = useState('default');
    const [ nofollow, setNofollow ] = useState('default');

    // Animation State
    const [animClass, setAnimClass] = useState('av-slide-right');
    const adTypesRegistry = (typeof window !== 'undefined' && window.advajraSettings && window.advajraSettings.adTypes) ? window.advajraSettings.adTypes : {};
    const adTypes = Object.keys(adTypesRegistry).length ? Object.keys(adTypesRegistry) : ['image', 'rich', 'plain'];

    const handleTypeChange = (newType) => {
        if (newType === adType) return;
        const currentIndex = adTypes.indexOf(adType);
        const newIndex = adTypes.indexOf(newType);

        // If moving "forward" (index increases), content comes from RIGHT (pushing old LEFT)
        // If moving "backward" (index decreases), content comes from LEFT (pushing old RIGHT)
        setAnimClass(newIndex > currentIndex ? 'av-slide-right' : 'av-slide-left');
        setAdType(newType);
        markDirty();
    };

    // ── Data from centralised store ──
    const { cachedAd, isStoreLoaded } = useSelect( ( select ) => {
        const store = select( STORE_NAME );
        return {
            cachedAd:      ! isNew ? store.getAd( parseInt( id, 10 ) ) : null,
            isStoreLoaded: store.hasLoadedAds(),
        };
    }, [ id, isNew ] );

    const {
        saveAd: dispatchSave,
        deleteAd: dispatchDelete,
        receiveEntity,
    } = useDispatch( STORE_NAME );

    /**
     * Deletes the current campaign (Moves to Trash)
     */
    const handleDelete = async () => {
        // eslint-disable-next-line no-restricted-globals
        if (!confirm('Are you sure you want to move this campaign to the Trash?')) {
            return;
        }

        try {
            setLoading(true);
            await dispatchDelete(parseInt(id, 10), { silent: true });
            addNotification({ type: 'success', message: 'Campaign moved to Trash.' });
            navigate('/ads');
        } catch (error) {
            console.error(error);
            setLoading(false);
            addNotification({ type: 'error', message: 'Failed to delete campaign.' });
        }
    };
    const [ sponsored, setSponsored ] = useState('default');
    const [ tracking, setTracking ] = useState('default');
    const [ altText, setAltText ] = useState('');
    const [ status, setStatus ] = useState('publish');
    const [ startDate, setStartDate ] = useState('');
    const [ endDate, setEndDate ] = useState('');
    // Advanced Scheduling State
    const [ scheduleTimeStart, setScheduleTimeStart ] = useState('');
    const [ scheduleTimeEnd, setScheduleTimeEnd ] = useState('');
    const [ scheduleWeekdays, setScheduleWeekdays ] = useState([]); // Array of strings '1'-'7'
    const [ isSettingsOpen, setIsSettingsOpen ] = useState(false);
    const [ dimensions, setDimensions ] = useState({ width: '', height: '' });

    // Layout State
    const [ layout, setLayout ] = useState({
        mode: 'default',
        float: 'none',
        align: 'center',
        margin: { top: '', right: '', bottom: '', left: '' },
        padding: { top: '', right: '', bottom: '', left: '' }
    });

    const [ targeting, setTargeting ] = useState({ relation: 'AND', rules: [] });

    // Preview Context
    const [ deviceMode, setDeviceMode ] = useState('desktop');

    // Hydrate form state from store cache (or fetch individually)
    useEffect(() => {
        if (isNew) return;

        const hydrate = async () => {
            let data = cachedAd;

            // If we don't have the ad cached, we must fetch it.
            // (Even if isStoreLoaded is false, we need THIS ad to show anything)
            if ( ! data ) {
                try {
                    data = await apiFetch({ path: `/advajra/v1/ads/${id}` });
                    if ( data ) {
                        receiveEntity( 'ads', data );
                    }
                } catch (error) {
                    setLoading(false);
                    addNotification({ type: 'error', message: 'Failed to load ad data.' });
                    // If 404, we might want to redirect, but for now just stop spinner
                    return;
                }
            }

            if ( ! data ) {
                setLoading(false);
                return;
            }
                setTitle(data.title.raw);
                const defaultType = adTypes[0] || 'plain';
                let fetchedAdType = data.type || defaultType;
                setAdType(fetchedAdType);

                if (fetchedAdType === 'image') {
                    setContent(data.image || '');
                } else {
                    setContent(data.content || '');
                }

                setUrl(data.url || '');

                let loadedTarget = data.target || 'default';
                if (!data.target && data.open_new_tab !== undefined) {
                     loadedTarget = (data.open_new_tab === '1' || data.open_new_tab === true) ? 'new' : 'same';
                }
                setTarget(loadedTarget);

                setNofollow(data.nofollow || 'default');
                setSponsored(data.sponsored || 'default');
                setTracking(data.tracking || 'default');
                setAltText(data.alt_text || '');
                setStatus(data.status || 'publish');
                setStartDate(data.start_date || '');
                setEndDate(data.end_date || '');
                setScheduleTimeStart(data.schedule_time_start || '');
                setScheduleTimeEnd(data.schedule_time_end || '');
                setScheduleWeekdays(data.schedule_weekdays || []);

                setDimensions(data.dimensions || { width: '', height: '' });
                setLayout(data.layout || {
                    mode: 'default',
                    align: 'center',
                    margin: { top: '', right: '', bottom: '', left: '' },
                    padding: { top: '', right: '', bottom: '', left: '' }
                });

                setTargeting(data.targeting || { relation: 'AND', rules: [] });
                setLoading(false);
        };

        hydrate();
    }, [id, isStoreLoaded, cachedAd]);

    // Save Handler
    const handleSave = async () => {
        setSaving(true);

        const data = {
            title: title,
            status: status,
            type: adType,
            targeting: targeting,
            url: url,
            target: target,
            nofollow: nofollow,
            sponsored: sponsored,
            tracking: tracking,
            open_new_tab: target === 'new', // Legacy support
            alt_text: altText,
            dimensions: dimensions,
            layout: layout,
            start_date: startDate,
            end_date: endDate,
            schedule_time_start: scheduleTimeStart,
            schedule_time_end: scheduleTimeEnd,
            schedule_weekdays: scheduleWeekdays
        };

        if (adType === 'image') {
            data.image = content;
            data.content = '';
        } else {
            data.content = content;
            data.image = '';
        }

        try {
            const response = await dispatchSave( isNew ? null : parseInt(id, 10), data );
            clearDirty();
            setSaving(false);
            addNotification({
                type: 'success',
                message: isNew ? 'Ad created successfully!' : 'Ad updated successfully!'
            });
            if (isNew) navigate(`/ads/${response.id}`);
        } catch (err) {
            setSaving(false);
            addNotification({ type: 'error', message: err.message || 'Save failed.' });
        }
    };

    if (loading) return <div className="advajra-loading"><Spinner /></div>;

    return (
        <div className="advajra-editor-studio single-flow mode-studio">

            {/* 1. Header */}
            {/* 1. Header (Toolbar) */}
            <div className="advajra-editor-toolbar">
                <div className="toolbar-left items-center">
                    <Button icon={chevronLeft} className="back-btn" onClick={() => {
                        if ( window.__advajraGuardedNavigate ) {
                            window.__advajraGuardedNavigate('/ads');
                        } else {
                            navigate('/ads');
                        }
                    }} label="Back" />

                    <div className="ad-identity-group">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                            placeholder="Campaign Name"
                            className="av-toolbar-input"
                        />
                    </div>
                </div>

                <div className="toolbar-right">
                    <Button
                        isPrimary
                        className="save-btn"
                        isBusy={saving}
                        onClick={handleSave}
                    >
                        <SaveActionIcon size={16} />
                        <span style={{ marginLeft: '8px' }}>
                        {(() => {
                            if (saving) return 'Saving...';
                            if (status === 'publish' || status === 'active') {
                                return isNew ? 'Publish Ad' : 'Update Ad';
                            }
                            return 'Save Ad';
                        })()}
                        </span>
                    </Button>
                </div>
            </div>
            {/* The div below was misplaced, it should wrap the entire editor content */}
            {/* </div> */}

            {/* 2. Main Canvas (Scrollable) */}
            <div className="advajra-canvas">

                {/* ZONE 1: AD STUDIO (Split View) */}
                <div className="zone-ad">

                    <div className="zone-header">
                        <h2>Ad Studio</h2>
                        <p>Design the visual appearance and behavior of your ad.</p>
                    </div>

                    <div className="advajra-studio-grid">
                        {/* Left: Inputs */}
                        <div className="advajra-stage input-column">

                            <div className="smart-input-grid">

                                {/* 1. Ad Type Selector */}
                                <div className="ad-type-selector-grid">
                                    {adTypes.map(typeId => {
                                        const meta = adTypesRegistry[typeId] || {};
                                        const type = {
                                            id: typeId,
                                            icon: meta.icon || typeId,
                                            label: meta.label || typeId,
                                            desc: meta.desc || ''
                                        };
                                        return (
                                            <div
                                                key={type.id}
                                                className={`ad-type-card ${adType === type.id ? 'active' : ''}`}
                                                onClick={() => handleTypeChange(type.id)}
                                            >
                                                <div className="info">
                                                    <span className="label">{type.label}</span>
                                                    <span className="desc">{type.desc}</span>
                                                </div>
                                                {adType === type.id && <div className="check-mark"><Icon icon={check} /></div>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 2. Main Content (Full Width) */}
                                <div className="ad-input-group">
                                    { adType === 'image' && (
                                        <div className={`media-uploader-zone ${animClass}`}>
                                            <MediaUpload
                                                onSelect={(media) => { setContent(media.url); markDirty(); }}
                                                allowedTypes={['image']}
                                                render={({ open }) => (
                                                    <div
                                                        onClick={open}
                                                        className={`advajra-drop-zone ${content ? 'has-content' : ''}`}
                                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const files = Array.from(e.dataTransfer.files);
                                                            if (files.length > 0) {
                                                                const file = files[0];
                                                                const formData = new FormData();
                                                                formData.append('file', file);

                                                                setLoading(true);
                                                                apiFetch({
                                                                    path: '/wp/v2/media',
                                                                    method: 'POST',
                                                                    body: formData,
                                                                }).then(media => {
                                                                    setContent(media.source_url);
                                                                    setLoading(false);
                                                                    addNotification({ type: 'success', message: 'Image uploaded successfully!' });
                                                                }).catch(err => {
                                                                    setLoading(false);
                                                                    console.error(err);
                                                                    addNotification({ type: 'error', message: 'Upload failed. Please try clicking to upload.' });
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        { content ? (
                                                            <div className="preview-mini">
                                                                <img src={content} alt="Preview" />
                                                                <Button isDestructive isSmall onClick={(e) => { e.stopPropagation(); setContent(''); }}>Remove</Button>
                                                            </div>
                                                        ) : (
                                                            <div className="placeholder">
                                                                <Icon icon={upload} size={32} />
                                                                <span>Click to Upload or Drag and Drop Image Here</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    )}

                                    { adType === 'plain' && (
                                        <div className={`mb-6 ${animClass}`}>
                                            <textarea
                                                value={content}
                                                onChange={(e) => { setContent(e.target.value); markDirty(); }}
                                                placeholder="Enter Code or Plain Text."
                                                rows={8}
                                                className="w-full advajra-input !rounded-2xl px-4 py-3 font-mono"
                                            />
                                            <p className="mt-2 text-xs text-slate-400">Supports Text, HTML, JavaScript, PHP and Shortcodes.</p>
                                        </div>
                                    )}

                                    { adType === 'rich' && (
                                        <div className={`${animClass}`}>
                                            <WPEditor id={`ad-content-editor-${id || 'new'}`} content={ content } onChange={ (val) => { setContent(val); markDirty(); } } />
                                        </div>
                                    )}
                                </div>

                                    {/* 3. New Control Deck */}
                                    <div className="flex flex-col gap-6 mt-6">


                                        {/* Layout Settings Section (New) */}
                                        {/* Layout Settings Section (New) */}
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Layout</h3>

                                            <div className="mb-6">
                                                <LayoutSelector layout={layout} onChange={(val) => { setLayout(val); markDirty(); }} />
                                            </div>

                                            {/* Unified Box Model Control */}
                                            <BoxModelControl
                                                margin={layout.margin}
                                                padding={layout.padding}
                                                onMarginChange={(val) => { setLayout({ ...layout, margin: val }); markDirty(); }}
                                                onPaddingChange={(val) => { setLayout({ ...layout, padding: val }); markDirty(); }}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        placeholder="W"
                                                        value={dimensions.width}
                                                        onChange={(e) => { setDimensions({ ...dimensions, width: e.target.value }); markDirty(); }}
                                                        className="w-12 text-center text-xs h-8 border-slate-200 rounded text-slate-600 font-medium"
                                                    />
                                                    <span className="text-slate-500 text-[10px]">x</span>
                                                    <input
                                                        type="text"
                                                        placeholder="H"
                                                        value={dimensions.height}
                                                        onChange={(e) => { setDimensions({ ...dimensions, height: e.target.value }); markDirty(); }}
                                                        className="w-12 text-center text-xs h-8 border-slate-200 rounded text-slate-600 font-medium"
                                                    />
                                                </div>
                                            </BoxModelControl>
                                        </div>

                                        {/* Row 2: Tracking (Left) & Click URL (Right) */}
                                        <div className="flex flex-wrap gap-6 w-full">
                                            {/* Tracking — full control in PRO, locked preview in free */}
                                            <div className="flex-1 min-w-[200px]">
                                                <SmartSelect
                                                    label={<>Tracking{!isPro && <a href={ PRICING_URL.adEditorTrackingBadge } target="_blank" rel="noopener noreferrer" className="pro-badge pro-badge--inline" style={{ marginLeft: '6px' }}>PRO</a>}</>}
                                                    value={isPro ? tracking : 'disabled'}
                                                    onChange={isPro ? (val) => { setTracking(val); markDirty(); } : () => {}}
                                                    options={TRACKING_OPTIONS.map(o => isPro ? o : ({ ...o, disabled: true, isPro: true }))}
                                                    onDisabledClick={() => window.open(PRICING_URL.adEditorTrackingClick, '_blank')}
                                                />
                                            </div>

                                            {/* Click URL */}
                                            <div className="flex-[2] min-w-[300px]">
                                                <label className="advajra-label">Target URL</label>
                                                <input
                                                    type="text"
                                                    value={url}
                                                    onChange={(e) => { setUrl(e.target.value); markDirty(); }}
                                                    placeholder="https://example.com"
                                                    className="w-full advajra-input px-4 py-2 min-h-[40px] transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 3: Link Behavior Attributes (Segmented Controls) */}
                                        <div className="flex flex-wrap gap-6 w-full">
                                            <div className="flex-1 min-w-[200px]">
                                                <SegmentedControl
                                                    label="Target Window"
                                                    options={[
                                                        { label: 'Default', value: 'default' },
                                                        { label: 'Same', value: 'same' },
                                                        { label: 'New Tab', value: 'new' }
                                                    ]}
                                                    value={target}
                                                    onChange={(val) => { setTarget(val); markDirty(); }}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-[150px]">
                                                <SegmentedControl
                                                    label="Nofollow"
                                                    options={[
                                                        { label: 'Default', value: 'default' },
                                                        { label: 'Yes', value: 'yes' },
                                                        { label: 'No', value: 'no' }
                                                    ]}
                                                    value={nofollow}
                                                    onChange={(val) => { setNofollow(val); markDirty(); }}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-[150px]">
                                                <SegmentedControl
                                                    label="Sponsored"
                                                    options={[
                                                        { label: 'Default', value: 'default' },
                                                        { label: 'Yes', value: 'yes' },
                                                        { label: 'No', value: 'no' }
                                                    ]}
                                                    value={sponsored}
                                                    onChange={(val) => { setSponsored(val); markDirty(); }}
                                                />
                                            </div>
                                        </div>

                                        {/* Row 4: Alt Text (for images) */}
                                        {adType === 'image' && (
                                            <div className="grid grid-cols-1 gap-6">
                                                <div>
                                                    <label className="advajra-label">Alt Text</label>
                                                    <input
                                                        type="text"
                                                        value={altText}
                                                        onChange={(e) => { setAltText(e.target.value); markDirty(); }}
                                                        placeholder="Describe this image for accessibility"
                                                        className="w-full advajra-input px-4 py-2 min-h-[40px] transition-colors"
                                                    />
                                                    <p className="mt-1 text-xs text-slate-400">Required for accessibility. Describes the image content.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                            </div>
                        </div>

                        {/* Right: Inspector Column (Settings + Simulator) */}
                        <div className="advajra-inspector-column">

                            {/* 1. Campaign Settings Card */}
                            <CampaignSettingsCard
                                status={status}
                                setStatus={(val) => { setStatus(val); markDirty(); }}
                                startDate={startDate}
                                setStartDate={(val) => { setStartDate(val); markDirty(); }}
                                endDate={endDate}
                                setEndDate={(val) => { setEndDate(val); markDirty(); }}
                                // Pass Advanced Props
                                scheduleTimeStart={scheduleTimeStart}
                                setScheduleTimeStart={(val) => { setScheduleTimeStart(val); markDirty(); }}
                                scheduleTimeEnd={scheduleTimeEnd}
                                setScheduleTimeEnd={(val) => { setScheduleTimeEnd(val); markDirty(); }}
                                scheduleWeekdays={scheduleWeekdays}
                                setScheduleWeekdays={(val) => { setScheduleWeekdays(val); markDirty(); }}

                                onDelete={handleDelete}
                                onDuplicate={() => addNotification({ type: 'info', message: 'Duplicate requires Pro license.' })}
                                isNew={isNew}
                                isPro={isPro}
                            />

                            {/* 2. Device Simulator */}
                            <div className="advajra-simulator">
                                <div className="simulator-header">
                                    <span className="label">Live Preview</span>
                                    <div className="device-toggles">
                                        <Button icon={desktop} isSmall isPressed={deviceMode === 'desktop'} onClick={() => setDeviceMode('desktop')} />
                                        <Button icon={tablet} isSmall isPressed={deviceMode === 'tablet'} onClick={() => setDeviceMode('tablet')} />
                                        <Button icon={mobile} isSmall isPressed={deviceMode === 'mobile'} onClick={() => setDeviceMode('mobile')} />
                                    </div>
                                </div>

                                <div className="simulator-stage-center">
                                    <div className={`simulator-frame device-${deviceMode}`}>
                                        <div className="simulator-screen">
                                            <div className="fake-header"></div>
                                            <div className="fake-content">
                                                <div className="fake-text"></div>
                                                <div className="fake-text short"></div>
                                                <div
                                                    className="ad-spot-render"
                                                    style={{
                                                        width: dimensions.width ? `${dimensions.width}px` : 'auto',
                                                        height: dimensions.height ? `${dimensions.height}px` : 'auto',
                                                        maxWidth: '100%',
                                                        margin: layout.mode === 'default'
                                                            ? `${layout.margin.top || 20}px ${layout.margin.right || 0}px ${layout.margin.bottom || 20}px ${layout.margin.left || 0}px`
                                                            : `${layout.margin.top || 20}px 0 ${layout.margin.bottom || 20}px 0`, // Use flex for alignment instead
                                                        padding: `${layout.padding.top || 0}px ${layout.padding.right || 0}px ${layout.padding.bottom || 0}px ${layout.padding.left || 0}px`,
                                                        float: layout.mode === 'float' ? layout.align : 'none',
                                                        display: layout.mode === 'block' ? 'flex' : (layout.mode === 'float' ? 'block' : 'inline-block'),
                                                        justifyContent: layout.mode === 'block' ? (layout.align === 'center' ? 'center' : (layout.align === 'right' ? 'flex-end' : 'flex-start')) : 'unset',
                                                        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)'
                                                    }}
                                                >
                                                    { (content || url) ? (
                                                        <div className="ad-wrapper-preview" style={{ width: 'auto', maxWidth: '100%', height: 'auto', minHeight: '1px' }}>
                                                            { url ? (
                                                                <a
                                                                    href={url}
                                                                    target={target === 'new' ? '_blank' : '_self'}
                                                                    rel={[
                                                                        nofollow === 'yes' ? 'nofollow' : '',
                                                                        sponsored === 'yes' ? 'sponsored' : ''
                                                                    ].filter(Boolean).join(' ')}
                                                                    onClick={(e) => e.preventDefault()}
                                                                    className="block w-full h-full hover:opacity-80 hover:scale-[1.01] transition-all cursor-pointer"
                                                                    title={`Target Link: ${url}`}
                                                                >
                                                                    { adType === 'image' && content ? (
                                                                        <img src={content} alt={altText} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    ) : (
                                                                        adType === 'image' ? (
                                                                            <div className="empty-state py-4 border-2 border-dashed border-blue-200 bg-blue-50 text-blue-500 rounded-lg">
                                                                                Click Link Active
                                                                            </div>
                                                                        ) : (
                                                                            <div dangerouslySetInnerHTML={{ __html: content }} />
                                                                        )
                                                                    )}
                                                                </a>
                                                            ) : (
                                                                <div className="w-full">
                                                                    { adType === 'image' ? (
                                                                        content ? <img src={content} alt={altText} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null
                                                                    ) : (
                                                                        <div dangerouslySetInnerHTML={{ __html: content }} />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="empty-state">
                                                            {dimensions.width && dimensions.height ? `${dimensions.width} × ${dimensions.height}` : 'Content Preview'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="fake-text"></div>
                                                <div className="fake-text short"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ZONE 2: TARGETING */}
                <div className="zone-targeting advajra-card">
                    <div className="zone-header centered">
                        <h2>Targeting</h2>
                        <p>Precision control over who sees your ads. Define audiences using the logic engine.</p>
                    </div>

                    <TargetingBuilder value={targeting} onChange={(val) => { setTargeting(val); markDirty(); }} />
                </div>

                <div className="spacer-footer" style={{ height: '100px' }}></div>

            </div>
        </div>
    );
};
export default AdEditor;
