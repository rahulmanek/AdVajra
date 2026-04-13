<?php
/**
 * Runtime capability helpers.
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class RuntimeCapabilities
 */
class RuntimeCapabilities {

	/**
	 * Whether the current PHP runtime is 8+.
	 *
	 * @return bool
	 */
	public static function is_php8_or_higher() {
		return version_compare( PHP_VERSION, '8.0', '>=' );
	}

	/**
	 * Whether script modules are available.
	 *
	 * @return bool
	 */
	public static function supports_script_modules() {
		return function_exists( 'wp_register_script_module' );
	}

	/**
	 * Whether the site can use the enhanced runtime path.
	 *
	 * @return bool
	 */
	public static function can_use_rocket_runtime() {
		return self::can_use_agni_runtime();
	}

	/**
	 * Whether the site can use Vajra Agni runtime enhancements.
	 *
	 * @return bool
	 */
	public static function can_use_agni_runtime() {
		return self::supports_script_modules()
			&& defined( 'ADVAJRA_PRO_ACTIVE' )
			&& ADVAJRA_PRO_ACTIVE;
	}

	/**
	 * Whether the site can use Vajra Agni CWV guardrails.
	 *
	 * @return bool
	 */
	public static function can_use_agni_cwv_guard() {
		return defined( 'ADVAJRA_PRO_ACTIVE' ) && ADVAJRA_PRO_ACTIVE;
	}
}
