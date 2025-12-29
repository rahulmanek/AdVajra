/**
 * Views/GalleryView.js
 */
import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid } from 'react-window';
import { Icon } from '@wordpress/components';
import { edit, trash, copy } from '@wordpress/icons';
import { STATUS_CONFIG } from '../AdSchema';
import Sparkline from '../../../components/Sparkline';
import Tooltip from '../../../components/Tooltip';
import { AdvajraAnalyticsIcon } from '../../../components/AdvajraIcons';

// --- CARD DIMENSIONS ---
const CARD_WIDTH = 300; // Min card width
const CARD_HEIGHT = 340; // Fixed card height for virtualization
const GAP = 24; // Gap between cards

// --- AD PREVIEW COMPONENT ---
// Intelligent preview renderer based on ad type
const AdPreview = memo(({ item, isHovered }) => {
    const [imageError, setImageError] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const iframeRef = useRef(null);

    const imageUrl = item.image || null;
    const content = item.content || '';
    const adTypesRegistry = (typeof window !== 'undefined' && window.advajraSettings && window.advajraSettings.adTypes) ? window.advajraSettings.adTypes : {};

    // Determine ad type with registry-aware default (prefer 'plain')
    const registryKeys = Object.keys(adTypesRegistry || {});
    const defaultType = registryKeys.includes('plain') ? 'plain' : (registryKeys.length ? registryKeys[0] : 'plain');
    const adType = item.type || defaultType;

    // Palette used to generate type-specific visuals when explicit mapping is not available.
    const gradientsPalette = [
        'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
        'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
        'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)',
        'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(75, 85, 99, 0.1) 100%)'
    ];
    const borderPalette = [
        'rgba(59, 130, 246, 0.3)',
        'rgba(168, 85, 247, 0.3)',
        'rgba(245, 158, 11, 0.3)',
        'rgba(107, 114, 128, 0.3)'
    ];

    // Build mapping for available ad types (falls back to palette by index)
    const typeGradients = {};
    const typeBorderColors = {};
    if (registryKeys.length) {
        registryKeys.forEach((key, i) => {
            typeGradients[key] = gradientsPalette[i % gradientsPalette.length];
            typeBorderColors[key] = borderPalette[i % borderPalette.length];
        });
    } else {
        // Fallback to keep legacy visuals when registry is empty
        typeGradients.image = gradientsPalette[0];
        typeGradients.rich = gradientsPalette[1];
        typeGradients.plain = gradientsPalette[2];

        typeBorderColors.image = borderPalette[0];
        typeBorderColors.rich = borderPalette[1];
        typeBorderColors.plain = borderPalette[2];
    }

    // Helper to render type-specific indicator
    const renderTypeBadge = () => {
        const meta = adTypesRegistry[adType] || {};
        // Note: meta.icon is a WordPress dashicon name (e.g., 'image', 'edit'), not an emoji
        // For simplicity, just show the label in the badge
        const label = meta.label || (adType.charAt(0).toUpperCase() + adType.slice(1));
        return (
            <div className={`gallery-preview__type-indicator ${adType}`}>
                <span className="type-label">{label}</span>
            </div>
        );
    };

    // Detect if content contains server-side code (PHP, shortcodes) that can't render in browser
    const containsServerCode = (str) => {
        if (!str) return false;
        return str.includes('<?php') ||
               str.includes('<?=') ||
               str.includes('[') && str.includes(']') || // Shortcodes
               str.includes('do_shortcode');
    };

    const isServerSideContent = adType === 'plain' && content && containsServerCode(content);

    let previewContent = null;

    // Renders image preview
    if (adType === 'image' && imageUrl && !imageError) {
        previewContent = (
            <div className={`gallery-preview gallery-preview--image ${isHovered ? 'is-zoomed' : ''}`}>
                <div className="gallery-preview__gradient-border" style={{ borderColor: typeBorderColors.image }} />
                <img
                    src={imageUrl}
                    alt={item.title?.raw || 'Ad preview'}
                    loading="lazy"
                    onError={() => setImageError(true)}
                    className="gallery-preview__img"
                />
                <div className="gallery-preview__shine" />
            </div>
        );
    }
    // Renders rich/plain content preview with sandboxed iframe (only for browser-renderable content)
    else if ((adType === 'rich' || (adType === 'plain' && !isServerSideContent)) && content) {
        // Create sandboxed HTML document
        const sandboxedHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body {
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 14px;
                        line-height: 1.5;
                        background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
                    }
                    body {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 12px;
                    }
                    .content-wrapper {
                        max-width: 100%;
                        max-height: 100%;
                        overflow: hidden;
                        transform: scale(0.85);
                        transform-origin: center center;
                    }
                    img { max-width: 100%; height: auto; }
                    a { color: #6366f1; text-decoration: none; pointer-events: none; }
                </style>
            </head>
            <body>
                <div class="content-wrapper">${content}</div>
            </body>
            </html>
        `;

        previewContent = (
            <div className={`gallery-preview gallery-preview--${adType} ${isHovered ? 'is-zoomed' : ''}`}>
                <div className="gallery-preview__gradient-border" style={{ borderColor: typeBorderColors[adType] }} />
                <div className="gallery-preview__iframe-container">
                    {!iframeLoaded && (
                        <div className="gallery-preview__loader">
                            <div className="loader-shimmer" />
                        </div>
                    )}
                    <iframe
                        ref={iframeRef}
                        srcDoc={sandboxedHtml}
                        title="Ad preview"
                        sandbox="allow-same-origin"
                        loading="lazy"
                        onLoad={() => setIframeLoaded(true)}
                        className="gallery-preview__iframe"
                    />
                </div>
                <div className="gallery-preview__glass-overlay" />
            </div>
        );
    }
    // Fallback placeholder
    else {
        const meta = adTypesRegistry[adType] || {};
        // Show special icon for server-side code
        const placeholderIcon = isServerSideContent ? '⚙️' : (meta.icon || '📝');
        const placeholderLabel = isServerSideContent ? 'Server Code' : (meta.label || 'Ad');
        const placeholderHint = isServerSideContent ? 'PHP/Shortcode - renders on frontend' : 'No content yet';

        previewContent = (
            <div className={`gallery-preview gallery-preview--placeholder ${adType}`} style={{ background: typeGradients[adType] }}>
                <div className="gallery-preview__gradient-border" style={{ borderColor: typeBorderColors[adType] }} />
                <div className="gallery-preview__placeholder-content">
                    <span className="placeholder-icon-large">{placeholderIcon}</span>
                    <span className="placeholder-label">{placeholderLabel}</span>
                    {(!content && !imageUrl) || isServerSideContent ? (
                        <span className="placeholder-hint">{placeholderHint}</span>
                    ) : null}
                </div>
                <div className="gallery-preview__ambient-glow" />
            </div>
        );
    }

    return (
        <React.Fragment>
            {previewContent}
            {renderTypeBadge()}
        </React.Fragment>
    );
});


// --- GALLERY CARD COMPONENT ---
const GalleryCard = memo(({
    item,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onDuplicate,
    navigate,
    isPro,
    style, // Style from virtualization (position)
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Get status config
    const now = new Date();
    let statusKey = item.status;
    if (item.status === 'publish' && item.start_date) {
        const startDate = new Date(item.start_date);
        if (startDate > now) statusKey = 'future';
    }
    const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG['draft'];
    const isPublished = statusKey === 'publish';

    const title = item.title?.raw || item.title || 'Untitled';

    // Selection ring color (use primary indigo)
    const selectionRingStyle = isSelected ? {
        boxShadow: `0 0 0 3px rgba(79, 70, 229, 0.5), 0 12px 40px rgba(0, 0, 0, 0.15)`
    } : {};

    // Checkbox background when selected
    const checkboxStyle = isSelected ? {
        background: '#10b981',
        borderColor: '#10b981',
    } : {};

    // Combine virtualization style with card styling
    const cardStyle = {
        ...style,
        // Add padding inside the cell for gap effect
        padding: `${GAP / 2}px`,
        boxSizing: 'border-box',
    };

    return (
        <div style={cardStyle}>
            <div
                className={`gallery-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                style={selectionRingStyle}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => onEdit(item.id)}
                tabIndex={0}
                role="gridcell"
                aria-selected={isSelected}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onEdit(item.id);
                    if (e.key === ' ') { e.preventDefault(); onSelect(item.id); }
                }}
            >
                {/* Selection Checkbox */}
                <div
                    className={`gallery-card__checkbox ${isSelected ? 'checked' : ''}`}
                    style={checkboxStyle}
                    onClick={(e) => { e.stopPropagation(); onSelect(item.id, e); }}
                >
                    <svg viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                </div>

                {/* Ad Preview - The Star of the Show */}
                <div className="gallery-card__image">
                    <AdPreview item={item} isHovered={isHovered} />

                    {/* Hover Overlay with Quick Actions */}
                    <div className="gallery-card__overlay">
                        <div className="quick-actions">
                            <Tooltip content="Edit">
                                <button
                                    className="quick-action edit"
                                    onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
                                >
                                    <Icon icon={edit} />
                                </button>
                            </Tooltip>

                            <Tooltip content={isPro ? "Duplicate" : "Duplicate (PRO)"}>
                                <button
                                    className={`quick-action duplicate ${!isPro ? 'pro-locked' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); isPro && onDuplicate(item.id); }}
                                >
                                    <Icon icon={copy} />
                                    {!isPro && <span className="pro-badge">PRO</span>}
                                </button>
                            </Tooltip>
                            <Tooltip content="Analytics">
                                <button
                                    className="quick-action analytics"
                                    onClick={(e) => { e.stopPropagation(); navigate('/analytics'); }}
                                >
                                    <Icon icon={AdvajraAnalyticsIcon} />
                                </button>
                            </Tooltip>
                            <Tooltip content="Delete">
                                <button
                                    className="quick-action delete"
                                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                >
                                    <Icon icon={trash} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {/* Card Body */}
                <div className="gallery-card__body">
                    <h4 className="gallery-card__title" title={title}>
                        {title}
                    </h4>
                    <div className="gallery-card__meta-row">
                        <div className="gallery-card__meta-left">
                            <span className={`av-status-dot ${statusKey}`} />
                            <span className="status-label">{statusConfig.label}</span>
                            <span className="separator">•</span>
                            <span className="ad-id">#{item.id}</span>
                        </div>
                    </div>
                </div>

                {/* Card Footer with Stats */}
                <div className="gallery-card__footer">
                    <div className="stats-row">
                        <div className="stat">
                            <span className="stat-value">{(item.impressions || 0).toLocaleString()}</span>
                            <span className="stat-label">IMPR</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{(item.clicks || 0).toLocaleString()}</span>
                            <span className="stat-label">CLICKS</span>
                        </div>
                        <div className="stat ctr">
                            <span className={`stat-value ${(item.ctr || 0) >= 2 ? 'good' : (item.ctr || 0) >= 1 ? 'mid' : ''}`}>
                                {item.ctr || 0}%
                            </span>
                            <span className="stat-label">CTR</span>
                        </div>
                    </div>
                    <div className="sparkline-container">
                        <Sparkline
                            width={60}
                            height={24}
                            color={isPublished ? '#10b981' : '#94a3b8'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- SKELETON LOADING CARD ---
const SkeletonCard = ({ style }) => (
    <div style={{ ...style, padding: `${GAP / 2}px`, boxSizing: 'border-box' }}>
        <div className="gallery-card skeleton">
            <div className="gallery-card__image skeleton-image" />
            <div className="gallery-card__body">
                <div className="skeleton-title" />
                <div className="skeleton-meta" />
            </div>
            <div className="gallery-card__footer">
                <div className="skeleton-stats" />
            </div>
        </div>
    </div>
);

// --- EMPTY STATE ---
const EmptyState = () => (
    <div className="gallery-empty-state">
        <div className="empty-icon">🎨</div>
        <h3>No Ads Yet</h3>
        <p>Create your first ad to see it displayed here in the gallery.</p>
    </div>
);

// --- VIRTUALIZED CELL RENDERER ---
// Note: cellComponent receives { columnIndex, rowIndex, style, ariaAttributes } + cellProps
const CellComponent = ({ columnIndex, rowIndex, style, ariaAttributes, ...cellProps }) => {
    const { items, columnCount, selectedIds, onSelect, onEdit, onDelete, onDuplicate, navigate, isPro } = cellProps;
    const index = rowIndex * columnCount + columnIndex;

    // Handle empty cells (last row might not be full)
    if (index >= items.length) {
        return <div style={style} {...ariaAttributes} />;
    }

    const item = items[index];

    return (
        <GalleryCard
            item={item}
            isSelected={selectedIds?.has(item.id) || false}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            navigate={navigate}
            isPro={isPro}
            style={style}
        />
    );
};

// --- MAIN GALLERY VIEW COMPONENT ---
// Selection state now received from parent (AdList.js)
// VIRTUALIZED with react-window Grid for performance
const GalleryView = ({
    schema,
    data,
    visibleColumns,
    isLoading = false,
    // Selection props from parent
    selectedIds,
    onSelect,
    // Action handlers from parent
    onEdit,
    onDelete,
    onDuplicate,
    isPro,
}) => {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Measure container size for virtualization
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

    // Calculate grid dimensions
    const columnCount = useMemo(() => {
        if (dimensions.width === 0) return 1;
        // Calculate how many columns fit (accounting for gap)
        return Math.max(1, Math.floor((dimensions.width + GAP) / (CARD_WIDTH + GAP)));
    }, [dimensions.width]);

    const rowCount = useMemo(() => {
        return Math.ceil(data.length / columnCount);
    }, [data.length, columnCount]);

    // Column width - distribute evenly
    const columnWidth = useMemo(() => {
        if (dimensions.width === 0 || columnCount === 0) return CARD_WIDTH;
        return dimensions.width / columnCount;
    }, [dimensions.width, columnCount]);

    // Bundle data for cell renderer (passed as cellProps)
    const cellProps = useMemo(() => ({
        items: data,
        columnCount,
        selectedIds,
        onSelect,
        onEdit,
        onDelete,
        onDuplicate,
        navigate,
        isPro,
    }), [data, columnCount, selectedIds, onSelect, onEdit, onDelete, onDuplicate, navigate, isPro]);

    // Loading state with skeleton grid
    if (isLoading) {
        return (
            <div className="gallery-view">
                <div className="gallery-grid" role="grid" aria-label="Loading...">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonCard key={i} style={{}} />
                    ))}
                </div>
            </div>
        );
    }

    // Empty state
    if (data.length === 0) {
        return (
            <div className="gallery-view">
                <EmptyState />
            </div>
        );
    }

    return (
        <div className="gallery-view gallery-view--virtualized">
            {/* Virtualized Gallery Grid */}
            <div
                ref={containerRef}
                className="gallery-grid-container"
                role="grid"
                aria-label="Ads Gallery"
            >
                {dimensions.height > 0 && dimensions.width > 0 && (
                    <Grid
                        columnCount={columnCount}
                        columnWidth={columnWidth}
                        height={dimensions.height}
                        rowCount={rowCount}
                        rowHeight={CARD_HEIGHT}
                        width={dimensions.width}
                        cellComponent={CellComponent}
                        cellProps={cellProps}
                    />
                )}
            </div>

            {/* NOTE: Bulk HUD removed - now rendered by parent (AdList.js) */}
        </div>
    );
};

export default GalleryView;
