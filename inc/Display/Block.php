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

		register_block_type(
			ADVAJRA_PATH . 'src/blocks/advajra-ad',
			[
				'editor_script'   => 'advajra-ad-block',
				'render_callback' => [ $this, 'render_callback' ],
			]
		);
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
			return \AdVajra\Display\Renderer::render( $id );
		}

		if ( 'placement' === $type ) {
			$placement = \AdVajra\Model\Placement::get( $id );
			if ( ! $placement ) {
				return '';
			}

			$ad_id     = 0;
			$item_type = \AdVajra\Model\Placement::id_to_item_type( $placement->item_type );

			if ( 'ad' === $item_type ) {
				$ad_id = intval( $placement->item_id );
			} elseif ( 'group' === $item_type ) {
				$ads   = \AdVajra\Model\Group::get_ads_for_display( $placement->item_id );
				$ad_id = ! empty( $ads ) ? $ads[0] : 0;
			}

			if ( ! $ad_id ) {
				return '';
			}

			return \AdVajra\Display\Renderer::render( $ad_id );
		}

		return '';
	}
}
