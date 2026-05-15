/**
 * AdVajra URL & UTM Utilities
 *
 * Single source of truth for all external links sent from the plugin.
 * Every link that goes to advajra.com must go through `advajraUrl()` so that
 * GA4 can attribute traffic correctly and you always know where users came from.
 *
 * HOW UTM WORKS (quick reference):
 *   utm_source   → WHO sent them   (always "advajra-plugin")
 *   utm_medium   → WHAT type       (e.g. "plugin-upsell", "plugin-modal")
 *   utm_campaign → WHICH goal      (e.g. "pricing", "support")
 *   utm_content  → WHICH button    (e.g. "dashboard-kpi-overlay", "ad-editor-tracking")
 */

const BASE = 'https://advajra.com';
const UTM_SOURCE = 'advajra-plugin';

/**
 * Build a fully UTM-tagged URL to advajra.com.
 *
 * @param {string} path     - Path on advajra.com
 * @param {string} medium   - Channel type: "plugin-upsell" | "plugin-modal" | "plugin-settings" | "plugin-admin"
 * @param {string} campaign - Goal name: "pricing" | "support" | "feature-request" | "analytics"
 * @param {string} content  - Specific button/location
 * @returns {string} Full URL with UTM params appended.
 */
export function advajraUrl( path, medium, campaign, content ) {
	const url = new URL( path, BASE );
	url.searchParams.set( 'utm_source', UTM_SOURCE );
	url.searchParams.set( 'utm_medium', medium );
	url.searchParams.set( 'utm_campaign', campaign );
	if ( content ) {
		url.searchParams.set( 'utm_content', content );
	}
	return url.toString();
}

/**
 * Pre-built URLs — import these directly instead of calling advajraUrl() every time.
 * If the destination URL ever changes, change it here ONCE and it updates everywhere.
 */

// ── Pricing / Upgrade ─────────────────────────────────────────────────────────
export const PRICING_URL = {
	/** Overview KPI lock overlay "Unlock PRO" button */
	overviewKpiOverlay:     advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'overview-kpi-overlay' ),
	/** Overview pulse lock card (module-level upsell) */
	overviewPulseLock:      advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'overview-pulse-lock' ),
	/** Overview state rail CTA */
	overviewStateCta:       advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'overview-state-cta' ),
	/** Analytics dashboard upgrade banner */
	analyticsBanner:        advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'analytics-upgrade-banner' ),
	/** Ad Editor — Tracking tab PRO badge */
	adEditorTrackingBadge:  advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'ad-editor-tracking-badge' ),
	/** Ad Editor — click on disabled tracking tab */
	adEditorTrackingClick:  advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'ad-editor-tracking-click' ),
	/** Ad List — bulk actions PRO upsell */
	adListBulkActions:      advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'ad-list-bulk-actions' ),
	/** Ad List — inline ad limit upsell */
	adListAdLimit:          advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'ad-list-ad-limit' ),
	/** Placement List — Smart Placement upsell */
	placementListSmart:     advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'placement-list-smart' ),
	/** Placement List — bulk actions upsell */
	placementListBulk:      advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'placement-list-bulk' ),
	/** Placement Edit — PRO feature upsell */
	placementEdit:          advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'placement-edit' ),
	/** Module Card — PRO module lock */
	moduleCard:             advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'module-card' ),
	/** Settings Dashboard — upgrade button (generic, used in multiple cards) */
	settingsCard:           advajraUrl( '/pricing', 'plugin-settings', 'pricing', 'settings-upgrade-btn' ),
	/** CampaignSettingsCard — PRO badge inline */
	campaignSettingsBadge:  advajraUrl( '/pricing', 'plugin-upsell', 'pricing', 'campaign-settings-badge' ),
};

// ── Support ───────────────────────────────────────────────────────────────────
export const SUPPORT_URL = {
	/** Deactivation survey — bug reason nudge */
	deactivationBugNudge:      advajraUrl( '/support', 'deactivation-survey', 'support', 'deactivation-bug-nudge' ),
	/** Deactivation survey — conflict reason nudge */
	deactivationConflictNudge: advajraUrl( '/support', 'deactivation-survey', 'support', 'deactivation-conflict-nudge' ),
};

// ── Feature Request ───────────────────────────────────────────────────────────
export const FEATURE_REQUEST_URL = {
	/** Deactivation survey — missing feature nudge */
	deactivationFeatureNudge: advajraUrl( '/feature-request', 'deactivation-survey', 'feature-request', 'deactivation-feature-nudge' ),
};

// ── Analytics / Features ──────────────────────────────────────────────────────
export const FEATURES_URL = {
	/** Analytics dashboard — learn more about analytics */
	analyticsLearnMore: advajraUrl( '/features/analytics', 'plugin-upsell', 'analytics', 'analytics-learn-more' ),
};
