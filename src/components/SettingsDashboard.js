/**
 * Settings Dashboard
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
        id: 'display',
        icon: '📍',
        title: 'Display',
        description: 'Where to show ads',
        isPro: false,

    },
    {
        id: 'audience',
        icon: '👥',
        title: 'Audience',
        description: 'Who sees ads',
        isPro: false,

    },
    {
        id: 'protection',
        icon: '🛡️',
        title: 'Protection',
        description: 'Bots, fraud & ad blockers',
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
// DISPLAY PANEL (Page Types)
// ===========================================
const DisplayPanel = ({ settings, updateSetting, onBack }) => {
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

    return (
        <DrillDownPanel
            icon="📍"
            title="Display Settings"
            subtitle="Choose where ads appear on your site"
            statusText={`${enabledCount}/${PAGE_TYPES.length} enabled`}
            onBack={onBack}
        >

            <div className="panel-section">
                <div className="section-header">
                    <h4>Page Types</h4>
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
        </DrillDownPanel>
    );
};

// ===========================================
// AUDIENCE PANEL (Roles + IPs)
// ===========================================
const AudiencePanel = ({ settings, updateSetting, onBack }) => {
    const userRoles = window.advajraSettings?.userRoles || [];
    const hiddenRoles = settings?.hidden_roles || [];
    const [newIP, setNewIP] = useState('');
    const blockedIPs = settings?.blocked_ips || [];

    const toggleRole = (roleSlug) => {
        const newHidden = hiddenRoles.includes(roleSlug)
            ? hiddenRoles.filter(r => r !== roleSlug)
            : [...hiddenRoles, roleSlug];
        updateSetting('hidden_roles', newHidden);
    };

    const addIP = () => {
        if (newIP && !blockedIPs.includes(newIP)) {
            updateSetting('blocked_ips', [...blockedIPs, newIP]);
            setNewIP('');
        }
    };

    const removeIP = (ip) => {
        updateSetting('blocked_ips', blockedIPs.filter(i => i !== ip));
    };

    return (
        <DrillDownPanel
            icon="👥"
            title="Audience Settings"
            subtitle="Control who sees your ads"
            onBack={onBack}
        >

            {/* User Roles Section */}
            <div className="panel-section">
                <div className="section-header">
                    <h4>👤 User Roles</h4>
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

            {/* IP Blocking Section - Migrated to Standalone Module */}
        </DrillDownPanel>
    );
};

// ===========================================
// PROTECTION PANEL
// ===========================================
const ProtectionPanel = ({ settings, updateSetting, onBack }) => {
    return (
        <DrillDownPanel
            icon="🛡️"
            title="Protection Settings"
            subtitle="Protect your ad revenue from invalid traffic"
            onBack={onBack}
        >

            {/* Bot Protection */}
            <div className="panel-section">
                <div className="section-header">
                    <h4>🤖 Bot Protection</h4>
                </div>

                <ToggleRow
                    icon="🤖"
                    title="Block Bots & Crawlers"
                    description="Prevent search engines and bots from triggering ad impressions"
                    isEnabled={settings?.hide_from_bots}
                    onClick={() => updateSetting('hide_from_bots', !settings?.hide_from_bots)}
                />
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
                    <button className="upgrade-btn">Upgrade Now</button>
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
                    <button className="upgrade-btn">Upgrade Now</button>
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
                            <span className="sync-now-btn__pro-badge">PRO</span>
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

                <div className="option-buttons">
                    {[
                        { value: 1,  label: '1 min - Fast',        icon: '⚡', title: 'Fastest, more DB load' },
                        { value: 5,  label: '5 min - Recommended', icon: '✓', title: 'Recommended' },
                        { value: 15, label: '15 min - Light',       icon: '🌙', title: 'Light DB load' },
                        { value: 30, label: '30 min - Minimal',     icon: '🐢', title: 'Minimal DB load' },
                    ].map(opt => (
                        <button
                            key={opt.value}
                            className={`option-btn ${syncInterval === opt.value ? 'active' : ''}`}
                            onClick={() => updateSetting('sync_interval', opt.value)}
                            title={opt.title}
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
                    <button className="upgrade-btn">Upgrade Now</button>
                </div>
            )}
        </DrillDownPanel>
    );
};

// ===========================================
// ADVANCED PANEL
// ===========================================
const AdvancedPanel = ({ settings, updateSetting, onBack, onReset }) => {
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
                    <h4>🔧 Debug & Tools</h4>
                </div>

                <div className="coming-soon-banner" style={{background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed rgba(99, 102, 241, 0.3)', padding: '16px', borderRadius: '12px', textAlign: 'center', marginBottom: '24px'}}>
                    <span style={{fontSize: '24px', display: 'block', marginBottom: '8px'}}>🚀</span>
                    <h5 style={{margin: '0 0 4px 0', color: '#4f46e5'}}>Coming Soon</h5>
                    <p style={{margin: 0, fontSize: '13px', color: '#64748b'}}>Advanced debugging, export/import, and health checks are currently in development for a future update.</p>
                </div>

                {/* Keep Reset Button Functional */}
                <div className="action-buttons">
                    <button
                        className="action-btn danger" style={{width: '100%', justifyContent: 'center'}}
                        onClick={() => {
                            if (window.confirm("Are you sure you want to reset all settings to their default values? This action cannot be undone.")) {
                                onReset(window.advajraSettings?.defaults || {});
                            }
                        }}
                    >
                        🔄 Reset Settings to Defaults
                    </button>
                </div>
            </div>

            {/* Uninstall Behaviour */}
            <div className="panel-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Trash Icon */}
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        background: settings?.erase_data_on_uninstall ? 'rgba(239,68,68,0.1)' : 'var(--av-bg-main)',
                        border: `1px solid ${settings?.erase_data_on_uninstall ? 'rgba(239,68,68,0.25)' : 'var(--av-border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease',
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke={settings?.erase_data_on_uninstall ? '#ef4444' : 'var(--av-text-muted)'}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: 'stroke 0.2s ease' }}>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                        </svg>
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--av-text-heading)', lineHeight: 1.3 }}>
                            Delete all plugin data on uninstall
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--av-text-muted)', marginTop: '2px' }}>
                            Permanently removes ads, placements, settings, and logs.
                        </div>
                    </div>

                    {/* Toggle */}
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

// ===========================================
// DEFAULTS PANEL
// ===========================================
const DefaultsPanel = ({ settings, updateSetting, onBack }) => {
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

            {/* Tracking */}
            <div className="panel-section">
                <div className="section-header">
                    <h4>📊 Default Tracking</h4>
                    <p className="section-desc">What to track when ad uses "Default" tracking mode</p>
                </div>
                <OptionButton
                    options={trackingOptions}
                    value={settings?.default_tracking || 'both'}
                    onChange={(val) => updateSetting('default_tracking', val)}
                />
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
            case 'display': return <DisplayPanel {...panelProps} />;
            case 'audience': return <AudiencePanel {...panelProps} />;
            case 'protection': return <ProtectionPanel {...panelProps} />;
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
