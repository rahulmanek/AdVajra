<?php
/**
 * Ad Model.
 *
 * Wrapper for advajra_ad custom post type.
 * Provides static methods for CRUD operations.
 *
 * @package AdVajra\Model
 */

namespace AdVajra\Model;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Ad
 */
class Ad {

	/**
	 * Post type slug.
	 */
	const POST_TYPE = 'advajra_ad';

	/**
	 * Get an ad by ID.
	 *
	 * @param int $id Ad ID.
	 * @return \WP_Post|null Post object or null if not found.
	 */
	public static function get( $id ) {
		$id = absint( $id );
		if ( ! $id ) {
			return null;
		}

		$post = get_post( $id );

		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return null;
		}

		return $post;
	}

	/**
	 * Get all ads.
	 *
	 * @param array $args Optional query args.
	 * @return array Array of WP_Post objects.
	 */
	public static function get_all( $args = [] ) {
		$defaults = [
			'post_type'      => self::POST_TYPE,
			'posts_per_page' => -1,
			'post_status'    => 'any',
			'orderby'        => 'date',
			'order'          => 'DESC',
		];

		$query = new \WP_Query( array_merge( $defaults, $args ) );

		return $query->posts;
	}

	/**
	 * Get ad type.
	 *
	 * @param int $id Ad ID.
	 * @return string Type (image, code, plain).
	 */
	public static function get_type( $id ) {
		$type = get_post_meta( $id, '_advajra_type', true );
		return $type ?: 'plain';
	}

	/**
	 * Get ad image URL.
	 *
	 * @param int $id Ad ID.
	 * @return string Image URL or empty string.
	 */
	public static function get_image( $id ) {
		return get_post_meta( $id, '_advajra_image', true ) ?: '';
	}

	/**
	 * Get ad click URL.
	 *
	 * @param int $id Ad ID.
	 * @return string URL or empty string.
	 */
	public static function get_url( $id ) {
		return get_post_meta( $id, '_advajra_url', true ) ?: '';
	}

	/**
	 * Check if ad should open in new tab.
	 *
	 * @param int $id Ad ID.
	 * @return bool
	 */
	public static function get_open_new_tab( $id ) {
		return (bool) get_post_meta( $id, '_advajra_open_new_tab', true );
	}

	/**
	 * Render ad HTML with tracking wrapper.
	 *
	 * @param int   $id Ad ID.
	 * @param array $options Optional render options.
	 * @return string HTML output.
	 */
	public static function render( $id, $options = [] ) {
		$post = self::get( $id );
		if ( ! $post ) {
			return '';
		}

		$type   = self::get_type( $id );
		$url    = self::get_url( $id );
		$target = self::get_open_new_tab( $id ) ? ' target="_blank"' : '';

		$html = '';

		switch ( $type ) {
			case 'image':
				$image = self::get_image( $id );
				$alt   = get_post_meta( $id, '_advajra_alt_text', true ) ?: $post->post_title;
				if ( $image ) {
					$img_html = '<img src="' . esc_url( $image ) . '" alt="' . esc_attr( $alt ) . '" style="max-width:100%;height:auto;">';
					$html     = $url ? '<a href="' . esc_url( $url ) . '"' . $target . '>' . $img_html . '</a>' : $img_html;
				}
				break;

			case 'code':
				$html = $post->post_content;
				break;

			case 'plain':
			default:
				$html = wp_kses_post( $post->post_content );
				if ( $url ) {
					$html = '<a href="' . esc_url( $url ) . '"' . $target . '>' . $html . '</a>';
				}
				break;
		}

		return sprintf(
			'<div class="advajra-ad" data-ad-id="%d">%s</div>',
			$id,
			$html
		);
	}
}
