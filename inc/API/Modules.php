<?php
/**
 * REST API for Modules.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Modules
 */
class Modules {

	/**
	 * Namespace.
	 */
	const NAMESPACE = 'advajra/v1';

	/**
	 * Route base.
	 */
	const REST_BASE = 'modules';

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/' . self::REST_BASE,
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_items' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/' . self::REST_BASE . '/toggle',
			[
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'toggle_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
					'args'                => [
						'id'     => [
							'required'          => true,
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
						],
						'active' => [
							'required' => true,
							'type'     => 'boolean',
						],
					],
				],
			]
		);
	}

	/**
	 * Check permissions.
	 *
	 * @return bool|\WP_Error
	 */
	public function permissions_check() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Get items.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$manager = new \AdVajra\Core\Modules\ModuleManager();
		$manager->init();

		return rest_ensure_response( $manager->get_frontend_data() );
	}

	public function toggle_item( $request ) {
		$id     = $request->get_param( 'id' );
		$active = rest_sanitize_boolean( $request->get_param( 'active' ) );

		$manager = new \AdVajra\Core\Modules\ModuleManager();
		$manager->init();

		$updated = $manager->toggle_module( $id, $active );

		if ( ! $updated ) {
			$current_state = $manager->is_active( $id );
			\AdVajra\Utils\AuditLog::log(
				'module_toggled',
				'module',
				null,
				sprintf(
					/* translators: 1: module id, 2: state */
					__( 'Module %1$s is now %2$s', 'advajra' ),
					(string) $id,
					$current_state ? __( 'enabled', 'advajra' ) : __( 'disabled', 'advajra' )
				),
				[
					'module_id' => (string) $id,
					'active'    => (bool) $current_state,
				]
			);

			return rest_ensure_response(
				[
					'success' => true,
					'active'  => $current_state,
				]
			);
		}

		\AdVajra\Utils\AuditLog::log(
			'module_toggled',
			'module',
			null,
			sprintf(
				/* translators: 1: module id, 2: state */
				__( 'Module %1$s is now %2$s', 'advajra' ),
				(string) $id,
				$active ? __( 'enabled', 'advajra' ) : __( 'disabled', 'advajra' )
			),
			[
				'module_id' => (string) $id,
				'active'    => (bool) $active,
			]
		);

		return rest_ensure_response(
			[
				'success' => true,
				'active'  => $active,
			]
		);
	}
}
