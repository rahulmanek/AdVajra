<?php
/**
 * Compatibility facade for delivery runtime rendering.
 *
 * @package AdVajra\Display
 */

namespace AdVajra\Display;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Renderer
 */
class Renderer {

	/**
	 * Render an Ad.
	 *
	 * @param int   $ad_id Ad ID.
	 * @param array $args  Arguments.
	 * @return string
	 */
	public static function render( $ad_id, $args = [] ) {
		$context = ! empty( $args['context'] ) ? $args['context'] : \AdVajra\Delivery\RenderContext::SHORTCODE;

		return \AdVajra\Delivery\AdRenderer::render( $ad_id, $context, $args );
	}

	/**
	 * Render a placement that is safe for manual embed channels.
	 *
	 * @param int   $placement_id Placement ID.
	 * @param array $args         Optional render arguments.
	 * @return string
	 */
	public static function render_placement( $placement_id, $args = [] ) {
		$context = ! empty( $args['context'] ) ? $args['context'] : \AdVajra\Delivery\RenderContext::SHORTCODE;

		return \AdVajra\Delivery\PlacementRenderer::render( $placement_id, $context, $args );
	}
}
