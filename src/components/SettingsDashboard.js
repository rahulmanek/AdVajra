/**
 * Settings Dashboard
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PRICING_URL } from '../utils/urls';
import apiFetch from '@wordpress/api-fetch';
import { useParams, useNavigate } from 'react-router-dom';
import { Slot } from '@wordpress/components';
import { useNotification } from '../context/NotificationDataCtx';
import { applyFilters, doAction } from '../hooks';
import ModulesGrid from './ModulesGrid';
import Tooltip from './Tooltip';
import DrillDownPanel from './DrillDownPanel';
import Switch from './Switch';
import IpBlockerSettings from './IpBlockerSettings';
import AdsTxtManager from './AdsTxtManager';
import CustomCodeManager from './CustomCodeManager';

// ===========================================
// CATEGORY DEFINITIONS (Base - can be extended via hooks)
// ===========================================
const BASE_CATEGORIES = [
    {
        id: 'defaults',
        icon: '🎯',
        title: 'Defaults',
        description: 'New ad defaults',
        isPro: false,

    },
    {
        id: 'display_audience',
        icon: '👁️',
        title: 'Display & Audience',
        description: 'Where and who sees ads',
        isPro: false,

    },

    {
        id: 'performance',
        icon: '⚡',
        title: 'Performance',
        description: 'Speed & optimization',
        isPro: true,

    },
    {
        id: 'privacy',
        icon: '🔐',
        title: 'Privacy',
        description: 'GDPR & consent',
        isPro: true,

    },
    {
        id: 'analytics',
        icon: '📈',
        title: 'Analytics',
        description: 'Tracking & reports',
        isPro: true,

    },
    {
        id: 'advanced',
        icon: '⚙️',
        title: 'Advanced',
        description: 'Code & integrations',
        isPro: false,

    },

];

// Allow PRO plugin to add/modify categories
// Usage: window.advajraHooks.addFilter('advajra.settings.categories', 'advajra-pro/settings', fn)
const getCategories = () => applyFilters('advajra.settings.categories', BASE_CATEGORIES);

// ===========================================
// STRATEGY PRESETS
// ===========================================
const PRESETS = [
    {
        id: 'maximum',
        title: 'Maximum Revenue',
        desc: 'Show ads everywhere',
        icon: '💰',
        gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        config: window.advajraSettings?.presets?.maximum
    },
    {
        id: 'balanced',
        title: 'Balanced',
        desc: 'Best of both worlds',
        icon: '✨',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        recommended: true,
        config: window.advajraSettings?.presets?.balanced
    },
    {
        id: 'minimal',
        title: 'Minimal',
        desc: 'Less ads, better UX',
        icon: '💎',
        gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        config: window.advajraSettings?.presets?.minimal
    },

    {
        id: 'custom',
        title: 'Custom',
        desc: 'Your own rules',
        icon: '🎨',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        config: null
    }
];

// ===========================================
// STRATEGY COMPARISON PANEL (FREE Settings Only)
// PRO plugin injects additional categories via window.advajraSettings.proComparisonSettings
// ===========================================
const FREE_COMPARISON_SETTINGS = [
    { category: 'display', icon: '📍', title: 'Display', settings: [
        { key: 'disable_homepage', label: 'Homepage' },
        { key: 'disable_posts', label: 'Posts' },
        { key: 'disable_pages', label: 'Pages' },
        { key: 'disable_archives', label: 'Archives' },
        { key: 'disable_search', label: 'Search' },
        { key: 'disable_404', label: '404 Pages' },
        { key: 'disable_rss', label: 'RSS Feed' },
    ]},
    { category: 'audience', icon: '👥', title: 'Audience', settings: [
        { key: 'hidden_roles', label: 'Hidden Roles', isArray: true },
    ]},
    { category: 'protection', icon: '🛡️', title: 'Protection', settings: [
        { key: 'hide_from_bots', label: 'Bot Blocking', isPositive: true },
    ]},
];

// Merge FREE + PRO comparison settings
const getComparisonSettings = () => {
    const proSettings = window.advajraSettings?.proComparisonSettings || [];
    return [...FREE_COMPARISON_SETTINGS, ...proSettings];
};

const StrategyComparisonPanel = ({ settings, onApply, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);

    // Handle close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => onClose(), 200); // Match animation duration
    };

    // Get preset value for a setting
    const getPresetValue = (preset, key) => {
        if (preset.id === 'custom') {
            return settings?.[key];
        }
        return preset.config?.[key];
    };

    // Render cell value based on setting type
    const renderValue = (setting, value) => {
        // Numeric values (e.g., sync_interval)
        if (setting.isNumeric) {
            return <span className="numeric-value">{value}{setting.unit}</span>;
        }
        // Array values (e.g., hidden_roles)
        if (setting.isArray) {
            const arr = value || [];
            if (arr.length === 0) return <span className="array-value">None</span>;
            return <span className="array-value">{arr.length} role{arr.length > 1 ? 's' : ''}</span>;
        }
        // Boolean - Display settings (false = ON, true = OFF)
        if (!setting.isPositive) {
            return value === false || value === undefined ? '✅' : '❌';
        }
        // Boolean - Positive settings (true = ON)
        return value === true ? '✅' : '❌';
    };

    // Check if value differs from current setting (for highlighting)
    const isDifferentFromCurrent = (key, value) => {
        const currentValue = settings?.[key];
        // Handle arrays
        if (Array.isArray(value) || Array.isArray(currentValue)) {
            const arr1 = value || [];
            const arr2 = currentValue || [];
            if (arr1.length !== arr2.length) return true;
            return !arr1.every(v => arr2.includes(v));
        }
        return currentValue !== value;
    };

    // Get CSS class for cell - highlight if different from current
    const getCellClass = (setting, value, presetId) => {
        const classes = [];

        // Skip highlighting for custom (it IS the current)
        const shouldHighlight = presetId !== 'custom' && isDifferentFromCurrent(setting.key, value);

        if (setting.isNumeric || setting.isArray) {
            if (shouldHighlight) classes.push('highlight-change');
            return classes.join(' ');
        }

        // Determine enabled/disabled state
        const isEnabled = setting.isPositive ? value === true : (value === false || value === undefined);
        classes.push(isEnabled ? 'enabled' : 'disabled');

        // Add highlight if different from current
        if (shouldHighlight) classes.push('highlight-change');

        return classes.join(' ');
    };

    return (
        <div className={`comparison-panel ${isClosing ? 'closing' : ''}`}>
            <div className="comparison-header">
                <div className="comparison-title">
                    <span className="comparison-icon">📊</span>
                    <span>Compare Strategies</span>
                </div>
                <div className="comparison-legend">
                    <span className="legend-item legend-highlight">Highlighted = Will change</span>
                </div>
                <button className="comparison-close" onClick={handleClose}>×</button>
            </div>

            <div className="comparison-table">
                {/* Header Row */}
                <div className="comparison-row header-row">
                    <div className="comparison-cell label-cell">Setting</div>
                    {PRESETS.map(preset => (
                        <div key={preset.id} className={`comparison-cell preset-header ${preset.id}`}>
                            <span className="preset-emoji">{preset.icon}</span>
                            <span className="preset-name">{preset.title}</span>
                            {preset.id === 'custom' && <span className="current-badge">You</span>}
                        </div>
                    ))}
                </div>

                {/* Settings Rows */}
                {getComparisonSettings().map(category => (
                    <div key={category.category} className="comparison-category">
                        <div className="category-header-row">
                            <span className="category-icon">{category.icon}</span>
                            <span className="category-name">{category.title}</span>
                            {category.isPro && <span className="pro-tag">PRO</span>}
                        </div>
                        {category.settings.map(setting => (
                            <div key={setting.key} className="comparison-row">
                                <div className="comparison-cell label-cell">
                                    {setting.label}
                                </div>
                                {PRESETS.map(preset => {
                                    const value = getPresetValue(preset, setting.key);
                                    return (
                                        <div
                                            key={preset.id}
                                            className={`comparison-cell value-cell ${getCellClass(setting, value, preset.id)}`}
                                        >
                                            {renderValue(setting, value)}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                ))}

                {/* Apply Row */}
                <div className="comparison-row action-row">
                    <div className="comparison-cell label-cell">
                        <button className="done-close-btn" onClick={handleClose}>
                            Close
                        </button>
                    </div>
                    {PRESETS.map(preset => {
                        const isActive = settings?.active_preset === preset.id;
                        return (
                            <div key={preset.id} className="comparison-cell action-cell">
                                {isActive ? (
                                    <span className="current-indicator">Current ✓</span>
                                ) : (
                                    <button
                                        className="apply-preset-btn"
                                        onClick={() => onApply(preset)}
                                    >
                                        Apply
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ProgressDots removed - no longer needed
// Card color differentiation is sufficient for status indication

// CATEGORY CARD COMPONENT
// Simplified: No progress dots, no checkmarks, no X/Y counts
// Color alone indicates status (green = customized, gray = defaults)
// ===========================================
const CategoryCard = ({ category, settings, onClick }) => {
    const isPro = window.advajraSettings?.isPro || false;
    const isLocked = category.isPro && !isPro;

    return (
        <button
            type="button"
            className={`category-card ${isLocked ? 'locked' : ''}`}
            onClick={() => onClick(category.id)}
            title={isLocked ? 'Unlock advanced features with PRO to maximize your ad revenue' : ''}
        >
            {isLocked && <span className="pro-badge">🔒 PRO</span>}

            <span className="card-icon">{category.icon}</span>
            <span className="card-title">{category.title}</span>
            <span className="card-desc">{category.description}</span>

            <span className={`card-action ${isLocked ? 'upgrade' : ''}`}>
                {isLocked ? 'Upgrade to PRO' : 'Configure →'}
            </span>
        </button>
    );
};

// ===========================================
// TOGGLE CARD COMPONENT (Reusable)
// ===========================================
const ToggleCard = ({ icon, label, isEnabled, onClick, size = 'normal' }) => (
    <button
        className={`toggle-card ${isEnabled ? 'enabled' : 'disabled'} size-${size}`}
        onClick={onClick}
    >
        <span className="toggle-icon">{icon}</span>
        <span className="toggle-label">{label}</span>
        <span className={`toggle-status ${isEnabled ? 'on' : 'off'}`}>
            {isEnabled ? 'ON' : 'OFF'}
        </span>
    </button>
);

// ===========================================
// TOGGLE ROW COMPONENT (For switches)
// ===========================================
const ToggleRow = ({ icon, title, description, isEnabled, onClick, badge, isLocked }) => (
    <div className={`toggle-row ${isEnabled ? 'active' : ''} ${isLocked ? 'locked' : ''}`}>
        <div className="toggle-row-info">
            <span className="toggle-row-icon">{icon}</span>
            <div className="toggle-row-text">
                <span className="toggle-row-title">{title}</span>
                <span className="toggle-row-desc">{description}</span>
            </div>
        </div>
        {badge ? (
            <span className="toggle-row-badge">{badge}</span>
        ) : (
            <button
                className={`toggle-switch ${isEnabled ? 'on' : 'off'}`}
                onClick={onClick}
                disabled={isLocked}
            >
                <span className="switch-track">
                    <span className="switch-thumb"></span>
                </span>
                <span className="switch-label">{isEnabled ? 'ON' : 'OFF'}</span>
            </button>
        )}
    </div>
);



// ===========================================
// DISPLAY & AUDIENCE PANEL
// ===========================================
const DisplayAudiencePanel = ({ settings, updateSetting, onBack }) => {
    const PAGE_TYPES = [
        { key: 'disable_homepage', label: 'Homepage', icon: '🏠', desc: 'Front page of your site' },
        { key: 'disable_posts', label: 'Posts', icon: '📝', desc: 'Single blog posts' },
        { key: 'disable_pages', label: 'Pages', icon: '📄', desc: 'Static pages' },
        { key: 'disable_archives', label: 'Archives', icon: '🗂️', desc: 'Category, tag, date pages' },
        { key: 'disable_search', label: 'Search', icon: '🔍', desc: 'Search results page' },
        { key: 'disable_404', label: '404', icon: '❌', desc: 'Page not found' },
        { key: 'disable_rss', label: 'RSS Feed', icon: '📡', desc: 'RSS/Atom feeds' },
    ];

    const enabledCount = PAGE_TYPES.filter(p => !settings[p.key]).length;

    const userRoles = window.advajraSettings?.userRoles || [];
    const hiddenRoles = settings?.hidden_roles || [];

    const toggleRole = (roleSlug) => {
        const newHidden = hiddenRoles.includes(roleSlug)
            ? hiddenRoles.filter(r => r !== roleSlug)
            : [...hiddenRoles, roleSlug];
        updateSetting('hidden_roles', newHidden);
    };

    return (
        <DrillDownPanel
            icon="👁️"
            title="Display & Audience Settings"
            subtitle="Control exactly where and to whom your ads appear"
            statusText={`${enabledCount}/${PAGE_TYPES.length} active`}
            onBack={onBack}
        >

            <div className="panel-section">
                <div className="section-header">
                    <h4>📍 Page Types</h4>
                    <p className="section-desc">Toggle which page types show ads</p>
                </div>

                <div className="toggle-grid large">
                    {PAGE_TYPES.map(page => {
                        const isEnabled = !settings[page.key];
                        return (
                            <button
                                key={page.key}
                                className={`toggle-card-large ${isEnabled ? 'enabled' : 'disabled'}`}
                                onClick={() => updateSetting(page.key, !settings[page.key])}
                            >
                                <div className="toggle-card-header">
                                    <span className="toggle-icon">{page.icon}</span>
                                    <span className={`toggle-status ${isEnabled ? 'on' : 'off'}`}>
                                        {isEnabled ? '✓' : '✗'}
                                    </span>
                                </div>
                                <span className="toggle-label">{page.label}</span>
                                <span className="toggle-desc">{page.desc}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="section-divider" style={{ borderTop: '1px solid #e5e7eb', margin: '24px 0' }} />

            <div className="panel-section">
                <div className="section-header">
                    <h4>👥 User Roles</h4>
                    <p className="section-desc">Toggle ad visibility for logged-in users by role</p>
                </div>

                <div className="toggle-grid">
                    {userRoles.map(role => {
                        const isVisible = !hiddenRoles.includes(role.slug);
                        return (
                            <ToggleCard
                                key={role.slug}
                                icon={role.icon}
                                label={role.name}
                                isEnabled={isVisible}
                                onClick={() => toggleRole(role.slug)}
                            />
                        );
                    })}
                </div>
            </div>
        </DrillDownPanel>
    );
};



// ===========================================
// PERFORMANCE PANEL (PRO)
// ===========================================
const PerformancePanel = ({ settings, updateSetting, onBack }) => {
    const isPro = window.advajraSettings?.isPro || false;

    return (
        <DrillDownPanel
            icon="⚡"
            title="Performance Settings"
            subtitle="Optimize ad loading for better page speed"
            headerRight={!isPro && <span className="pro-header-badge">🔒 PRO</span>}
            onBack={onBack}
        >

            <div className="panel-section">
                <ToggleRow
                    icon="⏳"
                    title="Lazy Load Ads"
                    description="Load ads only when they come into view"
                    isEnabled={settings?.lazy_loading}
                    onClick={() => isPro && updateSetting('lazy_loading', !settings?.lazy_loading)}
                    isLocked={!isPro}
                />

                <ToggleRow
                    icon="📜"
                    title="Defer Ad Scripts"
                    description="Load ad scripts after page content"
                    isEnabled={settings?.defer_scripts}
                    onClick={() => isPro && updateSetting('defer_scripts', !settings?.defer_scripts)}
                    isLocked={!isPro}
                />

                <ToggleRow
                    icon="🔄"
                    title="Cache Busting"
                    description="Ensure fresh ads are served from cache"
                    isEnabled={settings?.cache_busting}
                    onClick={() => isPro && updateSetting('cache_busting', !settings?.cache_busting)}
                    isLocked={!isPro}
                />

                <ToggleRow
                    icon="📱"
                    title="AMP Compatibility"
                    description="Make ads work on AMP pages"
                    badge="COMING SOON"
                    isLocked={true}
                />
            </div>

            {!isPro && (
                <div className="upgrade-cta">
                    <span className="upgrade-icon">🚀</span>
                    <span className="upgrade-text">Upgrade to PRO to unlock all performance features</span>
                    <button className="upgrade-btn" onClick={() => window.open(PRICING_URL.settingsCard, '_blank')}>Upgrade Now</button>
                </div>
            )}
        </DrillDownPanel>
    );
};

// ===========================================
// PRIVACY PANEL (PRO)
// ===========================================
const PrivacyPanel = ({ settings, updateSetting, onBack }) => {
    const isPro = window.advajraSettings?.isPro || false;
    const detectedCmp = window.advajraSettings?.detectedCmp || null;
    const isPrivacySafe = settings?.privacy_safe_mode;

    return (
        <DrillDownPanel
            icon="🔐"
            title="Privacy Settings"
            subtitle="GDPR compliance and user consent"
            headerRight={!isPro && <span className="pro-header-badge">🔒 PRO</span>}
            onBack={onBack}
        >

            <div className="panel-section">
                {/* Privacy-Safe Mode - FIRST because it overrides everything */}
                <ToggleRow
                    icon="🛡️"
                    title="Privacy-Safe Mode"
                    description="Zero tracking - no cookies, no IP, no analytics"
                    isEnabled={isPrivacySafe}
                    onClick={() => updateSetting('privacy_safe_mode', !isPrivacySafe)}
                    isLocked={false}
                />

                {/* Show explanation when Privacy-Safe is ON */}
                {isPrivacySafe && (
                    <div style={{
                        background: '#fef3c7',
                        border: '1px solid #fcd34d',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginTop: '8px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: '#92400e',
                    }}>
                        <strong>⚠️ Maximum Privacy Enabled</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                            No tracking will occur - even if users give consent.
                            GDPR settings below are disabled because they're not needed.
                            <br /><em>Use this for children's sites, healthcare, or government sites.</em>
                        </p>
                    </div>
                )}

                <div className="section-divider" style={{
                    borderTop: '1px solid #e5e7eb',
                    margin: '16px 0',
                    opacity: isPrivacySafe ? 0.5 : 1
                }} />

                {/* GDPR Section - Disabled when Privacy-Safe is ON */}
                <div style={{ opacity: isPrivacySafe ? 0.5 : 1, pointerEvents: isPrivacySafe ? 'none' : 'auto' }}>

                    {/* PRO: Show detected CMP status */}
                    {isPro && !isPrivacySafe && (
                    <div className="cmp-status-box" style={{
                        background: detectedCmp ? '#f0fdf4' : '#fef3c7',
                        border: `1px solid ${detectedCmp ? '#86efac' : '#fcd34d'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '16px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>{detectedCmp ? detectedCmp.icon : '⚠️'}</span>
                            <div>
                                <strong style={{ color: detectedCmp ? '#166534' : '#92400e', fontSize: '14px' }}>
                                    {detectedCmp ? `✅ ${detectedCmp.name} Detected` : '⚠️ No Consent Plugin Detected'}
                                </strong>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: detectedCmp ? '#15803d' : '#b45309' }}>
                                    {detectedCmp
                                        ? 'Auto-configured! Tracking will wait for user consent.'
                                        : 'Install CookieYes, Cookiebot, or Complianz for automatic integration.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* FREE: Show info about CMP requirement */}
                {!isPro && !isPrivacySafe && (
                    <div className="privacy-info-box" style={{
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: '#0369a1'
                    }}>
                        <strong>ℹ️ How Privacy Features Work:</strong>
                        <br />
                        Configure manually below, or upgrade to PRO for <strong>auto-detection</strong> of CookieYes, Cookiebot, Complianz, and more.
                        <br />
                        Ads display normally, but <em>tracking</em> waits for user consent.
                    </div>
                )}

                <ToggleRow
                    icon="🇪🇺"
                    title="GDPR Consent Mode"
                    description={isPrivacySafe
                        ? "Disabled - Privacy-Safe Mode is active"
                        : (isPro && detectedCmp
                            ? `Auto-integrated with ${detectedCmp.name}`
                            : "Wait for consent before tracking")}
                    isEnabled={settings?.gdpr_consent_mode && !isPrivacySafe}
                    onClick={() => !isPrivacySafe && updateSetting('gdpr_consent_mode', !settings?.gdpr_consent_mode)}
                    isLocked={isPrivacySafe}
                />

                {/* Manual Cookie Config - Only show for FREE users or when no CMP detected */}
                {settings?.gdpr_consent_mode && !isPrivacySafe && (!isPro || !detectedCmp) && (
                    <div className="manual-cookie-config" style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '16px',
                        marginTop: '12px',
                        marginBottom: '16px',
                    }}>
                        <h5 style={{ margin: '0 0 8px', fontSize: '13px', color: '#475569' }}>
                            🍪 Manual Cookie Configuration
                        </h5>

                        {/* Explanation box */}
                        <div style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '12px',
                            marginBottom: '12px',
                            fontSize: '12px',
                            color: '#1e40af',
                        }}>
                            <strong>ℹ️ How this works:</strong>
                            <ol style={{ margin: '8px 0 0', paddingLeft: '16px', lineHeight: '1.6' }}>
                                <li>Install a consent plugin (CookieYes, Complianz, GDPR Cookie Consent, etc.)</li>
                                <li>That plugin shows a cookie banner to visitors</li>
                                <li>When visitors click "Accept", the plugin sets a cookie</li>
                                <li>Enter that cookie name below - AdVajra will check it before tracking</li>
                            </ol>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '180px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                                    Cookie Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., cookieyes-consent"
                                    value={settings?.consent_cookie_name || ''}
                                    onChange={(e) => updateSetting('consent_cookie_name', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: '180px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                                    Contains Value (optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., advertisement:yes"
                                    value={settings?.consent_cookie_value || ''}
                                    onChange={(e) => updateSetting('consent_cookie_value', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Common cookie names reference */}
                        <details style={{ marginTop: '12px' }}>
                            <summary style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>
                                📋 Common cookie names for popular plugins
                            </summary>
                            <div style={{
                                marginTop: '8px',
                                fontSize: '11px',
                                color: '#475569',
                                background: '#f1f5f9',
                                padding: '8px 12px',
                                borderRadius: '4px',
                            }}>
                                <div><strong>CookieYes:</strong> <code>cookieyes-consent</code></div>
                                <div><strong>Cookiebot:</strong> <code>CookieConsent</code></div>
                                <div><strong>Complianz:</strong> <code>cmplz_consent_status</code></div>
                                <div><strong>Real Cookie Banner:</strong> <code>real_cookie_banner-*</code></div>
                                <div><strong>GDPR Cookie Compliance:</strong> <code>moove_gdpr_popup</code></div>
                            </div>
                        </details>
                    </div>
                )}

                </div> {/* End of GDPR section wrapper */}
            </div>

            {/* PRO Upgrade CTA - Show what PRO adds */}
            {!isPro && (
                <div className="upgrade-cta">
                    <span className="upgrade-icon">🔮</span>
                    <span className="upgrade-text">Upgrade to PRO for auto-detection of CookieYes, Cookiebot, Complianz & more</span>
                    <button className="upgrade-btn" onClick={() => window.open(PRICING_URL.settingsCard, '_blank')}>Upgrade Now</button>
                </div>
            )}
        </DrillDownPanel>
    );
};

// ===========================================
// SYNC STATUS WIDGET
// ===========================================
const SyncStatusWidget = ({ syncInterval }) => {
    const isPro = window.advajraSettings?.isPro || false;

    const [status, setStatus]     = useState(null);   // { next_run, next_run_formatted, interval }
    const [syncState, setSyncState] = useState('idle'); // idle | loading | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const successTimer = useRef(null);

    const fetchStatus = useCallback(() => {
        apiFetch({ path: '/advajra/v1/sync-status' })
            .then(data => setStatus(data))
            .catch(() => {}); // Silent fail — widget is non-critical
    }, []);

    // Initial load + auto-refresh every 30s
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => {
            clearInterval(interval);
            if (successTimer.current) clearTimeout(successTimer.current);
        };
    }, [fetchStatus]);

    // Re-fetch when syncInterval prop changes (user picked a new interval)
    useEffect(() => {
        fetchStatus();
    }, [syncInterval, fetchStatus]);

    const handleSyncNow = async () => {
        if (!isPro || syncState === 'loading') return;

        setSyncState('loading');
        setErrorMsg('');

        try {
            const res = await apiFetch({ path: '/advajra/v1/sync-now', method: 'POST' });
            if (res?.success) {
                // Update displayed next-run time from response
                setStatus(prev => ({
                    ...prev,
                    next_run: res.next_run,
                    next_run_formatted: res.next_run_formatted,
                }));
                setSyncState('success');
                successTimer.current = setTimeout(() => setSyncState('idle'), 2500);
            } else {
                setSyncState('error');
                setErrorMsg('Sync failed. Please try again.');

            }
        } catch (err) {
            setSyncState('error');
            setErrorMsg(err?.message || 'Sync failed. Please try again.');
        }
    };

    // PRO-locked state shown to FREE users
    if (!isPro) {
        return (
            <div className="sync-status-widget sync-status-widget--locked">
                <div className="sync-status-widget__left">
                    <span className="sync-status-widget__icon">⏰</span>
                    <div className="sync-status-widget__info">
                        <span className="sync-status-widget__label">Next sync</span>
                        <span className="sync-status-widget__time">
                            {status?.next_run_formatted ? `at ${status.next_run_formatted}` : '—'}
                        </span>
                    </div>
                </div>
                <div className="sync-status-widget__right">
                    <Tooltip content="Sync Now requires AdVajra PRO" position="left">
                        <button className="sync-now-btn sync-now-btn--locked" disabled>
                            <span className="sync-now-btn__icon">⚡</span>
                            <span className="sync-now-btn__label">Sync Now</span>
                        </button>
                    </Tooltip>
                </div>
            </div>
        );
    }

    return (
        <div className={`sync-status-widget ${syncState === 'success' ? 'sync-status-widget--success' : ''}`}>
            <div className="sync-status-widget__left">
                <span className="sync-status-widget__icon">⏰</span>
                <div className="sync-status-widget__info">
                    <span className="sync-status-widget__label">Next sync</span>
                    <span className="sync-status-widget__time">
                        {status?.next_run_formatted ? `at ${status.next_run_formatted}` : 'Calculating…'}
                    </span>
                </div>
            </div>

            <div className="sync-status-widget__right">
                {syncState === 'error' && (
                    <span className="sync-status-widget__error">{errorMsg}</span>
                )}
                <button
                    className={`sync-now-btn sync-now-btn--${syncState}`}
                    onClick={handleSyncNow}
                    disabled={syncState === 'loading'}
                >
                    {syncState === 'loading' && (
                        <span className="sync-now-btn__spinner" aria-hidden="true" />
                    )}
                    {syncState === 'success' && (
                        <span className="sync-now-btn__icon">✓</span>
                    )}
                    {syncState === 'idle' || syncState === 'error' ? (
                        <span className="sync-now-btn__icon">⚡</span>
                    ) : null}
                    <span className="sync-now-btn__label">
                        {syncState === 'loading' ? 'Syncing…'
                            : syncState === 'success' ? 'Synced!'
                            : 'Sync Now'}
                    </span>
                </button>
            </div>
        </div>
    );
};

// ===========================================
// ANALYTICS PANEL (PRO)
// ===========================================
const AnalyticsPanel = ({ settings, updateSetting, onBack }) => {
    const isPro = window.advajraSettings?.isPro || false;
    const syncInterval = settings?.sync_interval || 5;

    return (
        <DrillDownPanel
            icon="📈"
            title="Analytics Settings"
            subtitle="Track ad performance and revenue"
            headerRight={!isPro && <span className="pro-header-badge">🔒 PRO</span>}
            onBack={onBack}
        >

            <div className="panel-section">
                <div className="section-header">
                    <h4>📊 Tracking</h4>
                </div>

                <ToggleRow
                    icon="👁️"
                    title="Track Impressions"
                    description="Count how many times ads are viewed"
                    isEnabled={settings?.track_impressions}
                    onClick={() => isPro && updateSetting('track_impressions', !settings?.track_impressions)}
                    isLocked={!isPro}
                />

                <ToggleRow
                    icon="👆"
                    title="Track Clicks"
                    description="Count clicks on your ads"
                    isEnabled={settings?.track_clicks}
                    onClick={() => isPro && updateSetting('track_clicks', !settings?.track_clicks)}
                    isLocked={!isPro}
                />

                <ToggleRow
                    icon="🤖"
                    title="Exclude Bots from Stats"
                    description="Don't count bot traffic in analytics"
                    isEnabled={settings?.exclude_bots_stats}
                    onClick={() => isPro && updateSetting('exclude_bots_stats', !settings?.exclude_bots_stats)}
                    isLocked={!isPro}
                />
            </div>

            {/* Sync Interval */}
            <div className="panel-section">
                <div className="section-header">
                    <h4>
                        🔄 Sync Interval
                        <Tooltip content="Tracking data (impressions, clicks) is collected in memory for speed. This setting controls how often that data gets saved to your database." position="right">
                            <span className="tooltip-icon">💡</span>
                        </Tooltip>
                    </h4>
                    <p className="section-desc">How often to save tracking data to database</p>
                </div>

                <div className={`option-buttons ${!isPro ? 'is-locked' : ''}`} style={{ opacity: isPro ? 1 : 0.6, pointerEvents: isPro ? 'auto' : 'none' }}>
                    {[
                        { value: 1,  label: '1 min - Fast',        icon: '⚡', title: 'Fastest, more DB load' },
                        { value: 5,  label: '5 min - Recommended', icon: '✓', title: 'Recommended' },
                        { value: 15, label: '15 min - Light',       icon: '🌙', title: 'Light DB load' },
                        { value: 30, label: '30 min - Minimal',     icon: '🐢', title: 'Minimal DB load' },
                    ].map(opt => (
                        <button
                            key={opt.value}
                            className={`option-btn ${syncInterval === opt.value ? 'active' : ''}`}
                            onClick={() => isPro && updateSetting('sync_interval', opt.value)}
                            title={opt.title}
                            disabled={!isPro}
                        >
                            <span className="option-icon">{opt.icon}</span>
                            <span className="option-label">{opt.label}</span>
                        </button>
                    ))}
                </div>

                {/* Sync Status Widget */}
                <SyncStatusWidget syncInterval={syncInterval} />
            </div>

            <div className="panel-section">
                <div className="section-header">
                    <h4>📧 Reports</h4>
                </div>

                <ToggleRow
                    icon="📧"
                    title="Email Reports"
                    description="Receive weekly performance summaries"
                    badge="COMING SOON"
                    isLocked={true}
                />

                <ToggleRow
                    icon="📊"
                    title="Google Analytics Integration"
                    description="Send events to your GA account"
                    badge="COMING SOON"
                    isLocked={true}
                />
            </div>

            {!isPro && (
                <div className="upgrade-cta">
                    <span className="upgrade-icon">📈</span>
                    <span className="upgrade-text">Upgrade to PRO to unlock advanced analytics</span>
                    <button className="upgrade-btn" onClick={() => window.open(PRICING_URL.settingsCard, '_blank')}>Upgrade Now</button>
                </div>
            )}
        </DrillDownPanel>
    );
};

// ===========================================
// DEBUG LOG VIEWER
// ===========================================
const DebugLogViewer = () => {
    const [lines, setLines]       = useState(null);   // null = loading, [] = empty
    const [count, setCount]       = useState(0);
    const [size, setSize]         = useState(0);
    const [maxSize, setMaxSize]   = useState(0);
    const [clearing, setClearing] = useState(false);
    const [error, setError]       = useState('');

    const fetchLog = useCallback(() => {
        setError('');
        apiFetch({ path: '/advajra/v1/debug-log' })
            .then(data => {
                setLines(data.lines || []);
                setCount(data.count || 0);
                setSize(data.size || 0);
                setMaxSize(data.max_size || 0);
            })
            .catch(() => {
                setError('Could not load log. Make sure debug mode is saved first.');
                setLines([]);
            });
    }, []);

    useEffect(() => { fetchLog(); }, [fetchLog]);

    const handleClear = async () => {
        if (!window.confirm('Clear the entire debug log?')) return;
        setClearing(true);
        try {
            await apiFetch({ path: '/advajra/v1/debug-log', method: 'DELETE' });
            setLines([]);
            setCount(0);
            setSize(0);
        } catch {
            setError('Clear failed.');
        }
        setClearing(false);
    };

    const formatBytes = (b) => {
        if (b < 1024) return `${b} B`;
        if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
        return `${(b / (1024 * 1024)).toFixed(2)} MB`;
    };

    const levelColor = (line) => {
        if (line.includes('] [ERROR]')) return '#f87171';
        if (line.includes('] [WARN]'))  return '#fbbf24';
        if (line.includes('] [INFO]'))  return '#60a5fa';
        return '#94a3b8';
    };

    return (
        <div style={{marginTop: '16px', border: '1px solid var(--av-border, #e2e8f0)', borderRadius: '10px', overflow: 'hidden'}}>

            {/* Header bar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#0f172a',
                borderBottom: '1px solid #1e293b',
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <span style={{fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace'}}>
                        advajra-debug.log
                    </span>
                    {size > 0 && (
                        <span style={{
                            fontSize: '11px', padding: '2px 6px',
                            background: '#1e293b', color: '#64748b',
                            borderRadius: '4px', fontFamily: 'monospace',
                        }}>
                            {formatBytes(size)} / {formatBytes(maxSize)}
                        </span>
                    )}
                    {count > 0 && (
                        <span style={{fontSize: '11px', color: '#475569', fontFamily: 'monospace'}}>
                            {count} line{count !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                    <button
                        onClick={fetchLog}
                        style={{
                            padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
                            background: '#1e293b', color: '#94a3b8',
                            border: '1px solid #334155', borderRadius: '5px',
                        }}
                    >↻ Refresh</button>
                    <button
                        onClick={handleClear}
                        disabled={clearing || !count}
                        style={{
                            padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
                            background: count ? 'rgba(239,68,68,0.15)' : '#1e293b',
                            color: count ? '#f87171' : '#475569',
                            border: `1px solid ${count ? 'rgba(239,68,68,0.3)' : '#334155'}`,
                            borderRadius: '5px', opacity: clearing ? 0.6 : 1,
                        }}
                    >{clearing ? 'Clearing…' : '🗑 Clear Log'}</button>
                </div>
            </div>

            {/* Log content */}
            <div style={{
                background: '#0f172a',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '12px 14px',
                fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
                fontSize: '12px',
                lineHeight: '1.7',
            }}>
                {error && (
                    <div style={{color: '#f87171', marginBottom: '8px'}}>⚠ {error}</div>
                )}
                {lines === null && (
                    <span style={{color: '#475569'}}>Loading…</span>
                )}
                {lines !== null && lines.length === 0 && !error && (
                    <span style={{color: '#475569'}}>No log entries yet. Log entries appear here when ad render errors or system events occur.</span>
                )}
                {lines !== null && lines.map((line, i) => (
                    <div key={i} style={{color: levelColor(line), wordBreak: 'break-all'}}>
                        {line}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ===========================================
// ADVANCED PANEL
// ===========================================
const AdvancedPanel = ({ settings, updateSetting, onBack, onReset }) => {
    const isPro = window.advajraSettings?.isPro || false;

    return (
        <DrillDownPanel
            icon="⚙️"
            title="Advanced Settings"
            subtitle="Code, integrations and debugging"
            onBack={onBack}
        >

            {/* Ads.txt Manager */}
            <div className="panel-section">
                <div className="section-header">
                    <h4>📄 Ads.txt</h4>
                    <p className="section-desc">Manage your site's ads.txt file</p>
                </div>
                <AdsTxtManager onChange={(content) => updateSetting('ads_txt_content', content)} />
            </div>

            {/* Debug & Tools */}
            <div className="panel-section">
                <div className="section-header">
                    <h4>
                        🔧 Debug & Tools
                        {!isPro && <span className="pro-header-badge">🔒 PRO</span>}
                    </h4>
                    <p className="section-desc">Logs are written to <code>wp-content/uploads/advajra-logs/advajra-debug.log</code></p>
                </div>

                <ToggleRow
                    icon="🪲"
                    title="Debug Mode"
                    description="Record ad render errors and system events to a private plugin log file. Disable on production when not debugging."
                    isEnabled={settings?.debug_mode}
                    onClick={() => isPro && updateSetting('debug_mode', !settings?.debug_mode)}
                    isLocked={!isPro}
                />

                {isPro && settings?.debug_mode && <DebugLogViewer />}

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '12px 12px 0 12px',
                    borderTop: '1px solid var(--av-border, #e2e8f0)',
                    marginTop: '16px'
                }}>
                    <span style={{ fontSize: '13px', color: 'var(--av-text-muted, #64748b)' }}>
                        Anonymous error reporting is used to detect server REST API issues.
                    </span>
                    <button
                        type="button"
                        onClick={() => updateSetting('telemetry_enabled', settings?.telemetry_enabled === false)}
                        style={{
                            flexShrink: 0,
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: settings?.telemetry_enabled !== false ? 'rgba(59,130,246,0.06)' : 'rgba(100,116,139,0.08)',
                            color: settings?.telemetry_enabled !== false ? '#3b82f6' : '#64748b',
                            border: `1px solid ${settings?.telemetry_enabled !== false ? 'rgba(59,130,246,0.25)' : 'rgba(100,116,139,0.2)'}`,
                            borderRadius: '6px',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>📊</span> {settings?.telemetry_enabled !== false ? 'Sharing' : 'Opted Out'}
                    </button>
                </div>

                {!isPro && (
                    <div className="upgrade-cta">
                        <span className="upgrade-icon">🔧</span>
                        <span className="upgrade-text">Upgrade to PRO to enable debug logging &amp; log viewer</span>
                        <button className="upgrade-btn" onClick={() => window.open(PRICING_URL.settingsCard, '_blank')}>Upgrade Now</button>
                    </div>
                )}
            </div>

            <div className="panel-section" style={{
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '12px',
                padding: '20px',
                background: 'rgba(239,68,68,0.02)',
            }}>
                <div className="section-header" style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚠️</span> Danger Zone
                    </h4>
                    <p className="section-desc">These actions are irreversible. Proceed with caution.</p>
                </div>

                {/* Reset Settings */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '16px', flexWrap: 'wrap',
                    padding: '14px 16px',
                    background: 'var(--av-bg-main)',
                    border: '1px solid var(--av-border)',
                    borderRadius: '10px',
                    marginBottom: '12px',
                }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--av-text-heading)', lineHeight: 1.3 }}>
                            Reset all settings to defaults
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--av-text-muted)', marginTop: '2px' }}>
                            Restores every plugin setting to its factory default. Your ads and placements are not affected.
                        </div>
                    </div>
                    <button
                        style={{
                            flexShrink: 0,
                            padding: '8px 18px',
                            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                            background: 'rgba(239,68,68,0.08)',
                            color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '8px',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                        onClick={() => {
                            if (window.confirm('Reset all plugin settings to defaults?\n\nYour ads and placements will NOT be deleted. Only settings (display rules, tracking, privacy, etc.) will be restored to their factory values.\n\nThis cannot be undone.')) {
                                onReset(window.advajraSettings?.defaults || {});
                            }
                        }}
                    >
                        🔄 Reset Settings
                    </button>
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '14px 16px',
                    background: 'var(--av-bg-main)',
                    border: `1px solid ${settings?.erase_data_on_uninstall ? 'rgba(239,68,68,0.35)' : 'var(--av-border)'}`,
                    borderRadius: '10px',
                    transition: 'border-color 0.2s ease',
                }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                        background: settings?.erase_data_on_uninstall ? 'rgba(239,68,68,0.1)' : 'var(--av-bg-surface, #f8fafc)',
                        border: `1px solid ${settings?.erase_data_on_uninstall ? 'rgba(239,68,68,0.25)' : 'var(--av-border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease',
                    }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                            stroke={settings?.erase_data_on_uninstall ? '#ef4444' : 'var(--av-text-muted)'}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: 'stroke 0.2s ease' }}>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                        </svg>
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--av-text-heading)', lineHeight: 1.3 }}>
                            Delete all plugin data on uninstall
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--av-text-muted)', marginTop: '2px' }}>
                            Permanently removes ads, placements, settings, and logs when the plugin is deleted.
                        </div>
                    </div>

                    <Switch
                        checked={!!settings?.erase_data_on_uninstall}
                        onChange={(val) => updateSetting('erase_data_on_uninstall', val)}
                        color={settings?.erase_data_on_uninstall ? 'red' : 'blue'}
                        aria-label="Delete all plugin data on uninstall"
                    />
                </div>
            </div>
        </DrillDownPanel>
    );
};

const DefaultsPanel = ({ settings, updateSetting, onBack }) => {
    const isPro = window.advajraSettings?.isPro || false;
    const trackingOptions = [
        { value: 'both', label: 'All', icon: '📊' },
        { value: 'impressions', label: 'Impressions', icon: '👁️' },
        { value: 'clicks', label: 'Clicks', icon: '👆' },
        { value: 'disabled', label: 'Disabled', icon: '🚫' },
    ];

    const targetOptions = [
        { value: '_blank', label: 'New Tab', icon: '↗️' },
        { value: '_self', label: 'Same Tab', icon: '↩️' },
    ];

    const layoutOptions = [
        { value: { mode: 'default' }, label: 'Default', icon: '📐' },
        { value: { mode: 'block' }, label: 'Block', icon: '⬛' },
        { value: { mode: 'float', align: 'left' }, label: 'Float Left', icon: '⬅️' },
        { value: { mode: 'float', align: 'right' }, label: 'Float Right', icon: '➡️' },
    ];

    const yesNoOptions = [
        { value: true, label: 'Yes', icon: '✅' },
        { value: false, label: 'No', icon: '❌' },
    ];

    // Styled option button component
    const OptionButton = ({ options, value, onChange }) => (
        <div className="option-buttons">
            {options.map((opt, i) => {
                // Handle deep equality for nested layout objects specifically
                let isActive = false;
                if (typeof opt.value === 'object' && opt.value !== null && value && typeof value === 'object') {
                    if (opt.value.mode === value.mode) {
                        if (opt.value.mode !== 'default' && opt.value.align) {
                            isActive = opt.value.align === value.align;
                        } else {
                            isActive = true;
                        }
                    }
                } else {
                    isActive = value === opt.value;
                }

                return (
                    <button
                        key={i} // Using index because value could be an object
                        className={`option-btn ${isActive ? 'active' : ''}`}
                        onClick={() => onChange(opt.value)}
                    >
                        <span className="option-icon">{opt.icon}</span>
                        <span className="option-label">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );

    return (
        <DrillDownPanel
            icon="🎯"
            title="Default Settings"
            subtitle="Configure defaults for new ads"
            tooltip="These defaults are used when you select 'Default' in the Ad Editor. You can always override them per-ad."
            onBack={onBack}
            className="defaults-panel"
        >

            {/* Tracking — PRO only */}
            <div className="panel-section">
                <div className="section-header">
                    <h4>📊 Default Tracking</h4>
                    <p className="section-desc">What to track when ad uses "Default" tracking mode</p>
                </div>
                <div className={`option-buttons ${!isPro ? 'is-locked' : ''}`} style={{ opacity: isPro ? 1 : 0.6, pointerEvents: isPro ? 'auto' : 'none' }}>
                    <OptionButton
                        options={trackingOptions}
                        value={settings?.default_tracking || 'both'}
                        onChange={(val) => isPro && updateSetting('default_tracking', val)}
                    />
                </div>
                {!isPro && (
                    <div className="upgrade-cta">
                        <span className="upgrade-icon">📊</span>
                        <span className="upgrade-text">Upgrade to PRO to configure tracking defaults</span>
                        <button className="upgrade-btn" onClick={() => window.open(PRICING_URL.settingsCard, '_blank')}>Upgrade Now</button>
                    </div>
                )}
            </div>

            {/* Target Window */}
            <div className="panel-section">
                <div className="section-header">
                    <h4>🔗 Default Link Target</h4>
                    <p className="section-desc">Where links open when ad uses "Default" target</p>
                </div>
                <OptionButton
                    options={targetOptions}
                    value={settings?.default_target || '_blank'}
                    onChange={(val) => updateSetting('default_target', val)}
                />
            </div>

            {/* Layout */}
            <div className="panel-section">
                <div className="section-header">
                    <h4>📐 Default Layout</h4>
                    <p className="section-desc">Ad positioning when layout is set to "Default"</p>
                </div>
                <OptionButton
                    options={layoutOptions}
                    value={settings?.default_layout || { mode: 'default' }}
                    onChange={(val) => updateSetting('default_layout', val)}
                />
            </div>

            {/* SEO Attributes */}
            <div className="panel-section">
                <div className="section-header">
                    <h4>🔎 SEO Link Attributes</h4>
                    <p className="section-desc">Default rel attributes for ad links</p>
                </div>

                <div className="defaults-grid">
                    <div className="default-item">
                        <div className="default-label">
                            <span className="default-icon">🚫</span>
                            <div>
                                <span className="default-title">Add nofollow</span>
                                <span className="default-desc">Adds rel="nofollow" to links</span>
                            </div>
                        </div>
                        <OptionButton
                            options={yesNoOptions}
                            value={settings?.default_nofollow ?? false}
                            onChange={(val) => updateSetting('default_nofollow', val)}
                        />
                    </div>

                    <div className="default-item">
                        <div className="default-label">
                            <span className="default-icon">💰</span>
                            <div>
                                <span className="default-title">Add sponsored</span>
                                <span className="default-desc">Adds rel="sponsored" for paid links</span>
                            </div>
                        </div>
                        <OptionButton
                            options={yesNoOptions}
                            value={settings?.default_sponsored ?? false}
                            onChange={(val) => updateSetting('default_sponsored', val)}
                        />
                    </div>
                </div>
            </div>


        </DrillDownPanel>
    );
};

// ===========================================
// MAIN SETTINGS DASHBOARD
// ===========================================
const SettingsDashboard = ({ settings, updateSetting, batchUpdateSettings, onSaveReset }) => {

    // 1. Initialize state from URL (React Router)
    const { tab } = useParams();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const activePanel = tab || null;

    // 2. Navigation Handler (Syncs State + URL)
    const handleNavigate = (panelId) => {
        if (panelId) {
            navigate(`/settings/${panelId}`);
        } else {
            navigate('/settings');
        }
    };

    // Scroll to top when panel changes
    useEffect(() => {
        if (activePanel) {
            // Wait for paint to ensure scroll works reliably
            const timer = setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [activePanel]);

    const [showComparison, setShowComparison] = useState(false);
    const activePreset = settings?.active_preset;

    const applyPreset = (preset) => {
        if (!preset.config) return;
        // Apply all preset settings + store preset name
        const newSettings = { ...preset.config, active_preset: preset.id };
        batchUpdateSettings(newSettings);
    };

    // Get categories (with PRO extensions)
    const CATEGORIES = getCategories();

    // Reset Defaults Handler
    const handleReset = () => {
        if (window.confirm('Are you sure you want to reset all settings to the default configuration? This action cannot be undone.')) {
            const defaults = window.advajraSettings.reset_defaults;

            if (onSaveReset) {
                const merged = { ...settings, ...defaults };
                onSaveReset(merged).then((success) => {
                    if (success) {
                        handleNavigate(null);
                    }
                });
            } else if (batchUpdateSettings) {
                batchUpdateSettings(defaults);
                addNotification({ type: 'success', message: 'Settings restored' });
            } else {
                // Fallback
                Object.entries(defaults).forEach(([key, value]) => {
                    updateSetting(key, value);
                });
                addNotification({ type: 'success', message: 'Settings restored' });
            }
        }
    };

    // Panel router
    if (activePanel) {
        const panelProps = { settings, updateSetting, onBack: () => handleNavigate(null) };

        // Allow PRO plugin to override any panel
        // Usage: window.advajraHooks.addFilter('advajra.settings.panel.performance', 'advajra-pro', (panel, props) => <MyPanel {...props} />)
        const customPanel = applyFilters(`advajra.settings.panel.${activePanel}`, null, panelProps);
        if (customPanel) return customPanel;

        // Default FREE panels
        switch (activePanel) {
            case 'display_audience': return <DisplayAudiencePanel {...panelProps} />;

            case 'performance': return <PerformancePanel {...panelProps} />;
            case 'privacy': return <PrivacyPanel {...panelProps} />;
            case 'analytics': return <AnalyticsPanel {...panelProps} />;
            case 'advanced': return <AdvancedPanel {...panelProps} onReset={handleReset} />;
            case 'defaults': return <DefaultsPanel {...panelProps} />;
            case 'ip_blocker': return <IpBlockerSettings {...panelProps} />;
            case 'custom_code': return (
                <DrillDownPanel icon="&lt;/&gt;" title="Custom Code" subtitle="Inject arbitrary HTML, CSS, or JS into your site" onBack={() => handleNavigate(null)}>
                    <CustomCodeManager {...panelProps} />
                </DrillDownPanel>
            );

            default:
                return (
                    <Slot
                        name="AdvajraProSettings"
                        fillProps={{
                            activePanel,
                            onBack: () => handleNavigate(null),
                            DrillDownPanel,
                            addNotification,
                            settings,
                            updateSetting,
                            Switch
                        }}
                    >
                        { ( fills ) => {
                            if ( fills.length ) return fills;
                            // Fallback if Pro is disabled or invalid route
                            return <div className="settings-not-found">Settings panel not found, or requires AdVajra Pro.</div>;
                        }}
                    </Slot>
                );
        }
    }

    return (
        <div className="settings-dashboard">
            {/* Strategy Section */}
            <div className="strategy-section">
                <div className="strategy-header">
                    <span className="strategy-icon">🎯</span>
                    <span className="strategy-title">Strategy</span>
                </div>
                <div className="preset-cards">
                    {PRESETS.map(preset => (
                        <button
                            key={preset.id}
                            className={`preset-card ${activePreset === preset.id ? 'active' : ''}`}
                            style={{ background: preset.gradient }}
                            onClick={() => applyPreset(preset)}
                        >
                            {preset.recommended && <span className="recommended-badge">RECOMMENDED</span>}
                            {activePreset === preset.id && <span className="active-check">✓</span>}
                            <span className="preset-icon">{preset.icon}</span>
                            <span className="preset-title">{preset.title}</span>
                            <span className="preset-desc">{preset.desc}</span>
                        </button>
                    ))}
                </div>

                {/* Compare Button - Below Presets */}
                {!showComparison && (
                    <button
                        className="compare-btn"
                        onClick={() => setShowComparison(true)}
                    >
                        📊 Compare Strategies
                    </button>
                )}

                {/* Strategy Comparison Panel */}
                {showComparison && (
                    <StrategyComparisonPanel
                        settings={settings}
                        onApply={(preset) => {
                            applyPreset(preset);
                            setShowComparison(false);
                        }}
                        onClose={() => setShowComparison(false)}
                    />
                )}
            </div>

            {/* Categories Section */}
            <div className="categories-section">
                <div className="categories-header">
                    <span className="categories-icon">⚙️</span>
                    <span className="categories-title">Fine-Tune Settings</span>
                </div>

                {/* Action hook: before categories grid */}
                {doAction('advajra.settings.before_categories', settings)}

                <div className="dashboard-grid">
                    {CATEGORIES.map(category => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            settings={settings}
                            onClick={handleNavigate}
                        />
                    ))}
                </div>

                {/* Action hook: after categories grid */}
                {doAction('advajra.settings.after_categories', settings)}
            </div>

            {/* Pro Modules & Integrations Section */}
            <div className="categories-section" style={{ marginTop: '2rem' }}>
                <div className="categories-header">
                    <span className="categories-icon">🚀</span>
                    <span className="categories-title">Pro Modules & Integrations</span>
                </div>
                <ModulesGrid isSettingsContext={true} />
            </div>

        </div>
    );
};

export default SettingsDashboard;
