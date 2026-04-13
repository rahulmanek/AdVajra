<?php
/**
 * Block Editor Integration.
 *
 * @package AdVajra\Display
 */

namespace AdVajra\Display;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Block
 */
class Block {

	/**
	 * Init properties and hooks.
	 */
	public function init() {
		$this->register_block();
	}

	/**
	 * Register Gutenberg Block.
	 */
	public function register_block() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		$asset_file   = ADVAJRA_PATH . 'build/advajra-block.asset.php';
		$dependencies = [];
		$version      = ADVAJRA_VERSION;

		if ( file_exists( $asset_file ) ) {
			$asset        = require $asset_file;
			$dependencies = $asset['dependencies'];
			$version      = $asset['version'];
		}

		wp_register_script(
			'advajra-ad-block',
			ADVAJRA_URL . 'build/advajra-block.js',
			$dependencies,
			$version,
			true
		);

		$args = [
			'editor_script'   => 'advajra-ad-block',
			'render_callback' => [ $this, 'render_callback' ],
		];

		/**
		 * Filter block registration args.
		 *
		 * PRO plugins can hook here to add `view_script_module` or
		 * other advanced block capabilities when ready.
		 *
		 * @param array $args Block registration arguments.
		 */
		$args = apply_filters( 'advajra_block_args', $args );

		register_block_type( ADVAJRA_PATH . 'src/blocks/advajra-ad', $args );
	}

	/**
	 * Render callback for ServerSideRender.
	 *
	 * @param array $attributes Block attributes.
	 * @return string HTML output.
	 */
	public function render_callback( $attributes ) {
		$type = ! empty( $attributes['type'] ) ? sanitize_text_field( $attributes['type'] ) : 'ad';
		$id   = ! empty( $attributes['id'] ) ? absint( $attributes['id'] ) : 0;

		if ( ! $id ) {
			return '';
		}

		if ( 'ad' === $type ) {
			return \AdVajra\Delivery\AdRenderer::render( $id, \AdVajra\Delivery\RenderContext::BLOCK );
		}

		if ( 'placement' === $type ) {
			return \AdVajra\Delivery\PlacementRenderer::render( $id, \AdVajra\Delivery\RenderContext::BLOCK );
		}

		return '';
	}
}
