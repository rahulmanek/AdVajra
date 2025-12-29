<?php
/**
 * Groups REST Controller.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

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
			$groups[] = $this->prepare_group( $post );
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

		return rest_ensure_response( $this->prepare_group( $post ) );
	}

	/**
	 * Create group.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_item( $request ) {
		$data = $request->get_json_params();

		$post_id = wp_insert_post(
			[
				'post_type'   => $this->post_type,
				'post_title'  => sanitize_text_field( $data['title'] ?? 'Untitled Group' ),
				'post_status' => 'publish',
			]
		);

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		$this->save_group_meta( $post_id, $data );
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

		return rest_ensure_response( $this->prepare_group( get_post( $post_id ) ) );
	}

	/**
	 * Update group.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( $request ) {
		$id   = (int) $request->get_param( 'id' );
		$post = get_post( $id );

		if ( ! $post || $this->post_type !== $post->post_type ) {
			return new \WP_Error( 'not_found', __( 'Group not found.', 'advajra' ), [ 'status' => 404 ] );
		}

		$data = $request->get_json_params();

		wp_update_post(
			[
				'ID'         => $id,
				'post_title' => sanitize_text_field( $data['title'] ?? $post->post_title ),
			]
		);

		$this->save_group_meta( $id, $data );
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

		return rest_ensure_response( $this->prepare_group( get_post( $id ) ) );
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

		wp_delete_post( $id, true );
		\AdVajra\Utils\AuditLog::log(
			'group_deleted',
			'group',
			$id,
			sprintf(
				/* translators: %s: group title */
				__( 'Deleted group: %s', 'advajra' ),
				$post->post_title ? $post->post_title : '#' . absint( $id )
			)
		);

		return rest_ensure_response(
			[
				'deleted' => true,
				'id'      => $id,
			]
		);
	}

	/**
	 * Prepare group data for response.
	 *
	 * @param \WP_Post $post Post object.
	 * @return array
	 */
	private function prepare_group( $post ) {
		$ads      = get_post_meta( $post->ID, '_advajra_group_ads', true );
		$rotation = get_post_meta( $post->ID, '_advajra_group_rotation', true );

		return [
			'id'       => $post->ID,
			'title'    => $post->post_title,
			'rotation' => $rotation ?: 'default',
			'ads'      => is_array( $ads ) ? array_map( 'intval', $ads ) : [],
		];
	}

	/**
	 * Save group meta.
	 *
	 * @param int   $post_id Post ID.
	 * @param array $data    Data from request.
	 */
	private function save_group_meta( $post_id, $data ) {
		if ( isset( $data['rotation'] ) ) {
			update_post_meta( $post_id, '_advajra_group_rotation', sanitize_text_field( $data['rotation'] ) );
		}

		if ( isset( $data['ads'] ) && is_array( $data['ads'] ) ) {
			update_post_meta( $post_id, '_advajra_group_ads', array_map( 'intval', $data['ads'] ) );
		}
	}
}
