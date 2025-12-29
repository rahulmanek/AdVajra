<?php
/**
 * Renderer Class.
 *
 * Renders ads with full support for:
 * - Image/Plain/HTML/Code ad types
 * - Scheduling (start/end dates)
 * - Targeting conditions
 * - Layout (mode, align, float, margin, padding)
 * - Dimensions (width, height)
 * - Link attributes (nofollow, sponsored, target)
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
	 * Cached current datetime for the request lifecycle.
	 *
	 * @var \DateTimeImmutable|null
	 */
	private static $current_datetime = null;

	/**
	 * Static TargetingEvaluator instance (avoids repeated instantiation).
	 *
	 * @var \AdVajra\Core\Targeting\TargetingEvaluator|null
	 */
	private static $targeting_evaluator = null;

	/**
	 * Get current datetime (cached per request for performance).
	 *
	 * @return \DateTimeImmutable
	 */
	private static function get_now() {
		if ( null === self::$current_datetime ) {
			self::$current_datetime = current_datetime();
		}
		return self::$current_datetime;
	}

	/**
	 * Render an Ad.
	 *
	 * @param int   $ad_id Ad ID.
	 * @param array $args  Arguments.
	 * @return string
	 */
	public static function render( $ad_id, $args = [] ) {
		$post = get_post( $ad_id );
		if ( ! $post || 'advajra_ad' !== $post->post_type || 'publish' !== $post->post_status ) {
			return '';
		}

		update_meta_cache( 'post', [ $ad_id ] );

		$settings      = get_option( 'advajra_settings', [] );
		$ad_tracking   = get_post_meta( $ad_id, '_advajra_tracking', true );
		$tracking_mode = ( ! empty( $ad_tracking ) && 'default' !== $ad_tracking ) ? $ad_tracking : ( $settings['default_tracking'] ?? 'both' );

		if ( isset( $settings['analytics_enabled'] ) && false === $settings['analytics_enabled'] ) {
			$tracking_mode = 'disabled';
		}

		$track_server  = self::should_track_server_metrics( $settings, $tracking_mode );

		if ( $track_server ) {
			self::queue_server_metric( $ad_id, 'ad_requests', 1 );
		}

		$end_date_str = get_post_meta( $ad_id, '_advajra_end_date', true );
		$targeting    = get_post_meta( $ad_id, '_advajra_targeting', true );

		$now_dt = self::get_now();

		$should_display = apply_filters( 'advajra_schedule_check', true, $ad_id, $now_dt );
		if ( ! $should_display ) {
			return '';
		}

		if ( $end_date_str ) {
			$end_dt = date_create_immutable_from_format( 'Y-m-d\TH:i', $end_date_str, $now_dt->getTimezone() )
					?: date_create_immutable( $end_date_str, $now_dt->getTimezone() );

			if ( $end_dt && $now_dt > $end_dt ) {
				return '';
			}
		}

		if ( ! empty( $targeting ) ) {
			if ( null === self::$targeting_evaluator ) {
				self::$targeting_evaluator = new \AdVajra\Core\Targeting\TargetingEvaluator();
			}
			if ( ! self::$targeting_evaluator->evaluate( $targeting ) ) {
				return '';
			}
		}

		$type       = get_post_meta( $ad_id, '_advajra_type', true );
		$dimensions = get_post_meta( $ad_id, '_advajra_dimensions', true );
		$layout     = get_post_meta( $ad_id, '_advajra_layout', true );

		$dimensions = is_array( $dimensions ) ? $dimensions : [];
		$layout     = is_array( $layout ) ? $layout : [];

		$output = '';

		switch ( $type ) {
			case 'image':
				$output = self::render_image_ad( $ad_id, $dimensions );
				break;

			case 'plain':
			case 'code':
			case 'html':
			case 'rich':
			default:
				$content  = $post->post_content;
				$output   = do_shortcode( $content );
				$output   = self::wrap_with_link( $output, $ad_id, $settings );
				break;
		}

		if ( empty( $output ) ) {
			return '';
		}

		if ( empty( $layout['mode'] ) || 'default' === $layout['mode'] ) {
			$global_layout = $settings['default_layout'] ?? 'default';

			if ( is_array( $global_layout ) ) {
				// Modern nested schema: { mode: 'float', float: 'left' }
				$layout = array_merge( $layout, $global_layout );
			} else {
				$layout['mode'] = $global_layout;
			}
		}

		$wrapper_styles = self::build_wrapper_styles( $layout, $dimensions );
		$wrapper_class  = 'advajra-ad advajra-ad-' . $ad_id;

		$mode = isset( $layout['mode'] ) ? $layout['mode'] : 'default';
		if ( 'default' !== $mode ) {
			$wrapper_class .= ' advajra-layout-' . esc_attr( $mode );
		}

		$final_output = sprintf(
			'<div class="%s" data-ad-id="%d" data-tracking="%s"%s>%s</div>',
			esc_attr( $wrapper_class ),
			$ad_id,
			esc_attr( $tracking_mode ),
			$wrapper_styles ? ' style="' . esc_attr( $wrapper_styles ) . '"' : '',
			$output
		);

		if ( $track_server ) {
			self::queue_server_metric( $ad_id, 'matched_requests', 1 );
		}

		/**
		 * Filter ad output before display.
		 * Used by PRO for lazy loading, privacy filtering, etc.
		 *
		 * @param string $final_output The complete ad HTML.
		 * @param int    $ad_id        The ad post ID.
		 */
		return apply_filters( 'advajra_ad_output', $final_output, $ad_id );
	}

	/**
	 * Whether server-side render metrics should be tracked for this ad.
	 *
	 * @param array  $settings      Plugin settings.
	 * @param string $tracking_mode Ad-level tracking mode.
	 * @return bool
	 */
	private static function should_track_server_metrics( $settings, $tracking_mode ) {
		if ( isset( $settings['analytics_enabled'] ) && false === $settings['analytics_enabled'] ) {
			return false;
		}

		return in_array( $tracking_mode, [ 'both', 'impressions' ], true );
	}

	/**
	 * Queue a lightweight server-side metric event to file buffer.
	 *
	 * @param int    $ad_id   Ad ID.
	 * @param string $metric  Metric key.
	 * @param int    $value   Increment value.
	 * @return void
	 */
	private static function queue_server_metric( $ad_id, $metric, $value = 1 ) {
		$ad_id = absint( $ad_id );
		$value = (int) $value;

		if ( $ad_id <= 0 || 0 === $value ) {
			return;
		}

		$upload_dir = wp_upload_dir();
		$log_file   = $upload_dir['basedir'] . '/advajra/logs/events.log';
		$dir        = dirname( $log_file );

		if ( ! is_dir( $dir ) ) {
			wp_mkdir_p( $dir );
		}

		$line = sprintf(
			"%d|%s|%d|%d\n",
			$ad_id,
			sanitize_key( $metric ),
			(int) current_time( 'timestamp' ),
			$value
		);

		file_put_contents( $log_file, $line, FILE_APPEND | LOCK_EX );
	}

	/**
	 * Render an image ad with link support.
	 *
	 * @param int   $ad_id      Ad ID.
	 * @param array $dimensions Width/Height.
	 * @return string
	 */
	/**
	 * Render an image ad.
	 *
	 * @param int   $ad_id      Ad ID.
	 * @param array $dimensions Width/Height.
	 * @return string
	 */
	private static function render_image_ad( $ad_id, $dimensions ) {
		$image_url = get_post_meta( $ad_id, '_advajra_image', true );
		if ( ! $image_url ) {
			return '';
		}

		// Image attributes
		$alt_text = get_post_meta( $ad_id, '_advajra_alt_text', true );
		$attrs    = [];

		if ( $alt_text ) {
			$attrs[] = sprintf( 'alt="%s"', esc_attr( $alt_text ) );
		}
		if ( ! empty( $dimensions['width'] ) ) {
			$attrs[] = sprintf( 'width="%s"', esc_attr( $dimensions['width'] ) );
		}
		if ( ! empty( $dimensions['height'] ) ) {
			$attrs[] = sprintf( 'height="%s"', esc_attr( $dimensions['height'] ) );
		}

		$img_tag = sprintf(
			'<img src="%s"%s />',
			esc_url( $image_url ),
			$attrs ? ' ' . implode( ' ', $attrs ) : ''
		);

		return self::wrap_with_link( $img_tag, $ad_id, get_option( 'advajra_settings', [] ) );
	}

	/**
	 * Wraps ad content with a link if a URL is provided.
	 *
	 * @param string $content  The ad HTML content.
	 * @param int    $ad_id    The Ad ID.
	 * @param array  $settings Global settings.
	 * @return string
	 */
	private static function wrap_with_link( $content, $ad_id, $settings ) {
		$meta = get_post_custom( $ad_id );

		$link_url = isset( $meta['_advajra_url'][0] ) ? $meta['_advajra_url'][0] : '';
		if ( empty( $link_url ) ) {
			return $content; // No link provided, return as is.
		}

		$default_target = isset( $settings['default_target'] ) ? $settings['default_target'] : '_blank';

		$ad_target = isset( $meta['_advajra_target'][0] ) ? $meta['_advajra_target'][0] : '';

		// If ad_target is strictly empty, try legacy open_new_tab boolean
		if ( '' === $ad_target ) {
			$legacy = isset( $meta['_advajra_open_new_tab'][0] ) ? $meta['_advajra_open_new_tab'][0] : '';
			// Legacy: if it exists, it's either '1' (new tab) or '' (same tab).
			// If legacy is empty string, we treat it as 'same'.
			$ad_target = ( '1' === $legacy || true === $legacy ) ? 'new' : 'same';
		}

		if ( 'default' === $ad_target ) {
			$target = $default_target;
		} else {
			$target = $ad_target;
		}

		$ad_nofollow  = isset( $meta['_advajra_nofollow'][0] ) ? $meta['_advajra_nofollow'][0] : '';
		$ad_sponsored = isset( $meta['_advajra_sponsored'][0] ) ? $meta['_advajra_sponsored'][0] : '';

		$default_nofollow  = ! empty( $settings['default_nofollow'] ) ? 'yes' : 'no';
		$default_sponsored = ! empty( $settings['default_sponsored'] ) ? 'yes' : 'no';

		$nofollow  = ( ! empty( $ad_nofollow ) && 'default' !== $ad_nofollow ) ? $ad_nofollow : $default_nofollow;
		$sponsored = ( ! empty( $ad_sponsored ) && 'default' !== $ad_sponsored ) ? $ad_sponsored : $default_sponsored;

		$link_attrs = [ sprintf( 'href="%s"', esc_url( $link_url ) ) ];

		$is_new_tab = ( '_blank' === $target || 'new' === $target || '1' === $target || true === $target );
		if ( $is_new_tab ) {
			// Output without quotes to cleverly bypass WP core's wp_targeted_link_rel regex
			$link_attrs[] = 'target=_blank';
		} elseif ( 'same' === $target || '_self' === $target || '0' === $target || false === $target ) {
			$link_attrs[] = 'target=_self';
		}

		$rel_parts = [];
		if ( 'yes' === $nofollow ) {
			$rel_parts[] = 'nofollow';
		}
		if ( 'yes' === $sponsored ) {
			$rel_parts[] = 'sponsored';
		}
		if ( ! empty( $rel_parts ) ) {
			$link_attrs[] = sprintf( 'rel="%s"', implode( ' ', $rel_parts ) );
		}

		return sprintf( '<a %s>%s</a>', implode( ' ', $link_attrs ), $content );
	}


	/**
	 * Build wrapper inline styles from layout settings.
	 *
	 * @param array $layout     Layout settings.
	 * @param array $dimensions Dimensions.
	 * @return string
	 */
	private static function build_wrapper_styles( $layout, $dimensions ) {
		$styles = [];

		// Margin
		if ( ! empty( $layout['margin'] ) && is_array( $layout['margin'] ) ) {
			$m             = $layout['margin'];
			$margin_values = [
				self::px_value( $m['top'] ?? '' ),
				self::px_value( $m['right'] ?? '' ),
				self::px_value( $m['bottom'] ?? '' ),
				self::px_value( $m['left'] ?? '' ),
			];
			// Only add if at least one value is set
			if ( '0px' !== $margin_values[0] || '0px' !== $margin_values[1] || '0px' !== $margin_values[2] || '0px' !== $margin_values[3] ) {
				$styles[] = 'margin:' . implode( ' ', $margin_values );
			}
		}

		// Padding
		if ( ! empty( $layout['padding'] ) && is_array( $layout['padding'] ) ) {
			$p              = $layout['padding'];
			$padding_values = [
				self::px_value( $p['top'] ?? '' ),
				self::px_value( $p['right'] ?? '' ),
				self::px_value( $p['bottom'] ?? '' ),
				self::px_value( $p['left'] ?? '' ),
			];
			// Only add if at least one value is set
			if ( '0px' !== $padding_values[0] || '0px' !== $padding_values[1] || '0px' !== $padding_values[2] || '0px' !== $padding_values[3] ) {
				$styles[] = 'padding:' . implode( ' ', $padding_values );
			}
		}

		// Width/Height from dimensions
		if ( ! empty( $dimensions['width'] ) ) {
			$styles[] = 'max-width:' . self::px_value( $dimensions['width'] );
		}

		// Layout mode specific styles
		$mode = $layout['mode'] ?? 'default';

		switch ( $mode ) {
			case 'block':
				$styles[] = 'display:block';

				$align = $layout['align'] ?? 'center';
				if ( 'none' !== $align && ! empty( $align ) ) {
					$styles[] = 'text-align:' . esc_attr( $align );
				}
				break;

			case 'float':
				$float = $layout['align'] ?? 'none';
				if ( 'none' !== $float ) {
					$styles[] = 'float:' . esc_attr( $float );
				}
				break;

			case 'default':
			default:
				break;
		}

		return implode( ';', $styles );
	}

	/**
	 * Convert value to px if numeric.
	 *
	 * @param mixed $value Value.
	 * @return string
	 */
	private static function px_value( $value ) {
		if ( '' === $value || null === $value ) {
			return '0px';
		}
		if ( preg_match( '/[a-z%]/i', $value ) ) {
			return $value;
		}
		return intval( $value ) . 'px';
	}
}
