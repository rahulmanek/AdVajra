<?php
/**
 * Ad renderer.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

use AdVajra\Display\Scripts;
use AdVajra\Utils\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AdRenderer
 */
class AdRenderer {

	/**
	 * Snapshot repository.
	 *
	 * @var AdSnapshotRepository|null
	 */
	private static $snapshots = null;

	/**
	 * Cached current datetime for the request.
	 *
	 * @var \DateTimeImmutable|null
	 */
	private static $current_datetime = null;

	/**
	 * Shared targeting evaluator.
	 *
	 * @var \AdVajra\Core\Targeting\TargetingEvaluator|null
	 */
	private static $targeting_evaluator = null;

	/**
	 * Legacy content renderer.
	 *
	 * @var LegacyContentRenderer|null
	 */
	private static $legacy_renderer = null;

	/**
	 * Render an ad in a context.
	 *
	 * @param int    $ad_id    Ad ID.
	 * @param string $context  Render context.
	 * @param array  $options  Render options.
	 * @return string
	 */
	public static function render( $ad_id, $context, $options = [] ) {
		try {
			$snapshot = self::snapshots()->get( $ad_id );
			if ( empty( $snapshot ) ) {
				return '';
			}

			$track_server = self::should_track_server_metrics( $snapshot );
			if ( $track_server ) {
				do_action( 'advajra_track_server_event', $snapshot['id'], 'ad_requests', 1 );
			}

			if ( ! self::should_display( $snapshot ) ) {
				return '';
			}

			$output = self::render_content( $snapshot );
			if ( '' === $output ) {
				return '';
			}

			$layout         = self::resolve_layout( $snapshot );
			$wrapper_styles = self::build_wrapper_styles( $layout, $snapshot['dimensions'] );
			$wrapper_class  = 'advajra-ad advajra-ad-' . $snapshot['id'];
			$mode           = ( isset( $layout['mode'] ) && '' !== $layout['mode'] ) ? $layout['mode'] : 'default';

			if ( 'default' !== $mode ) {
				$wrapper_class .= ' advajra-layout-' . sanitize_html_class( $mode );
			}

			$data_attrs = [
				'data-ad-id="' . esc_attr( $snapshot['id'] ) . '"',
				'data-tracking="' . esc_attr( $snapshot['tracking_mode'] ) . '"',
				'data-render-context="' . esc_attr( RenderContext::normalize( $context ) ) . '"',
			];

			if ( ! empty( $options['placement_id'] ) ) {
				$data_attrs[] = 'data-placement-id="' . esc_attr( (string) absint( $options['placement_id'] ) ) . '"';
			}

			if ( ! empty( $options['placement_type'] ) ) {
				$data_attrs[] = 'data-placement-type="' . esc_attr( sanitize_key( $options['placement_type'] ) ) . '"';
			}

			$final_output = sprintf(
				'<div class="%s"%s%s>%s</div>',
				esc_attr( $wrapper_class ),
				$wrapper_styles ? ' style="' . esc_attr( $wrapper_styles ) . '"' : '',
				' ' . implode( ' ', $data_attrs ),
				$output
			);

			if ( $track_server ) {
				do_action( 'advajra_track_server_event', $snapshot['id'], 'matched_requests', 1 );
			}

			$requires_tracking_asset = Scripts::requires_tracking_runtime( $snapshot['tracking_mode'] );
			RenderState::mark_rendered( $snapshot['id'], $requires_tracking_asset );

			return apply_filters( 'advajra_ad_output', $final_output, $snapshot['id'] );

		} catch ( \Throwable $e ) {
			// One broken ad must never crash the page.
			// Route to our private plugin log, controlled by the Debug Mode setting.
			Logger::error(
				'Ad render failed',
				[
					'ad_id'   => (int) $ad_id,
					'context' => (string) $context,
					'error'   => $e->getMessage(),
					'file'    => $e->getFile(),
					'line'    => $e->getLine(),
				]
			);
			return '';
		}
	}

	/**
	 * Shared link wrapper for fast and legacy renderers.
	 *
	 * @param string $content  Content.
	 * @param array  $snapshot Ad snapshot.
	 * @return string
	 */
	public static function wrap_with_link( $content, $snapshot ) {
		$link_url = isset( $snapshot['link_url'] ) ? (string) $snapshot['link_url'] : '';
		if ( '' === $link_url ) {
			return $content;
		}

		$settings          = isset( $snapshot['settings'] ) && is_array( $snapshot['settings'] ) ? $snapshot['settings'] : [];
		$default_target    = isset( $settings['default_target'] ) ? $settings['default_target'] : '_blank';
		$target_preference = isset( $snapshot['link_target'] ) ? $snapshot['link_target'] : '';

		if ( '' === $target_preference ) {
			$legacy_target     = $snapshot['open_new_tab'];
			$target_preference = ( '1' === $legacy_target || true === $legacy_target ) ? 'new' : 'same';
		}

		$target = ( 'default' === $target_preference ) ? $default_target : $target_preference;

		$default_nofollow  = ! empty( $settings['default_nofollow'] ) ? 'yes' : 'no';
		$default_sponsored = ! empty( $settings['default_sponsored'] ) ? 'yes' : 'no';
		$nofollow          = ( ! empty( $snapshot['link_nofollow'] ) && 'default' !== $snapshot['link_nofollow'] ) ? $snapshot['link_nofollow'] : $default_nofollow;
		$sponsored         = ( ! empty( $snapshot['link_sponsored'] ) && 'default' !== $snapshot['link_sponsored'] ) ? $snapshot['link_sponsored'] : $default_sponsored;

		$link_attrs = [ sprintf( 'href="%s"', esc_url( $link_url ) ) ];

		$is_new_tab = ( '_blank' === $target || 'new' === $target || '1' === $target || true === $target );
		if ( $is_new_tab ) {
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
	 * Resolve default/global layout.
	 *
	 * @param array $snapshot Snapshot.
	 * @return array
	 */
	private static function resolve_layout( $snapshot ) {
		$layout   = isset( $snapshot['layout'] ) && is_array( $snapshot['layout'] ) ? $snapshot['layout'] : [];
		$settings = isset( $snapshot['settings'] ) && is_array( $snapshot['settings'] ) ? $snapshot['settings'] : [];

		if ( empty( $layout['mode'] ) || 'default' === $layout['mode'] ) {
			$global_layout = $settings['default_layout'] ?? 'default';

			if ( is_array( $global_layout ) ) {
				$layout = array_merge( $layout, $global_layout );
			} else {
				$layout['mode'] = $global_layout;
			}
		}

		return $layout;
	}

	/**
	 * Render ad content by type.
	 *
	 * @param array $snapshot Snapshot.
	 * @return string
	 */
	private static function render_content( $snapshot ) {
		if ( 'image' === $snapshot['type'] ) {
			return self::render_image_ad( $snapshot );
		}

		if ( self::should_use_legacy_renderer( $snapshot ) ) {
			return self::legacy_renderer()->render( $snapshot );
		}

		return self::wrap_with_link( $snapshot['content'], $snapshot );
	}

	/**
	 * Whether content should use the compatibility lane.
	 *
	 * @param array $snapshot Snapshot.
	 * @return bool
	 */
	private static function should_use_legacy_renderer( $snapshot ) {
		$content = isset( $snapshot['content'] ) ? (string) $snapshot['content'] : '';
		if ( '' === $content ) {
			return false;
		}

		$looks_heavy = false !== stripos( $content, '<script' )
			|| false !== stripos( $content, '<iframe' )
			|| false !== stripos( $content, '<?' )
			|| preg_match( '/\[[a-zA-Z_][^\]]*\]/', $content );

		return (bool) apply_filters( 'advajra_use_legacy_content_renderer', $looks_heavy, $snapshot );
	}

	/**
	 * Whether the ad should be displayed.
	 *
	 * @param array $snapshot Snapshot.
	 * @return bool
	 */
	private static function should_display( $snapshot ) {
		$now_dt         = self::get_now();
		$should_display = apply_filters( 'advajra_schedule_check', true, $snapshot['id'], $now_dt );
		if ( ! $should_display ) {
			return false;
		}

		if ( ! empty( $snapshot['end_date'] ) ) {
			$end_dt = date_create_immutable_from_format( 'Y-m-d\TH:i', $snapshot['end_date'], $now_dt->getTimezone() );

			if ( ! $end_dt ) {
				$end_dt = date_create_immutable( $snapshot['end_date'], $now_dt->getTimezone() );
			}

			if ( $end_dt && $now_dt > $end_dt ) {
				return false;
			}
		}

		if ( ! empty( $snapshot['targeting'] ) ) {
			if ( null === self::$targeting_evaluator ) {
				self::$targeting_evaluator = new \AdVajra\Core\Targeting\TargetingEvaluator();
			}

			if ( ! self::$targeting_evaluator->evaluate( $snapshot['targeting'] ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Whether server metrics should be collected.
	 *
	 * @param array $snapshot Snapshot.
	 * @return bool
	 */
	private static function should_track_server_metrics( $snapshot ) {
		$settings = isset( $snapshot['settings'] ) && is_array( $snapshot['settings'] ) ? $snapshot['settings'] : [];
		if ( isset( $settings['analytics_enabled'] ) && false === $settings['analytics_enabled'] ) {
			return false;
		}

		return in_array( $snapshot['tracking_mode'], [ 'both', 'impressions' ], true );
	}

	/**
	 * Render image ad markup.
	 *
	 * @param array $snapshot Snapshot.
	 * @return string
	 */
	private static function render_image_ad( $snapshot ) {
		if ( empty( $snapshot['image_url'] ) ) {
			return '';
		}

		RenderState::increment_image_render_count();

		$attrs = [];
		if ( ! empty( $snapshot['alt_text'] ) ) {
			$attrs[] = sprintf( 'alt="%s"', esc_attr( $snapshot['alt_text'] ) );
		}
		if ( ! empty( $snapshot['dimensions']['width'] ) ) {
			$attrs[] = sprintf( 'width="%s"', esc_attr( $snapshot['dimensions']['width'] ) );
		}
		if ( ! empty( $snapshot['dimensions']['height'] ) ) {
			$attrs[] = sprintf( 'height="%s"', esc_attr( $snapshot['dimensions']['height'] ) );
		}

		$attrs = apply_filters( 'advajra_ad_image_attributes', $attrs, $snapshot );
		$attrs = is_array( $attrs ) ? $attrs : [];

		$img_tag = sprintf(
			'<img src="%s"%s />',
			esc_url( $snapshot['image_url'] ),
			$attrs ? ' ' . implode( ' ', $attrs ) : ''
		);

		return self::wrap_with_link( $img_tag, $snapshot );
	}

	/**
	 * Build wrapper styles.
	 *
	 * @param array $layout     Layout settings.
	 * @param array $dimensions Dimensions.
	 * @return string
	 */
	private static function build_wrapper_styles( $layout, $dimensions ) {
		$styles = [];

		if ( ! empty( $layout['margin'] ) && is_array( $layout['margin'] ) ) {
			$m             = $layout['margin'];
			$margin_values = [
				self::px_value( $m['top'] ?? '' ),
				self::px_value( $m['right'] ?? '' ),
				self::px_value( $m['bottom'] ?? '' ),
				self::px_value( $m['left'] ?? '' ),
			];
			if ( '0px' !== $margin_values[0] || '0px' !== $margin_values[1] || '0px' !== $margin_values[2] || '0px' !== $margin_values[3] ) {
				$styles[] = 'margin:' . implode( ' ', $margin_values );
			}
		}

		if ( ! empty( $layout['padding'] ) && is_array( $layout['padding'] ) ) {
			$p              = $layout['padding'];
			$padding_values = [
				self::px_value( $p['top'] ?? '' ),
				self::px_value( $p['right'] ?? '' ),
				self::px_value( $p['bottom'] ?? '' ),
				self::px_value( $p['left'] ?? '' ),
			];
			if ( '0px' !== $padding_values[0] || '0px' !== $padding_values[1] || '0px' !== $padding_values[2] || '0px' !== $padding_values[3] ) {
				$styles[] = 'padding:' . implode( ' ', $padding_values );
			}
		}

		if ( ! empty( $dimensions['width'] ) ) {
			$styles[] = 'max-width:' . self::px_value( $dimensions['width'] );
		}

		$mode = isset( $layout['mode'] ) ? $layout['mode'] : 'default';

		switch ( $mode ) {
			case 'block':
				$styles[] = 'display:block';

				$align = $layout['align'] ?? 'center';
				if ( 'none' !== $align && '' !== $align ) {
					$styles[] = 'text-align:' . esc_attr( $align );
				}
				break;

			case 'float':
				$float = $layout['align'] ?? 'none';
				if ( 'none' !== $float ) {
					$styles[] = 'float:' . esc_attr( $float );
				}
				break;
		}

		return implode( ';', $styles );
	}

	/**
	 * Convert a value to a CSS px value.
	 *
	 * @param mixed $value Value.
	 * @return string
	 */
	private static function px_value( $value ) {
		if ( '' === $value || null === $value ) {
			return '0px';
		}
		if ( preg_match( '/[a-z%]/i', (string) $value ) ) {
			return (string) $value;
		}
		return intval( $value ) . 'px';
	}

	/**
	 * Get current datetime.
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
	 * Get snapshot repository.
	 *
	 * @return AdSnapshotRepository
	 */
	private static function snapshots() {
		if ( null === self::$snapshots ) {
			self::$snapshots = new AdSnapshotRepository();
		}

		return self::$snapshots;
	}

	/**
	 * Get legacy renderer.
	 *
	 * @return LegacyContentRenderer
	 */
	private static function legacy_renderer() {
		if ( null === self::$legacy_renderer ) {
			self::$legacy_renderer = new LegacyContentRenderer();
		}

		return self::$legacy_renderer;
	}
}
