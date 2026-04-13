<?php
/**
 * Defaults Class.
 *
 * Central source of truth for all plugin settings and presets.
 * Architecture optimized for performance - presets are computed once and cached.
 *
 * @package AdVajra\Data
 */

namespace AdVajra\Data;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Defaults
 *
 * Provides preset configurations for the plugin.
 * All presets extend the base defaults to minimize memory usage.
 */
class Defaults {

	/**
	 * Cached presets to avoid recomputation.
	 *
	 * @var array|null
	 */
	private static $preset_cache = null;

	/**
	 * Get base defaults (internal use only).
	 *
	 * @return array
	 */
	private static function get_base_defaults() {
		return [
			'active_preset'           => 'balanced',
			'default_layout'          => 'default',
			'default_target'          => '_blank',
			'default_nofollow'        => false,
			'default_sponsored'       => false,
			'default_tracking'        => 'both',
			'adblock_detection'       => false,
			'disable_all_ads'         => false,
			'hidden_roles'            => [],
			'blocked_ips'             => [],
			'erase_data_on_uninstall' => false,
		];
	}

	/**
	 * Get Balanced Preset Defaults.
	 *
	 * @return array
	 */
	public static function get_balanced_defaults() {
		$defaults = array_merge(
			self::get_base_defaults(),
			[
				'hidden_roles'      => [],
				'disable_homepage'  => false,
				'disable_posts'     => false,
				'disable_pages'     => false,
				'disable_archives'  => false,
				'disable_search'    => true,
				'disable_404'       => true,
				'disable_rss'       => true,
				'hide_from_bots'    => true,
				'adblock_detection' => false,
				'analytics_enabled' => true,
			]
		);

		return apply_filters( 'advajra_preset_balanced', $defaults );
	}

	/**
	 * Get Maximum Revenue Preset Defaults.
	 *
	 * @return array
	 */
	public static function get_maximum_defaults() {
		$defaults = array_merge(
			self::get_base_defaults(),
			[
				'hidden_roles'      => [],
				'disable_homepage'  => false,
				'disable_posts'     => false,
				'disable_pages'     => false,
				'disable_archives'  => false,
				'disable_search'    => false,
				'disable_404'       => false,
				'disable_rss'       => false,
				'hide_from_bots'    => true,
				'adblock_detection' => false,
				'analytics_enabled' => true,
			]
		);

		return apply_filters( 'advajra_preset_maximum', $defaults );
	}

	/**
	 * Get Minimal Intrusion Preset Defaults.
	 *
	 * @return array
	 */
	public static function get_minimal_defaults() {
		$defaults = array_merge(
			self::get_base_defaults(),
			[
				'hidden_roles'      => [ 'administrator', 'editor' ],
				'disable_homepage'  => true,
				'disable_posts'     => false,
				'disable_pages'     => true,
				'disable_archives'  => true,
				'disable_search'    => true,
				'disable_404'       => true,
				'disable_rss'       => true,
				'hide_from_bots'    => true,
				'adblock_detection' => false,
				'analytics_enabled' => true,
			]
		);

		return apply_filters( 'advajra_preset_minimal', $defaults );
	}

	/**
	 * Get FREE preset keys (for comparison UI).
	 *
	 * @return array
	 */
	public static function get_preset_keys() {
		$keys = [
			'hidden_roles',
			'disable_homepage',
			'disable_posts',
			'disable_pages',
			'disable_archives',
			'disable_search',
			'disable_404',
			'disable_rss',
			'hide_from_bots',
			'adblock_detection',
		];

		/**
		 * Filter preset keys for comparison.
		 * PRO adds its keys here.
		 *
		 * @param array $keys Preset keys.
		 */
		return apply_filters( 'advajra_preset_keys', $keys );
	}

	/**
	 * Get all presets for frontend (cached).
	 *
	 * Returns only the settings that differ per preset (for comparison UI).
	 * Optimized: computed once per request.
	 *
	 * @return array
	 */
	public static function get_presets_for_frontend() {
		if ( null !== self::$preset_cache ) {
			return self::$preset_cache;
		}

		$preset_keys = self::get_preset_keys();

		$filter_preset = function ( $defaults ) use ( $preset_keys ) {
			return array_intersect_key( $defaults, array_flip( $preset_keys ) );
		};

		self::$preset_cache = [
			'balanced' => $filter_preset( self::get_balanced_defaults() ),
			'maximum'  => $filter_preset( self::get_maximum_defaults() ),
			'minimal'  => $filter_preset( self::get_minimal_defaults() ),
		];

		/**
		 * Filter presets for frontend.
		 *
		 * @param array $presets Frontend presets.
		 */
		return apply_filters( 'advajra_presets_frontend', self::$preset_cache );
	}

	/**
	 * Get Reset Defaults.
	 *
	 * Complete settings reset - includes user-specific fields.
	 *
	 * @return array
	 */
	public static function get_reset_defaults() {
		$defaults = self::get_balanced_defaults();

		$defaults['blocked_ips']                = [];
		$defaults['adblock_message']            = '';
		// NOTE: 'debug_mode' reset value is provided by PRO via the advajra_reset_defaults filter.
		$defaults['custom_code_header_enabled'] = false;
		$defaults['custom_code_body_enabled']   = false;
		$defaults['custom_code_footer_enabled'] = false;
		$defaults['custom_code_header']         = '';
		$defaults['custom_code_body']           = '';
		$defaults['custom_code_footer']         = '';

		/**
		 * Filter the reset defaults.
		 *
		 * Allows PRO or other plugins to add their reset values.
		 *
		 * @param array $defaults The default settings.
		 */
		return apply_filters( 'advajra_reset_defaults', $defaults );
	}
}
