<?php
namespace AdVajra\API;

use AdVajra\Model\Placement;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Placements
 */
class Placements extends Controller {
	/**
	 * Write API debug context to error log when WP_DEBUG is enabled.
	 *
	 * @param string $message Message.
	 * @param array  $context Context map.
	 * @return void
	 */
	private function debug_log( $message, $context = [] ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			$payload = wp_json_encode( $context );
			error_log( '[AdVajra Placements API] ' . $message . ( $payload ? ' ' . $payload : '' ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		}
	}

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/placements',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_items' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'create_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/placements/(?P<id>\d+)',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
				[
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => [ $this, 'update_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
				[
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'delete_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);
	}

	/**
	 * Permissions check.
	 */
	public function permissions_check( $request ) {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Get items.
	 */
	public function get_items( $request ) {
		$placements = Placement::get_all();
		return rest_ensure_response( $placements );
	}

	/**
	 * Get single item.
	 */
	public function get_item( $request ) {
		$id        = $request->get_param( 'id' );
		$placement = Placement::get( $id );

		if ( ! $placement ) {
			return new \WP_Error( 'not_found', 'Placement not found', [ 'status' => 404 ] );
		}

		return rest_ensure_response( $placement );
	}

	/**
	 * Create item.
	 */
	public function create_item( $request ) {
		$params = $request->get_json_params();

		$id = Placement::create( $params );

		if ( ! $id ) {
			$this->debug_log(
				'Create failed',
				[
					'params' => $params,
				]
			);
			return new \WP_Error( 'create_failed', 'Failed to create placement', [ 'status' => 500 ] );
		}

		$placement = Placement::get( $id );
		\AdVajra\Utils\AuditLog::log(
			'placement_created',
			'placement',
			$id,
			sprintf(
				/* translators: %s: placement name */
				__( 'Created placement: %s', 'advajra' ),
				$placement && ! empty( $placement->name ) ? $placement->name : '#' . absint( $id )
			),
			[
				'type'   => $placement->type ?? '',
				'status' => $placement->status ?? '',
			]
		);

		return rest_ensure_response( $placement );
	}

	/**
	 * Update item.
	 */
	public function update_item( $request ) {
		$id     = $request->get_param( 'id' );
		$params = $request->get_json_params();

		$updated = Placement::update( $id, $params );

		if ( ! $updated ) {
			if ( ! Placement::get( $id ) ) {
				return new \WP_Error( 'not_found', 'Placement not found', [ 'status' => 404 ] );
			}

			$this->debug_log(
				'Update failed',
				[
					'id'     => (int) $id,
					'params' => $params,
				]
			);
		}

		$placement = Placement::get( $id );
		\AdVajra\Utils\AuditLog::log(
			'placement_updated',
			'placement',
			$id,
			sprintf(
				/* translators: %s: placement name */
				__( 'Updated placement: %s', 'advajra' ),
				$placement && ! empty( $placement->name ) ? $placement->name : '#' . absint( $id )
			),
			[
				'type'   => $placement->type ?? '',
				'status' => $placement->status ?? '',
			]
		);

		return rest_ensure_response( $placement );
	}

	/**
	 * Delete item.
	 */
	public function delete_item( $request ) {
		$id      = $request->get_param( 'id' );
		$deleted = Placement::delete( $id );

		if ( ! $deleted ) {
			$this->debug_log(
				'Delete failed',
				[
					'id' => (int) $id,
				]
			);
			return new \WP_Error( 'delete_failed', 'Failed to delete placement', [ 'status' => 500 ] );
		}

		\AdVajra\Utils\AuditLog::log(
			'placement_deleted',
			'placement',
			$id,
			sprintf(
				/* translators: %d: placement id */
				__( 'Deleted placement #%d', 'advajra' ),
				absint( $id )
			)
		);

		return rest_ensure_response(
			[
				'deleted' => true,
				'id'      => $id,
			]
		);
	}
}
