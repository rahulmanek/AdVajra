<?php
namespace AdVajra\Core\Placements;

use AdVajra\Display\Renderer;
use AdVajra\Model\Group;
use AdVajra\Core\Targeting\TargetingEvaluator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Injector
 *
 * The "Doer". Responsible for hooking into WordPress and injecting ads
 * based on the configuration provided by the PlacementRegistry.
 *
 * @package AdVajra\Core\Placements
 */
class Injector {

	/**
	 * Instance.
	 *
	 * @var Injector
	 */
	private static $instance = null;

	/**
	 * Registry Instance.
	 *
	 * @var PlacementRegistry
	 */
	private $registry;

	/**
	 * Targeting Evaluator.
	 *
	 * @var TargetingEvaluator
	 */
	private $targeting_evaluator;

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->registry = PlacementRegistry::get_instance();
		// Assuming TargetingEvaluator is also a singleton or we instantiate/inject it
		$this->targeting_evaluator = new TargetingEvaluator();
	}

	/**
	 * Get Instance.
	 *
	 * @return Injector
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Initialize Hooks.
	 */
	public function init() {
		add_filter( 'the_content', [ $this, 'handle_content_injection' ], 99 );
		add_action( 'wp_head', [ $this, 'handle_header_injection' ], 99 );
		add_action( 'wp_footer', [ $this, 'handle_footer_injection' ], 10 );
	}

	/**
	 * Handle Header Injection.
	 */
	public function handle_header_injection() {
		$this->inject_by_type( 'header' );
	}

	/**
	 * Handle Footer Injection.
	 */
	public function handle_footer_injection() {
		$this->inject_by_type( 'footer' );
	}

	/**
	 * Generic type-based injection (header, footer).
	 */
	private function inject_by_type( $type ) {
		if ( is_admin() || ! $this->is_page_allowed() || ! $this->is_user_allowed() ) {
			return;
		}

		$placements = $this->registry->get_placements();

		foreach ( $placements as $placement ) {
			if ( $type !== $placement['type'] ) {
				continue;
			}

			$ad_id = $this->resolve_ad_id( $placement );
			if ( ! $ad_id ) {
				continue;
			}

			$html = Renderer::render( $ad_id );
			if ( ! empty( $html ) ) {
				echo sprintf(
					'<div class="advajra-ad-wrapper advajra-%s" data-ad-id="%d">%s</div>',
					esc_attr( $type ),
					$ad_id,
					$html
				);
			}
		}
	}

	/**
	 * @return bool
	 */
	private function is_user_allowed() {
		$settings = get_option( 'advajra_settings', [] );

		if ( ! empty( $settings['hidden_roles'] ) && is_array( $settings['hidden_roles'] ) && is_user_logged_in() ) {
			$user = wp_get_current_user();
			if ( ! empty( array_intersect( $settings['hidden_roles'], (array) $user->roles ) ) ) {
				return false;
			}
		}

		/**
		 * Filter: advajra_is_user_allowed
		 * Allow modules (like IP Blocker) to intercept and block users.
		 *
		 * @param bool $is_allowed Whether the user is allowed to see ads.
		 */
		return apply_filters( 'advajra_is_user_allowed', true );
	}

	/**
	 * @return bool
	 */
	private function is_page_allowed() {
		$settings = get_option( 'advajra_settings', [] );

		if ( ! empty( $settings['disable_homepage'] ) && ( is_front_page() || is_home() ) ) {
			return false;
		}
		if ( ! empty( $settings['disable_posts'] ) && is_single() && 'post' === get_post_type() ) {
			return false;
		}
		if ( ! empty( $settings['disable_pages'] ) && is_page() ) {
			return false;
		}
		if ( ! empty( $settings['disable_archives'] ) && ( is_archive() || is_category() || is_tag() || is_tax() || is_date() || is_author() ) ) {
			return false;
		}
		if ( ! empty( $settings['disable_search'] ) && is_search() ) {
			return false;
		}
		if ( ! empty( $settings['disable_404'] ) && is_404() ) {
			return false;
		}
		if ( ! empty( $settings['disable_rss'] ) && is_feed() ) {
			return false;
		}

		return true;
	}

	/**
	 * Handle Content Injection.
	 *
	 * @param string $content
	 * @return string
	 */
	public function handle_content_injection( $content ) {
		if ( is_admin() || ! is_main_query() || ! in_the_loop() || ! is_singular() || ! $this->is_page_allowed() || ! $this->is_user_allowed() ) {
			return $content;
		}

		$placements = $this->registry->get_placements();

		foreach ( $placements as $placement ) {
			if ( 'content' !== $placement['type'] ) {
				continue;
			}

			$ad_id = $this->resolve_ad_id( $placement );
			if ( ! $ad_id ) {
				continue;
			}

			$html = Renderer::render( $ad_id );
			if ( empty( $html ) ) {
				continue;
			}

			$html = sprintf(
				'<div class="advajra-ad-wrapper" data-ad-id="%d">%s</div>',
				$ad_id,
				$html
			);

			$args      = isset( $placement['args'] ) ? $placement['args'] : [];
			$point     = isset( $args['point'] ) ? $args['point'] : 'after';
			$paragraph = isset( $args['paragraph'] ) ? intval( $args['paragraph'] ) : 0;

			if ( $paragraph > 0 ) {
				$content = $this->inject_at_paragraph( $content, $html, $paragraph, $point );
			} else {
				if ( 'before' === $point ) {
					$content = $html . $content;
				} else {
					$content = $content . $html;
				}
			}
		}

		return $content;
	}

	/**
	 * Resolve Ad ID from Placement (Ad or Group).
	 *
	 * @param array $placement
	 * @return int|false
	 */
	private function resolve_ad_id( $placement ) {
		if ( 'ad' === $placement['item_type'] ) {
			return intval( $placement['item_id'] );
		} elseif ( 'group' === $placement['item_type'] ) {
			$ads = Group::get_ads_for_display( $placement['item_id'] );
			return ! empty( $ads ) ? $ads[0] : false;
		}
		return false;
	}

	/**
	 * Inject at specific paragraph.
	 *
	 * @param string $content
	 * @param string $ad_html
	 * @param int    $paragraph_index (1-based)
	 * @param string $point ('before' | 'after')
	 * @return string
	 */
	private function inject_at_paragraph( $content, $ad_html, $paragraph_index, $point ) {
		$paragraphs = explode( '</p>', $content );

		if ( count( $paragraphs ) < $paragraph_index ) {
			if ( 'after' === $point ) {
				return $content . $ad_html;
			}
			return $content;
		}

		$array_index = $paragraph_index - 1;

		if ( 'before' === $point ) {
			if ( $array_index === 0 ) {
				$content = $ad_html . $content;
				return $content;
			}
			--$array_index;
		}

		foreach ( $paragraphs as $index => $paragraph ) {
			if ( trim( $paragraph ) ) {
				$paragraphs[ $index ] .= '</p>';
			}

			if ( $index === $array_index ) {
				$paragraphs[ $index ] .= $ad_html;
			}
		}

		return implode( '', $paragraphs );
	}
}
