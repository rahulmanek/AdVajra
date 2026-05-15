<?php
/**
 * Ad snapshot repository.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AdSnapshotRepository
 */
class AdSnapshotRepository {

	/**
	 * Cached snapshots.
	 *
	 * @var array<int,array|null>
	 */
	private static $snapshots = [];

	/**
	 * Cached settings.
	 *
	 * @var array|null
	 */
	private static $settings = null;

	/**
	 * Prime cache for a list of IDs.
	 *
	 * @param array $ad_ids Ad IDs.
	 * @return void
	 */
	public function prime( $ad_ids ) {
		$ad_ids = array_values( array_unique( array_filter( array_map( 'absint', (array) $ad_ids ) ) ) );

		if ( empty( $ad_ids ) ) {
			return;
		}

		update_meta_cache( 'post', $ad_ids );

		get_posts(
			[
				'post_type'      => 'advajra_ad',
				'post__in'       => $ad_ids,
				'posts_per_page' => count( $ad_ids ),
				'post_status'    => 'publish',
			]
		);
	}

	/**
	 * Get normalized ad snapshot.
	 *
	 * @param int $ad_id Ad ID.
	 * @return array|null
	 */
	public function get( $ad_id ) {
		$ad_id = absint( $ad_id );
		if ( ! $ad_id ) {
			return null;
		}

		if ( array_key_exists( $ad_id, self::$snapshots ) ) {
			return self::$snapshots[ $ad_id ];
		}

		$this->prime( [ $ad_id ] );

		$post = get_post( $ad_id );
		if ( ! $post || 'advajra_ad' !== $post->post_type || 'publish' !== $post->post_status ) {
			self::$snapshots[ $ad_id ] = null;
			return null;
		}

		$settings      = $this->get_settings();
		$type          = (string) get_post_meta( $ad_id, '_advajra_type', true );
		$tracking_mode = (string) get_post_meta( $ad_id, '_advajra_tracking', true );
		$tracking_mode = ( ! empty( $tracking_mode ) && 'default' !== $tracking_mode ) ? $tracking_mode : ( $settings['default_tracking'] ?? 'both' );

		if ( isset( $settings['analytics_enabled'] ) && false === $settings['analytics_enabled'] ) {
			$tracking_mode = 'disabled';
		}

		// Tracking runtime is only available when PRO is active
		if ( 'disabled' !== $tracking_mode && ! apply_filters( 'advajra_enable_tracking_script', false ) ) {
			$tracking_mode = 'disabled';
		}

		$snapshot = [
			'id'             => $ad_id,
			'title'          => $post->post_title,
			'content'        => (string) $post->post_content,
			'type'           => $type ?: 'plain',
			'image_url'      => (string) get_post_meta( $ad_id, '_advajra_image', true ),
			'alt_text'       => (string) get_post_meta( $ad_id, '_advajra_alt_text', true ),
			'dimensions'     => get_post_meta( $ad_id, '_advajra_dimensions', true ),
			'layout'         => get_post_meta( $ad_id, '_advajra_layout', true ),
			'end_date'       => (string) get_post_meta( $ad_id, '_advajra_end_date', true ),
			'targeting'      => get_post_meta( $ad_id, '_advajra_targeting', true ),
			'tracking_mode'  => $tracking_mode,
			'link_url'       => (string) get_post_meta( $ad_id, '_advajra_url', true ),
			'link_target'    => (string) get_post_meta( $ad_id, '_advajra_target', true ),
			'open_new_tab'   => get_post_meta( $ad_id, '_advajra_open_new_tab', true ),
			'link_nofollow'  => (string) get_post_meta( $ad_id, '_advajra_nofollow', true ),
			'link_sponsored' => (string) get_post_meta( $ad_id, '_advajra_sponsored', true ),
			'settings'       => $settings,
		];

		$snapshot['dimensions'] = is_array( $snapshot['dimensions'] ) ? $snapshot['dimensions'] : [];
		$snapshot['layout']     = is_array( $snapshot['layout'] ) ? $snapshot['layout'] : [];

		self::$snapshots[ $ad_id ] = $snapshot;

		return $snapshot;
	}

	/**
	 * Get cached plugin settings.
	 *
	 * @return array
	 */
	private function get_settings() {
		if ( null === self::$settings ) {
			$settings       = get_option( 'advajra_settings', [] );
			self::$settings = is_array( $settings ) ? $settings : [];
		}

		return self::$settings;
	}

	/**
	 * Reset all cached data.
	 *
	 * Call from unit tests, admin preview flows, or when settings
	 * are saved to ensure the next render uses fresh data.
	 *
	 * @return void
	 */
	public static function reset() {
		self::$snapshots = [];
		self::$settings  = null;
	}
}
