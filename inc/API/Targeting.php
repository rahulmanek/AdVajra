<?php
namespace AdVajra\API;

use AdVajra\Core\Targeting\TargetingRegistry;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Targeting
 * API Endpoint for retrieving available targeting options.
 */
class Targeting extends Controller {

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			'advajra/v1',
			'/targeting',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'get_items' ],
					'permission_callback' => [ $this, 'get_items_permissions_check' ],
				],
			]
		);
	}

	/**
	 * Check permissions.
	 *
	 * @return bool
	 */
	public function get_items_permissions_check( $request ) {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Get available targeting options.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$registry = TargetingRegistry::instance();
		return rest_ensure_response( $registry->to_array() );
	}
}
