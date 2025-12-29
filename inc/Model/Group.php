<?php
/**
 * Group Model.
 *
 * @package AdVajra\Model
 */

namespace AdVajra\Model;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Group
 */
class Group {

	/**
	 * Post Type.
	 *
	 * @var string
	 */
	const POST_TYPE = 'advajra_group';

	/**
	 * Get Group by ID.
	 *
	 * @param int $id Group ID.
	 * @return array|\WP_Error Group data or error.
	 */
	public static function get( $id ) {
		$post = get_post( $id );

		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return new \WP_Error( 'invalid_group', __( 'Invalid group ID.', 'advajra' ), [ 'status' => 404 ] );
		}

		return self::prepare_for_response( $post );
	}

	/**
	 * Create Group.
	 *
	 * @param array $data Group data.
	 * @return int|\WP_Error Group ID or error.
	 */
	public static function create( $data ) {
		$post_id = wp_insert_post(
			[
				'post_type'   => self::POST_TYPE,
				'post_title'  => sanitize_text_field( $data['title'] ),
				'post_status' => 'publish',
			]
		);

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		self::update_meta( $post_id, $data );

		return $post_id;
	}

	/**
	 * Update Group.
	 *
	 * @param int   $id   Group ID.
	 * @param array $data Group data.
	 * @return int|\WP_Error Group ID or error.
	 */
	public static function update( $id, $data ) {
		$post = get_post( $id );

		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return new \WP_Error( 'invalid_group', __( 'Invalid group ID.', 'advajra' ), [ 'status' => 404 ] );
		}

		if ( isset( $data['title'] ) ) {
			wp_update_post(
				[
					'ID'         => $id,
					'post_title' => sanitize_text_field( $data['title'] ),
				]
			);
		}

		self::update_meta( $id, $data );

		return $id;
	}

	/**
	 * Delete Group.
	 *
	 * @param int $id Group ID.
	 * @return bool|\WP_Error True on success or error.
	 */
	public static function delete( $id ) {
		$result = wp_delete_post( $id, true );

		if ( ! $result ) {
			return new \WP_Error( 'delete_failed', __( 'Failed to delete group.', 'advajra' ), [ 'status' => 500 ] );
		}

		return true;
	}

	/**
	 * Update Meta.
	 *
	 * @param int   $id   Group ID.
	 * @param array $data Group data.
	 */
	private static function update_meta( $id, $data ) {
		if ( isset( $data['ads'] ) ) {
			update_post_meta( $id, '_advajra_ads', array_map( 'intval', $data['ads'] ) );
		}

		if ( isset( $data['rotation'] ) ) {
			update_post_meta( $id, '_advajra_rotation', sanitize_text_field( $data['rotation'] ) );
		}
	}

	/**
	 * Prepare for response.
	 *
	 * @param \WP_Post $post Post object.
	 * @return array
	 */
	public static function prepare_for_response( $post ) {
		return [
			'id'       => $post->ID,
			'title'    => $post->post_title,
			'ads'      => get_post_meta( $post->ID, '_advajra_ads', true ) ?: [],
			'rotation' => get_post_meta( $post->ID, '_advajra_rotation', true ) ?: 'default',
		];
	}

	/**
	 * Get Ads in Group (with logic).
	 *
	 * @param int $id Group ID.
	 * @return array List of Ad IDs to display.
	 */
	public static function get_ads_for_display( $id ) {
		$post = get_post( $id );
		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return [];
		}

		$ads      = get_post_meta( $id, '_advajra_ads', true ) ?: [];
		$rotation = get_post_meta( $id, '_advajra_rotation', true ) ?: 'default';

		if ( empty( $ads ) ) {
			return [];
		}

		if ( 'random' === $rotation ) {
			shuffle( $ads );
			return [ $ads[0] ];
		}

		return $ads;
	}
}
