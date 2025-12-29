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
			$placement = \AdVajra\Model\Placement::get( $placement_id );
			if ( ! $placement ) {
				return '';
			}

			$item_type = is_numeric( $placement->item_type )
				? \AdVajra\Model\Placement::id_to_item_type( $placement->item_type )
				: $placement->item_type;

			if ( 'ad' === $item_type ) {
				$ad_id = absint( $placement->item_id );
			} elseif ( 'group' === $item_type ) {
				$ads   = \AdVajra\Model\Group::get_ads_for_display( absint( $placement->item_id ) );
				$ad_id = ! empty( $ads ) ? absint( $ads[0] ) : 0;
			}
		}

		if ( ! $ad_id ) {
			return '';
		}

		return ( new Renderer() )->render( $ad_id );
	}
}
