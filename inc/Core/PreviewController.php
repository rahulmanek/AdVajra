<?php
/**
 * Preview Controller.
 *
 * Forces the rendering of a specific placement on the actual site frontend
 * for realistic live previews.
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

use AdVajra\Model\Placement;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PreviewController
 */
class PreviewController {

	/**
	 * Initialize hooks.
	 */
	public static function init() {
		add_action( 'template_redirect', [ __CLASS__, 'handle_preview' ] );
	}

	/**
	 * Handle preview request.
	 */
	public static function handle_preview() {
		if ( ! isset( $_GET['advajra_preview'] ) ) {
			return;
		}

		if ( ! isset( $_GET['advajra_preview_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_GET['advajra_preview_nonce'] ) ), 'advajra_preview' ) ) {
			wp_die( 'Invalid preview link.', 'Invalid Request', [ 'response' => 403 ] );
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'You do not have permission to preview placements.', 'Permission Denied', [ 'response' => 403 ] );
		}

		$placement_id = absint( $_GET['advajra_preview'] );
		$placement    = Placement::get( $placement_id );

		if ( ! $placement ) {
			wp_die( 'Placement not found.', 'Not Found', [ 'response' => 404 ] );
		}

		$is_content_type = in_array( $placement->type, [ 'before_content', 'after_content', 'after_paragraph' ], true );
		if ( $is_content_type && ! is_single() && ! isset( $_GET['advajra_rp'] ) ) {
			$latest = get_posts(
				[
					'numberposts' => 1,
					'post_type'   => 'post',
				]
			);
			if ( ! empty( $latest ) ) {
				$url = get_permalink( $latest[0]->ID );
				$url = add_query_arg(
					[
						'advajra_preview'       => $placement_id,
						'advajra_preview_nonce' => wp_create_nonce( 'advajra_preview' ),
						'advajra_rp'            => 1,
					],
					$url
				);
				wp_safe_redirect( $url );
				exit;
			}
		}

		add_filter(
			'advajra_active_placements',
			function ( $placements ) use ( $placement, $is_content_type ) {
				$injector_type = $is_content_type ? 'content' : $placement->type;

				$preview_placement = [
					'id'        => (int) $placement->id,
					'name'      => $placement->name,
					'type'      => $injector_type,
					'item_type' => $placement->item_type,
					'item_id'   => (int) $placement->item_id,
					'args'      => [
						'point'     => ( 'before_content' === $placement->type ) ? 'before' : 'after',
						'paragraph' => $placement->paragraph_num ?? 0,
					],
				];

				return [ $preview_placement ];
			},
			99
		);

		add_action(
			'wp_enqueue_scripts',
			[ __CLASS__, 'enqueue_preview_assets' ]
		);

		add_action(
			'wp_footer',
			function () use ( $placement, $placement_id ) {
				self::render_preview_ui( $placement, $placement_id );
			},
			999
		);
	}

	/**
	 * Enqueue live preview overlay assets.
	 */
	public static function enqueue_preview_assets() {
		wp_enqueue_style(
			'advajra-preview',
			ADVAJRA_URL . 'assets/css/preview.css',
			[],
			ADVAJRA_VERSION
		);
	}

	/**
	 * Render the live preview frontend UI overlay.
	 */
	private static function render_preview_ui( $placement, $placement_id ) {
		$position_info = self::get_position_info( $placement );
		?>
		<div id="advajra-preview-toolbar">
			<div class="av-tb-title">
				<span>👁️ Live Preview Mode</span>
				<span class="av-tb-badge"><?php echo esc_html( $placement->name ); ?></span>
				<span class="av-tb-badge av-tb-badge--position"><?php echo esc_html( $position_info ); ?></span>
			</div>
			<a href="javascript:window.close();" class="av-tb-btn">Exit Preview</a>
		</div>
		<?php
	}

	/**
	 * Get human-readable position info.
	 */
	private static function get_position_info( $placement ) {
		$map = [
			'before_content'  => 'Before Content',
			'after_content'   => 'After Content',
			'after_paragraph' => 'After Paragraph ' . ( $placement->paragraph_num ?? '?' ),
			'header'          => 'Header',
			'footer'          => 'Footer',
			'shortcode'       => 'Shortcode',
		];
		return $map[ $placement->type ] ?? 'Unknown';
	}
}
