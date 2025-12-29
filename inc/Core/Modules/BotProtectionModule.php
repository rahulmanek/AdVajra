<?php
/**
 * Bot Protection Module.
 *
 * Prevents ad rendering and impression tracking for search engine
 * crawlers and known bots to save server resources and maintain accurate analytics.
 *
 * @package AdVajra\Core\Modules
 */

namespace AdVajra\Core\Modules;

use AdVajra\Core\Modules\ModuleInterface;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class BotProtectionModule
 */
class BotProtectionModule implements ModuleInterface {

	/**
	 * Get module ID.
	 */
	public function get_id(): string {
		return 'bot_protection';
	}

	/**
	 * Get module name.
	 */
	public function get_name(): string {
		return __( 'Bot Protection', 'advajra' );
	}

	/**
	 * Get module description.
	 */
	public function get_description(): string {
		return __( 'Block search engines and crawlers from skewing ad analytics.', 'advajra' );
	}

	/**
	 * Get module category.
	 */
	public function get_category(): string {
		return 'protection';
	}

	/**
	 * Get module icon identifier.
	 */
	public function get_icon(): string {
		return 'shield';
	}

	/**
	 * Is module PRO only?
	 */
	public function is_pro(): bool {
		return false;
	}

	/**
	 * Is module always active?
	 */
	public function is_always_active(): bool {
		return false;
	}

	/**
	 * Does module have settings UI?
	 */
	public function has_settings(): bool {
		return false; // Handled directly in SettingsDashboard.js (toggle)
	}

	/**
	 * Current active state from DB.
	 */
	public function is_active(): bool {
		$settings = get_option( 'advajra_settings', [] );
		return ! empty( $settings['hide_from_bots'] );
	}

	/**
	 * Initialize module.
	 */
	public function init(): void {
		add_filter( 'advajra_is_user_allowed', [ $this, 'enforce_bot_protection' ] );
	}

	/**
	 * Enforce bot protection against the current user agent.
	 *
	 * @param bool $is_allowed Current allowed state.
	 * @return bool True if allowed, false if bot detected.
	 */
	public function enforce_bot_protection( bool $is_allowed ): bool {
		if ( ! $is_allowed ) {
			return false; // Already blocked by another check
		}

		$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';

		if ( empty( $user_agent ) ) {
			return $is_allowed;
		}

		$bot_regex = '/(bot|crawler|spider|slurp|facebookexternalhit|whatsapp|petalbot|ahrefs|semrush|seo|daum|metauri|yandex|coccoc|mail\.ru|python|curl|wget|httpclient|scrapy|lighthouse|insights|headlesschrome|phantomjs|puppeteer|cypress|pingdom|gtmetrix|archive\.org_bot|baiduspider|sogou|bingbot|googlebot|mj12bot)/i';

		if ( preg_match( $bot_regex, $user_agent ) ) {
			return false;
		}

		return $is_allowed;
	}
}
