<?php
/**
 * Legacy compatibility renderer for heavy content.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class LegacyContentRenderer
 */
class LegacyContentRenderer {

	/**
	 * Render heavy or legacy ad content.
	 *
	 * @param array $snapshot Ad snapshot.
	 * @return string
	 */
	public function render( $snapshot ) {
		$content = isset( $snapshot['content'] ) ? (string) $snapshot['content'] : '';
		if ( '' === $content ) {
			return '';
		}

		$output = do_shortcode( $content );

		return AdRenderer::wrap_with_link( $output, $snapshot );
	}
}
