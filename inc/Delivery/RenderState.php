<?php
/**
 * Per-request render state.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class RenderState
 */
final class RenderState {

	/**
	 * Rendered ad IDs.
	 *
	 * @var array<int,bool>
	 */
	private static $rendered_ads = [];

	/**
	 * Whether tracking runtime is needed.
	 *
	 * @var bool
	 */
	private static $needs_tracking_asset = false;

	/**
	 * Number of image ads rendered so far in this request.
	 *
	 * Used by the Smart Loading module to distinguish the first image ad
	 * (likely above the fold → eager) from subsequent images (→ lazy).
	 * WordPress core uses the same render-order heuristic for its own
	 * native lazy-loading of content images.
	 *
	 * @var int
	 */
	private static $image_render_count = 0;

	/**
	 * Mark an ad render.
	 *
	 * @param int  $ad_id                  Ad ID.
	 * @param bool $requires_tracking_asset Whether frontend runtime is needed.
	 * @return void
	 */
	public static function mark_rendered( $ad_id, $requires_tracking_asset = false ) {
		$ad_id = absint( $ad_id );
		if ( ! $ad_id ) {
			return;
		}

		self::$rendered_ads[ $ad_id ] = true;

		if ( $requires_tracking_asset ) {
			self::$needs_tracking_asset = true;
		}
	}

	/**
	 * Increment the image ad render counter and return the new value.
	 *
	 * Call this immediately before rendering an image ad's `<img>` tag.
	 * A return value of 1 indicates the first image ad on the page.
	 *
	 * @return int The 1-based ordinal of this image ad in the current request.
	 */
	public static function increment_image_render_count(): int {
		return ++self::$image_render_count;
	}

	/**
	 * Get the current image ad render count without incrementing.
	 *
	 * @return int
	 */
	public static function get_image_render_count(): int {
		return self::$image_render_count;
	}

	/**
	 * Whether any ad rendered in this request.
	 *
	 * @return bool
	 */
	public static function has_rendered_ads() {
		return ! empty( self::$rendered_ads );
	}

	/**
	 * Whether tracking assets are required.
	 *
	 * @return bool
	 */
	public static function needs_tracking_asset() {
		return self::$needs_tracking_asset;
	}

	/**
	 * Reset all render-state bookkeeping.
	 *
	 * @return void
	 */
	public static function reset() {
		self::$rendered_ads         = [];
		self::$needs_tracking_asset = false;
		self::$image_render_count   = 0;
	}
}
