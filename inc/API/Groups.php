<?php
/**
 * Groups REST Controller.
 *
 * Handles CRUD operations for Ad Groups via the REST API.
 * Uses the weighted pool data model: [ { id, weight }, ... ]
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

use AdVajra\Model\Group;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Groups
 */
class Groups extends Controller {

	/**
	 * REST Resource base.
	 *
	 * @var string
	 */
	protected $rest_base = 'groups';

	/**
	 * Post type.
	 *
	 * @var string
	 */
	protected $post_type = 'advajra_group';

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
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
			'/' . $this->rest_base . '/(?P<id>[\d]+)',
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
	 * Get all groups.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$args = [
			'post_type'      => $this->post_type,
			'posts_per_page' => -1,
			'post_status'    => 'any',
			'orderby'        => 'title',
			'order'          => 'ASC',
		];

		$posts  = get_posts( $args );
		$groups = [];

		foreach ( $posts as $post ) {
			$groups[] = Group::prepare_for_response( $post );
		}

		return rest_ensure_response( $groups );
	}

	/**
	 * Get single group.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_item( $request ) {
		$id   = (int) $request->get_param( 'id' );
		$post = get_post( $id );

		if ( ! $post || $this->post_type !== $post->post_type ) {
			return new \WP_Error( 'not_found', __( 'Group not found.', 'advajra' ), [ 'status' => 404 ] );
		}

		return rest_ensure_response( Group::prepare_for_response( $post ) );
	}

	/**
	 * Create group.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_item( $request ) {
		$data = $request->get_json_params();

		$post_id = Group::create( [
			'title'    => $data['title'] ?? 'Untitled Group',
			'ads'      => $data['ads'] ?? [],
			'rotation' => $data['rotation'] ?? 'random',
		] );

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		\AdVajra\Utils\AuditLog::log(
			'group_created',
			'group',
			$post_id,
			sprintf(
				/* translators: %s: group title */
				__( 'Created group: %s', 'advajra' ),
				get_the_title( $post_id )
			)
		);

		return rest_ensure_response( Group::prepare_for_response( get_post( $post_id ) ) );
	}

	/**
	 * Update group.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( $request ) {
		$id   = (int) $request->get_param( 'id' );
		$data = $request->get_json_params();

		$result = Group::update( $id, [
			'title'    => $data['title'] ?? null,
			'ads'      => $data['ads'] ?? null,
			'rotation' => $data['rotation'] ?? null,
		] );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		\AdVajra\Utils\AuditLog::log(
			'group_updated',
			'group',
			$id,
			sprintf(
				/* translators: %s: group title */
				__( 'Updated group: %s', 'advajra' ),
				get_the_title( $id )
			)
		);

		return rest_ensure_response( Group::prepare_for_response( get_post( $id ) ) );
	}

	/**
	 * Delete group.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_item( $request ) {
		$id   = (int) $request->get_param( 'id' );
		$post = get_post( $id );

		if ( ! $post || $this->post_type !== $post->post_type ) {
			return new \WP_Error( 'not_found', __( 'Group not found.', 'advajra' ), [ 'status' => 404 ] );
		}

		$title = $post->post_title ? $post->post_title : '#' . absint( $id );

		$result = Group::delete( $id );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		\AdVajra\Utils\AuditLog::log(
			'group_deleted',
			'group',
			$id,
			sprintf(
				/* translators: %s: group title */
				__( 'Deleted group: %s', 'advajra' ),
				$title
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
