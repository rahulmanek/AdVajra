<?php
/**
 * REST endpoint to expose ad types.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', function() {
	register_rest_route( 'advajra/v1', '/ad-types', [
		'methods'  => 'GET',
		'callback' => __NAMESPACE__ . '\\get_ad_types',
		'permission_callback' => function() {
			return current_user_can( 'edit_posts' );
		},
	] );
} );

/**
 * REST callback returning ad types.
 *
 * @param \WP_REST_Request $request
 * @return array
 */
function get_ad_types( \WP_REST_Request $request ) {
	$types = \AdVajra\Core\AdTypes::get_types();
	return rest_ensure_response( $types );
}
