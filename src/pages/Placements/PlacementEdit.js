/**
 * PlacementEdit.js
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Spinner, Icon } from '@wordpress/components';
import { chevronLeft, copy, trash, layout, paragraph, header, footer, code, desktop, mobile } from '@wordpress/icons';
import { useSelect, useDispatch } from '@wordpress/data';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiFetch from '@wordpress/api-fetch';
import { STORE_NAME } from '../../store/constants';
import SmartSelect from '../../components/SmartSelect';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { SaveActionIcon } from '../../components/AdvajraIcons';
import { useNotification } from '../../context/NotificationDataCtx';

// Placement type config with icons for SmartSelect
const TYPE_OPTIONS = [
    { label: 'Before Content', value: 'before_content', icon: <Icon icon={layout} size={16} /> },
    { label: 'After Content', value: 'after_content', icon: <Icon icon={layout} size={16} /> },
    { label: 'After Paragraph', value: 'after_paragraph', icon: <Icon icon={paragraph} size={16} /> },
    { label: 'Header', value: 'header', icon: <Icon icon={header} size={16} /> },
    { label: 'Footer', value: 'footer', icon: <Icon icon={footer} size={16} /> },
    { label: 'Shortcode', value: 'shortcode', icon: <Icon icon={code} size={16} /> },
];

const TYPE_COLORS = {
    before_content: '#6366f1',
    after_content: '#8b5cf6',
    after_paragraph: '#10b981',
    header: '#3b82f6',
    footer: '#64748b',
    shortcode: '#ec4899',
};

const TYPE_DESCRIPTIONS = {
    header: 'Your ad appears at the very top of every page, above the navigation and content.',
    before_content: 'Your ad appears right before the post content begins, below the title.',
    after_paragraph: (n) => `Your ad appears after paragraph ${n} inside blog post content.`,
    after_content: 'Your ad appears right after the post content ends.',
    footer: 'Your ad appears at the very bottom of every page, below all content.',
    shortcode: 'Place this shortcode manually in any page, post, or widget area.',
};

// ─── Page Mockup SVG ───────────────────────────────────────────────
const PageMockup = ({ type, paragraphNum = 3, isMobile, accentColor }) => {
    const totalParagraphs = 3;
    const pNum = Math.min(Math.max(paragraphNum, 1), totalParagraphs);

    // Build page sections
    const renderSections = () => {
        const sections = [];

        // ── Header Zone ──
        sections.push(
            <g key="header-zone">
                <rect x="0" y="0" width="300" height="30" rx="0" fill={type === 'header' ? accentColor : '#f1f5f9'} opacity={type === 'header' ? 0.12 : 1} />
                {type === 'header' ? (
                    <>
                        <rect className="av-mockup-glow" x="6" y="4" width="288" height="22" rx="5" fill={accentColor} opacity="0.85" />
                        <text x="150" y="19" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">✦ YOUR AD HERE</text>
                    </>
                ) : (
                    <>
                        <rect x="12" y="8" width="14" height="14" rx="3" fill="#94a3b8" opacity="0.35" />
                        <text x="21" y="19" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" opacity="0.9">☰</text>
                        <text x="34" y="19" fill="#94a3b8" fontSize="7" fontWeight="700" opacity="0.6">Site Name</text>
                        <text x="288" y="19" textAnchor="end" fill="#94a3b8" fontSize="6" opacity="0.4">HEADER</text>
                    </>
                )}
            </g>
        );

        // ── Navigation Bar ──
        sections.push(
            <g key="nav">
                <rect x="0" y="34" width="300" height="16" fill="#fff" />
                <line x1="0" y1="34" x2="300" y2="34" stroke="#e2e8f0" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="300" y2="50" stroke="#e2e8f0" strokeWidth="0.5" />
                <text x="16" y="45" fill="#64748b" fontSize="6" fontWeight="600" opacity="0.7">Home</text>
                <text x="44" y="45" fill="#94a3b8" fontSize="6" opacity="0.5">Blog</text>
                <text x="66" y="45" fill="#94a3b8" fontSize="6" opacity="0.5">About</text>
                <text x="94" y="45" fill="#94a3b8" fontSize="6" opacity="0.5">Contact</text>
                <text x="288" y="45" textAnchor="end" fill="#cbd5e1" fontSize="5" opacity="0.5">MENU</text>
            </g>
        );

        // Content area starts at y=56
        let y = 56;
        const contentWidth = 276;
        const contentX = 12;

        // ── Post Title ──
        sections.push(
            <g key="title">
                <text x={contentX} y={y + 3} fill="#94a3b8" fontSize="6" fontWeight="600" opacity="0.5">POST TITLE</text>
                <rect x={contentX} y={y + 8} width={contentWidth * 0.65} height="9" rx="2" fill="#1e293b" opacity="0.65" />
                <rect x={contentX} y={y + 20} width={contentWidth * 0.35} height="5" rx="1" fill="#94a3b8" opacity="0.25" />
                <text x={contentX} y={y + 33} fill="#cbd5e1" fontSize="6" opacity="0.6">Aug 6, 2000  •  5 min read</text>
            </g>
        );
        y += 40;

        // ── Before Content Placement ──
        if (type === 'before_content') {
            sections.push(renderAdBlock('placement', contentX, y, contentWidth, accentColor));
            y += 32;
        }

        // ── Content Paragraphs ──
        for (let i = 1; i <= totalParagraphs; i++) {
            const lines = 2;
            sections.push(
                <g key={`p${i}`}>
                    <text x={contentX} y={y + 3} fill="#cbd5e1" fontSize="6" fontWeight="600" opacity="0.6">
                        ¶{i}
                    </text>
                    {Array.from({ length: lines }, (_, j) => (
                        <rect
                            key={`line-${j}`}
                            x={contentX + 14}
                            y={y + j * 7}
                            width={contentWidth - 14 - (j === lines - 1 ? contentWidth * 0.3 : contentWidth * 0.05 * (j % 3))}
                            height="4"
                            rx="1.5"
                            fill="#cbd5e1"
                            opacity={0.45 - j * 0.05}
                        />
                    ))}
                </g>
            );
            y += lines * 7 + 8;

            // After paragraph placement
            if (type === 'after_paragraph' && pNum === i) {
                sections.push(renderAdBlock(`placement-p${i}`, contentX, y, contentWidth, accentColor));
                y += 32;
            }
        }

        // ── After Content Placement ──
        if (type === 'after_content') {
            y += 4;
            sections.push(renderAdBlock('placement', contentX, y, contentWidth, accentColor));
            y += 32;
        }

        // ── Shortcode (mid-content visual) ──
        if (type === 'shortcode') {
            const scY = 56 + 40 + 24;
            sections.push(
                <g key="shortcode-block">
                    <rect x={contentX + 16} y={scY} width={contentWidth - 32} height="26" rx="6"
                        fill={accentColor} opacity="0.08"
                        stroke={accentColor} strokeWidth="1.5" strokeDasharray="5 3" />
                    <text x={contentX + contentWidth / 2} y={scY + 11} textAnchor="middle"
                        fill={accentColor} fontSize="7" fontWeight="700" opacity="0.8">[advajra]</text>
                    <text x={contentX + contentWidth / 2} y={scY + 21} textAnchor="middle"
                        fill={accentColor} fontSize="6" opacity="0.5">shortcode placement</text>
                </g>
            );
        }

        // ── Footer Zone ──
        const footerY = Math.max(y + 14, 190);
        sections.push(
            <g key="footer-zone">
                <line x1="0" y1={footerY} x2="300" y2={footerY} stroke="#e2e8f0" strokeWidth="0.5" />
                <rect x="0" y={footerY} width="300" height="30" fill={type === 'footer' ? `${accentColor}12` : '#f8fafc'} />
                {type === 'footer' ? (
                    <>
                        <rect className="av-mockup-glow" x="6" y={footerY + 4} width="288" height="22" rx="5" fill={accentColor} opacity="0.85" />
                        <text x="150" y={footerY + 19} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">✦ YOUR AD HERE</text>
                    </>
                ) : (
                    <>
                        <text x="16" y={footerY + 13} fill="#94a3b8" fontSize="6" fontWeight="600" opacity="0.4">FOOTER</text>
                        <text x="16" y={footerY + 22} fill="#cbd5e1" fontSize="6" opacity="0.4">© 2026 Your Site</text>
                        <text x="288" y={footerY + 22} textAnchor="end" fill="#cbd5e1" fontSize="6" opacity="0.3">Privacy  Terms</text>
                    </>
                )}
            </g>
        );

        const totalHeight = footerY + 30;
        return { sections, totalHeight };
    };

    const renderAdBlock = (key, x, y, width, color) => (
        <g key={key}>
            <rect className="av-mockup-glow" x={x} y={y} width={width} height="24" rx="6"
                fill={color} opacity="0.12" stroke={color} strokeWidth="1.5" />
            <rect x={x + 4} y={y + 3} width={width - 8} height="18" rx="4" fill={color} opacity="0.82" />
            <text x={x + width / 2} y={y + 15} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">
                ✦ YOUR AD HERE
            </text>
        </g>
    );


    const { sections, totalHeight } = renderSections();

    return (
        <div className={`av-page-mockup ${isMobile ? 'is-mobile' : ''}`}>
            <svg viewBox={`0 0 300 ${totalHeight}`} className="av-mockup-svg">
                {/* Page background */}
                <rect x="0" y="0" width="300" height={totalHeight} rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
                {sections}
            </svg>
        </div>
    );
};

// ─── Shortcode Copy Box ────────────────────────────────────────────
const ShortcodeBox = ({ placementId }) => {
    const [copied, setCopied] = useState(false);
    const shortcode = `[advajra placement="${placementId}"]`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shortcode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = shortcode;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="av-shortcode-box">
            <span className="av-shortcode-label">Shortcode</span>
            <div className="av-shortcode-row">
                <code className="av-shortcode-code">{shortcode}</code>
                <button className={`av-shortcode-copy ${copied ? 'is-copied' : ''}`} onClick={handleCopy}>
                    {copied ? '✓ Copied!' : 'Copy'}
                </button>
            </div>
        </div>
    );
};

// ─── Ad Preview Card ───────────────────────────────────────────────
const AdPreviewCard = ({ itemId, itemType, ads, groups }) => {
    const adTypesRegistry = (typeof window !== 'undefined' && window.advajraSettings && window.advajraSettings.adTypes) ? window.advajraSettings.adTypes : {};

    if (!itemId) {
        return (
            <div className="av-ad-preview-card is-empty">
                <div className="av-empty-illustration">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <rect x="4" y="8" width="40" height="32" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
                        <rect x="12" y="16" width="24" height="4" rx="2" fill="#cbd5e1" opacity="0.5" />
                        <rect x="12" y="24" width="18" height="4" rx="2" fill="#cbd5e1" opacity="0.35" />
                        <circle cx="36" cy="32" r="6" fill="#e2e8f0" />
                        <text x="36" y="35" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="700">+</text>
                    </svg>
                </div>
                <span className="av-empty-title">No ad assigned</span>
                <span className="av-empty-hint">Select an ad or group from the dropdown above</span>
            </div>
        );
    }

    const getTitle = (item) => {
        if (!item?.title) return 'Untitled';
        if (typeof item.title === 'string') return item.title;
        return item.title.raw || 'Untitled';
    };

    let item, typeLabel, editLink, monogram;
    if (itemType === 'group') {
        item = groups.find(g => g.id === itemId);
        typeLabel = 'Group';
        editLink = `/groups/${itemId}`;
        monogram = 'G';
    } else {
        item = ads.find(a => a.id === itemId);
        const adType = item?.type || 'plain';
        const meta = adTypesRegistry[adType] || {};
        typeLabel = meta.label || (adType.charAt(0).toUpperCase() + adType.slice(1));
        editLink = `/ads/${itemId}`;
        monogram = typeLabel.charAt(0).toUpperCase();
    }

    const adStatus = item?.status || 'draft';
    const isActive = adStatus === 'publish' || adStatus === 'active';

    return (
        <div className="av-ad-preview-card">
            <div className="av-preview-icon-area">
                <span className="av-preview-type-icon">{monogram}</span>
            </div>
            <div className="av-preview-info">
                <div className="av-preview-header">
                    <span className="av-preview-name">{getTitle(item)}</span>
                    <span className={`av-preview-status-dot ${isActive ? 'is-active' : ''}`} title={adStatus} />
                </div>
                <span className="av-preview-badge">{typeLabel}</span>
            </div>
            <Link to={editLink} className="av-preview-edit-btn" title={`Edit ${itemType === 'group' ? 'group' : 'ad'}`}>
                →
            </Link>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────
const PlacementEdit = () => {
    const { addNotification } = useNotification();
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'
    const [isMobile, setIsMobile] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState('before_content');
    const [itemType, setItemType] = useState('ad');
    const [itemId, setItemId] = useState(null);
    const [paragraphNum, setParagraphNum] = useState(3);
    const [isDisabled, setIsDisabled] = useState(false);

    useDocumentTitle(name || 'Edit Placement');

    // ── Data from centralised store ──
    const { ads, groups, cachedPlacement, isStoreLoaded } = useSelect( ( select ) => {
        const store = select( STORE_NAME );
        return {
            ads:              store.getAds(),
            groups:           store.getGroups(),
            cachedPlacement:  store.getPlacement( parseInt( id, 10 ) ),
            isStoreLoaded:    store.hasLoadedAds() && store.hasLoadedGroups() && store.hasLoadedPlacements(),
        };
    }, [ id ] );

    const {
        savePlacement: dispatchSave,
        createPlacement: dispatchCreate,
        deletePlacement: dispatchDelete,
        duplicatePlacement: dispatchDuplicate,
        receiveEntity,
    } = useDispatch( STORE_NAME );

    // Hydrate local form state from store cache (or fetch single if missing)
    useEffect( () => {
        const hydrate = async () => {
            setIsLoading( true );
            let placement = cachedPlacement;

            // If store has loaded but this ID isn't in it, fetch individually.
            if ( isStoreLoaded && ! placement ) {
                placement = await apiFetch( {
                    path: `/advajra/v1/placements/${ id }`,
                } ).catch( () => null );
                if ( placement ) {
                    receiveEntity( 'placements', placement );
                }
            }

            if ( placement ) {
                setName( placement.name || '' );
                setType( placement.type || 'before_content' );
                setItemType( placement.item_type || 'ad' );
                setItemId( placement.item_id || null );
                setParagraphNum( placement.paragraph_num || placement.args?.paragraph || 3 );
                setIsDisabled( placement.status === 'disabled' || !! placement.disabled );
            }

            if ( isStoreLoaded ) {
                setIsLoading( false );
            }
        };

        hydrate();
    }, [ id, isStoreLoaded, cachedPlacement ] );

    const isPro = window.advajraSettings?.isPro || false;

    // Helper to get title
    const getTitle = (item) => {
        if (!item?.title) return 'Untitled';
        if (typeof item.title === 'string') return item.title;
        return item.title.raw || 'Untitled';
    };

    // Build options for ad/group selector
    const itemOptions = useMemo(() => [
        { label: '— No Ad Assigned —', value: '' },
        ...(ads.length > 0 ? [
            { label: '📢 ADS', value: '__header_ads__', isHeader: true },
            ...ads.map(a => ({ label: getTitle(a), value: `ad:${a.id}` })),
        ] : []),
        ...(groups.length > 0 ? [
            { label: '📁 GROUPS', value: '__header_groups__', isHeader: true },
            ...groups.map(g => ({ label: getTitle(g), value: `group:${g.id}` })),
        ] : []),
    ], [ads, groups]);

    const currentItemValue = itemId ? `${itemType}:${itemId}` : '';

    const handleItemChange = (value) => {
        if (!value) {
            setItemType('ad');
            setItemId(null);
        } else {
            const [t, i] = value.split(':');
            setItemType(t);
            setItemId(parseInt(i, 10));
        }
    };

    // Save
    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('saving');

        try {
            const data = {
                name,
                type,
                item_type: itemType,
                item_id: itemId,
                status: isDisabled ? 'disabled' : (itemId ? 'active' : 'empty'),
                paragraph_num: type === 'after_paragraph' ? paragraphNum : null,
            };

            await dispatchSave(parseInt(id, 10), data);

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 2500);
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
        }

        setIsSaving(false);
    };

    // Duplicate (PRO only — passes current placement to PRO-gated store action)
    const handleDuplicate = async () => {
        if (!isPro) {
            window.open('https://advajra.com/pricing', '_blank');
            return;
        }
        try {
            const result = await dispatchDuplicate({
                id: placementId,
                name,
                type,
                item_type: itemType,
                item_id: itemId,
                status: isDisabled ? 'disabled' : (itemId ? 'active' : 'empty'),
                ...(type === 'after_paragraph' && { args: { paragraph: paragraphNum } }),
            });

            if (result?.success && result?.data?.id) {
                addNotification(__('Placement duplicated!', 'advajra'), 'success');
                navigate('/placements');
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

    // Delete
    const handleDelete = async () => {
        if (!window.confirm('Delete this placement?')) return;

        try {
            await dispatchDelete(parseInt(id, 10));
            navigate('/placements');
        } catch (err) {
            console.error(err);
            alert('Failed to delete');
        }
    };

    // Description text
    const descriptionText = useMemo(() => {
        const desc = TYPE_DESCRIPTIONS[type];
        if (typeof desc === 'function') return desc(paragraphNum);
        return desc || '';
    }, [type, paragraphNum]);

    const accentColor = TYPE_COLORS[type] || '#6366f1';

    if (isLoading) {
        return <div className="av-loading-container"><Spinner /></div>;
    }

    return (
        <div className="av-edit-page">
            {/* ── Pill Toolbar (shared pattern from _ad-editor.scss) ── */}
            <div className="advajra-editor-toolbar">
                <div className="toolbar-left">
                    <Button icon={chevronLeft} className="back-btn" onClick={() => navigate('/placements')} label="Back" />
                    <div className="ad-identity-group">
                        <input
                            type="text"
                            className="toolbar-title-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Placement Name"
                        />
                    </div>
                    {saveStatus === 'saved' && <span className="av-save-pill is-saved">✓ Saved</span>}
                    {saveStatus === 'error' && <span className="av-save-pill is-error">Save failed</span>}
                </div>
                <div className="toolbar-right">
                    <button
                        className={`av-status-badge ${isDisabled ? 'is-disabled' : 'is-active'}`}
                        onClick={() => setIsDisabled(!isDisabled)}
                        title={isDisabled ? 'Click to activate' : 'Click to disable'}
                    >
                        <span className="av-status-dot" />
                        {isDisabled ? 'Disabled' : 'Active'}
                    </button>
                    <button
                        className="av-toolbar-action"
                        onClick={isPro ? handleDuplicate : undefined}
                        disabled={!isPro}
                        title={isPro ? 'Duplicate' : 'Duplicate (PRO)'}
                    >
                        <Icon icon={copy} size={18} />
                        {!isPro && <span className="pro-badge">PRO</span>}
                    </button>
                    <button className="av-toolbar-action is-destructive" onClick={handleDelete} title="Delete">
                        <Icon icon={trash} size={18} />
                    </button>
                    <Button
                        isPrimary
                        className="save-btn"
                        isBusy={isSaving}
                        onClick={handleSave}
                    >
                        <SaveActionIcon size={16} />
                        <span style={{ marginLeft: '8px' }}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </span>
                    </Button>
                </div>
            </div>

            {/* ── Split Panel ── */}
            <div className="av-edit-layout">
                {/* LEFT: Settings */}
                <div className="av-settings-col">
                    <div className="av-settings-section">
                        <h3 className="av-section-title">Position</h3>
                        <SmartSelect
                            options={TYPE_OPTIONS}
                            value={type}
                            onChange={setType}
                            className="av-edit-select"
                        />
                        {type === 'after_paragraph' && (
                            <div className="av-paragraph-field">
                                <label>After paragraph</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={paragraphNum}
                                    onChange={(e) => setParagraphNum(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                />
                            </div>
                        )}
                    </div>

                    {/* Display Section */}
                    <div className="av-settings-section">
                        <h3 className="av-section-title">Display</h3>
                        <SmartSelect
                            options={itemOptions}
                            value={currentItemValue}
                            onChange={handleItemChange}
                            className="av-edit-select"
                        />
                        <AdPreviewCard
                            itemId={itemId}
                            itemType={itemType}
                            ads={ads}
                            groups={groups}
                        />
                    </div>

                    {/* Shortcode (conditional) */}
                    {type === 'shortcode' && (
                        <div className="av-settings-section">
                            <ShortcodeBox placementId={id} />
                        </div>
                    )}
                </div>

                {/* RIGHT: Preview */}
                <div className="av-preview-col">
                    <div className="av-preview-toolbar">
                        <span className="av-preview-label">Preview</span>
                        <div className="av-device-toggle">
                            <Button
                                icon={desktop}
                                isSmall
                                isPressed={!isMobile}
                                onClick={() => setIsMobile(false)}
                                label="Desktop"
                            />
                            <Button
                                icon={mobile}
                                isSmall
                                isPressed={isMobile}
                                onClick={() => setIsMobile(true)}
                                label="Mobile"
                            />
                        </div>
                    </div>

                    <div className="av-simulator-stage">
                        <div className={`av-simulator-frame ${isMobile ? 'is-mobile' : 'is-desktop'}`}>
                            <div className="av-simulator-screen">
                                <PageMockup
                                    type={type}
                                    paragraphNum={paragraphNum}
                                    isMobile={isMobile}
                                    accentColor={accentColor}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="av-preview-callout">
                        <span className="av-callout-icon" style={{ color: accentColor }}>ℹ</span>
                        <p className="av-callout-text">{descriptionText}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlacementEdit;
