<?php
/**
 * Shortcode Class.
 *
 * @package AdVajra\Display
 */

namespace AdVajra\Display;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Shortcode
 */
class Shortcode {

	/**
	 * Init.
	 */
	public function init() {
		add_shortcode( 'advajra', [ $this, 'render_shortcode' ] );
	}

	/**
	 * Render Shortcode.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public function render_shortcode( $atts ) {
		$atts = shortcode_atts(
			[
				// New preferred attributes.
				'ad'        => 0,
				'placement' => 0,
			],
			$atts,
			'advajra'
		);

		$ad_id        = absint( $atts['ad'] );
		$placement_id = absint( $atts['placement'] );

		// Placement takes priority when explicitly provided.
		if ( $placement_id ) {
			return wp_kses_post(
				\AdVajra\Delivery\PlacementRenderer::render(
					$placement_id,
					\AdVajra\Delivery\RenderContext::SHORTCODE
				)
			);
		}

		if ( ! $ad_id ) {
			return '';
		}

		return wp_kses_post(
			\AdVajra\Delivery\AdRenderer::render(
				$ad_id,
				\AdVajra\Delivery\RenderContext::SHORTCODE
			)
		);
	}
}
