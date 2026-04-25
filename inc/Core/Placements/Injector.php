<?php
namespace AdVajra\Core\Placements;

use AdVajra\Delivery\PlacementRenderer;
use AdVajra\Delivery\RenderContext;
use AdVajra\Delivery\PlacementRepository;
use AdVajra\Delivery\AdSnapshotRepository;

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
	 * Placement repository.
	 *
	 * @var PlacementRepository
	 */
	private $placements;

	/**
	 * Cached plugin settings (loaded once per request).
	 *
	 * @var array|null
	 */
	private $settings = null;

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->placements = new PlacementRepository();
	}

	/**
	 * Get cached settings.
	 *
	 * @return array
	 */
	private function get_settings() {
		if ( null === $this->settings ) {
			$settings       = get_option( 'advajra_settings', [] );
			$this->settings = is_array( $settings ) ? $settings : [];
		}

		return $this->settings;
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

		$context = $this->map_hook_type_to_context( $type );
		if ( empty( $context ) ) {
			return;
		}

		$placements = $this->placements->get_active_for_context( $context );

		// Batch-load all ad meta in one DB query before the render loop.
		$this->prime_ad_snapshot_cache( $placements );

		foreach ( $placements as $placement ) {
			$html = PlacementRenderer::render( $placement->id, $context );
			if ( ! empty( $html ) ) {
				echo sprintf(
					'<div class="advajra-ad-wrapper advajra-%s">%s</div>',
					esc_attr( $type ),
					wp_kses_post( $html )
				);
			}
		}
	}

	/**
	 * @return bool
	 */
	private function is_user_allowed() {
		$settings = $this->get_settings();

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
		$settings = $this->get_settings();

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

		$before_content  = $this->placements->get_active_for_context( RenderContext::AUTO_BEFORE_CONTENT );
		$after_content   = $this->placements->get_active_for_context( RenderContext::AUTO_AFTER_CONTENT );
		$after_paragraph = $this->placements->get_active_for_context( RenderContext::AUTO_AFTER_PARAGRAPH );

		// Batch-load all ad meta in one DB query before any render loop.
		$this->prime_ad_snapshot_cache(
			array_merge(
				(array) $before_content,
				(array) $after_content,
				(array) $after_paragraph
			)
		);

		foreach ( $before_content as $placement ) {
			$html = PlacementRenderer::render( $placement->id, RenderContext::AUTO_BEFORE_CONTENT );
			if ( empty( $html ) ) {
				continue;
			}

			$content = sprintf( '<div class="advajra-ad-wrapper">%s</div>', wp_kses_post( $html ) ) . $content;
		}

		foreach ( $after_content as $placement ) {
			$html = PlacementRenderer::render( $placement->id, RenderContext::AUTO_AFTER_CONTENT );
			if ( empty( $html ) ) {
				continue;
			}

			$content .= sprintf( '<div class="advajra-ad-wrapper">%s</div>', wp_kses_post( $html ) );
		}

		foreach ( $after_paragraph as $placement ) {
			$html = PlacementRenderer::render( $placement->id, RenderContext::AUTO_AFTER_PARAGRAPH );
			if ( empty( $html ) ) {
				continue;
			}

			$paragraph = ! empty( $placement->paragraph_num ) ? intval( $placement->paragraph_num ) : 0;
			$content   = $this->inject_at_paragraph(
				$content,
				sprintf( '<div class="advajra-ad-wrapper">%s</div>', wp_kses_post( $html ) ),
				$paragraph > 0 ? $paragraph : 1,
				'after'
			);
		}

		return $content;
	}

	/**
	 * Batch-prime the AdSnapshotRepository for a list of placements.
	 *
	 * Resolves direct ad IDs from each placement and calls
	 * AdSnapshotRepository::prime() once, collapsing N individual
	 * get_post_meta() chains into a single update_meta_cache() call.
	 *
	 * Group placements are intentionally skipped here because
	 * Group::get_ads_for_display() performs its own resolution at render
	 * time; pre-priming groups would require duplicating that logic.
	 *
	 * @param array $placements Array of placement objects.
	 * @return void
	 */
	private function prime_ad_snapshot_cache( array $placements ) {
		if ( empty( $placements ) ) {
			return;
		}

		$ad_ids = [];
		foreach ( $placements as $placement ) {
			if ( ! is_object( $placement ) ) {
				continue;
			}
			// Only direct-ad placements — group resolution happens at render time.
			if ( 'ad' === $placement->item_type && ! empty( $placement->item_id ) ) {
				$ad_ids[] = (int) $placement->item_id;
			}
		}

		if ( ! empty( $ad_ids ) ) {
			( new AdSnapshotRepository() )->prime( $ad_ids );
		}
	}

	/**
	 * Map a hook type to a strict render context.
	 *
	 * @param string $type Hook type.
	 * @return string
	 */
	private function map_hook_type_to_context( $type ) {
		switch ( $type ) {
			case 'header':
				return RenderContext::AUTO_HEADER;
			case 'footer':
				return RenderContext::AUTO_FOOTER;
			default:
				return '';
		}
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
