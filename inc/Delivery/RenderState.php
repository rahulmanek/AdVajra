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
		self::$rendered_ads        = [];
		self::$needs_tracking_asset = false;
	}
}
