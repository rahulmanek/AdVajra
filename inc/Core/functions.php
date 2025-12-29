<?php
/**
 * Procedural helpers for AdTypes registration.
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register an ad type programmatically (procedural wrapper).
 *
 * @param string $key
 * @param array  $args
 * @return bool
 */
function advajra_register_ad_type( string $key, array $args ): bool {
	return AdTypes::register_type( $key, $args );
}

/**
 * Unregister an ad type programmatically.
 *
 * @param string $key
 * @return bool
 */
function advajra_unregister_ad_type( string $key ): bool {
	return AdTypes::unregister_type( $key );
}

/**
 * Clear ad types cache.
 *
 * @return void
 */
function advajra_clear_ad_types_cache(): void {
	AdTypes::clear_cache();
}
