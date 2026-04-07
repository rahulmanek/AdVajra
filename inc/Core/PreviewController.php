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
			'wp_footer',
			function () use ( $placement, $placement_id ) {
				self::render_preview_ui( $placement, $placement_id );
			},
			999
		);
	}

	/**
	 * Render the live preview frontend UI overlay.
	 */
	private static function render_preview_ui( $placement, $placement_id ) {
		$position_info = self::get_position_info( $placement );
		?>
		<style>
			/* Highlight the injected ad */
			.advajra-ad-wrapper[data-ad-id] {
				position: relative !important;
				outline: 4px dashed #6366f1 !important;
				outline-offset: 4px !important;
				border-radius: 4px !important;
				animation: advajra-pulse-border 2s infinite !important;
				z-index: 9999 !important;
			}
			.advajra-ad-wrapper[data-ad-id]::before {
				content: "📍 YOUR PLACEMENT";
				position: absolute;
				top: -30px;
				left: -4px;
				background: #6366f1;
				color: white;
				font-size: 11px;
				font-weight: bold;
				padding: 4px 8px;
				border-radius: 4px 4px 0 0;
				letter-spacing: 0.5px;
				z-index: 10000;
				pointer-events: none;
				box-shadow: 0 -2px 10px rgba(99, 102, 241, 0.4);
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			}
			@keyframes advajra-pulse-border {
				0% { outline-color: #6366f1; }
				50% { outline-color: #a855f7; }
				100% { outline-color: #6366f1; }
			}

			/* Floating Toolbar */
			#advajra-preview-toolbar {
				position: fixed;
				bottom: 0;
				left: 0;
				right: 0;
				background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
				color: white;
				padding: 12px 24px;
				display: flex;
				align-items: center;
				justify-content: space-between;
				z-index: 2147483647;
				box-shadow: 0 -4px 25px rgba(0,0,0,0.4);
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			}
			body {
				margin-bottom: 60px !important;
			}
			.av-tb-title {
				font-size: 14px;
				font-weight: 600;
				display: flex;
				align-items: center;
				gap: 12px;
			}
			.av-tb-badge {
				background: rgba(255,255,255,0.15);
				padding: 3px 10px;
				border-radius: 12px;
				font-size: 11px;
				text-transform: uppercase;
				letter-spacing: 1px;
				border: 1px solid rgba(255,255,255,0.1);
			}
			.av-tb-btn {
				background: #ef4444;
				color: white;
				text-decoration: none;
				padding: 6px 16px;
				border-radius: 6px;
				font-size: 13px;
				font-weight: 600;
				transition: 0.2s;
				box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
			}
			.av-tb-btn:hover {
				background: #dc2626;
				color: white;
			}
		</style>
		<div id="advajra-preview-toolbar">
			<div class="av-tb-title">
				<span>👁️ Live Preview Mode</span>
				<span class="av-tb-badge"><?php echo esc_html( $placement->name ); ?></span>
				<span class="av-tb-badge" style="background:#6366f1; border-color:#818cf8;"><?php echo esc_html( $position_info ); ?></span>
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
