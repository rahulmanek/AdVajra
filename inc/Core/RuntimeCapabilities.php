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


}
