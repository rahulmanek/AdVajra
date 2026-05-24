<?php
/**
 * Admin Class.
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Admin
 */
class Admin {

	/**
	 * Init.
	 */
	public function init() {
		add_action( 'admin_menu', [ $this, 'add_menu_page' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
		add_action( 'wp_ajax_advajra_report_error', [ $this, 'handle_report_error' ] );
	}

	/**
	 * Add Menu Page.
	 */
	public function add_menu_page() {
		add_menu_page(
			__( 'AdVajra', 'advajra' ),
			__( 'AdVajra', 'advajra' ),
			'manage_options',
			'advajra',
			[ $this, 'render_admin_page' ],
			$this->get_menu_icon_data_uri(),
			58
		);
	}

	/**
	 * Get WP admin menu icon as data URI.
	 *
	 * WP expects a compact 20x20 icon here, not a full logo asset.
	 *
	 * @return string
	 */
	private function get_menu_icon_data_uri() {
		return 'data:image/svg+xml;base64,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';
	}

	/**
	 * Render Admin Page.
	 */
	public function render_admin_page() {
		echo '<div id="advajra-app"></div>';
	}

	/**
	 * Enqueue Assets.
	 *
	 * @param string $hook Hook suffix.
	 */
	public function enqueue_assets( $hook ) {
		if ( 'toplevel_page_advajra' !== $hook ) {
			return;
		}

		$asset_file = ADVAJRA_PATH . 'build/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		wp_enqueue_media();
		wp_enqueue_editor();
		wp_enqueue_code_editor( [ 'type' => 'text/html' ] );

		$asset = require $asset_file;

		wp_enqueue_script(
			'advajra-app',
			ADVAJRA_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_enqueue_style(
			'advajra-fonts',
			ADVAJRA_URL . 'assets/css/fonts.css',
			[],
			ADVAJRA_VERSION
		);

		wp_enqueue_style(
			'advajra-app',
			ADVAJRA_URL . 'build/style-index.css',
			[ 'wp-components', 'advajra-fonts' ],
			$asset['version']
		);

		$tz             = new \DateTimeZone( wp_timezone_string() );
		$now            = new \DateTime( 'now', $tz );
		$offset_seconds = $tz->getOffset( $now );
		$offset_hours   = intval( $offset_seconds / 3600 );
		$offset_minutes = abs( intval( ( $offset_seconds % 3600 ) / 60 ) );
		$offset_string  = sprintf( '%+d:%02d', $offset_hours, $offset_minutes );

		$ad_types = [];
		if ( class_exists( '\AdVajra\Core\AdTypes' ) ) {
			$ad_types = \AdVajra\Core\AdTypes::get_types();
		}

		$module_manager = new \AdVajra\Core\Modules\ModuleManager();
		$module_manager->init();

		$current_user  = wp_get_current_user();
		$settings_data = [
			'root'             => esc_url_raw( rest_url( 'advajra/v1/' ) ),
			'nonce'            => wp_create_nonce( 'wp_rest' ),
			'previewNonce'     => wp_create_nonce( 'advajra_preview' ),
			'telemetryNonce'   => wp_create_nonce( 'advajra_telemetry' ),
			'ajaxUrl'          => admin_url( 'admin-ajax.php' ),
			'pluginUrl'        => ADVAJRA_URL,
			'timezone'         => wp_timezone_string(),
			'timezone_offset'  => 'UTC' . $offset_string,
			'isPro'            => defined( 'ADVAJRA_PRO_ACTIVE' ) && ADVAJRA_PRO_ACTIVE,
			'proFeatures'      => apply_filters( 'advajra_pro_features', [] ),
			'presets'          => \AdVajra\Data\Defaults::get_presets_for_frontend(),
			'reset_defaults'   => \AdVajra\Data\Defaults::get_reset_defaults(),
			'userRoles'        => $this->get_user_roles(),
			'adTypes'          => $ad_types,
			'activeModules'    => $module_manager->get_active_module_ids(),
			'currentUserEmail' => $current_user->user_email ?: '',
		];

		/**
		 * Filter settings data passed to React.
		 * PRO uses this to add isPro flag and proComparisonSettings.
		 *
		 * @param array $settings_data Settings data.
		 */
		$settings_data = apply_filters( 'advajra_settings_data', $settings_data );

		wp_localize_script(
			'advajra-app',
			'advajraSettings',
			$settings_data
		);
	}

	/**
	 * Handle AJAX error reporting from the React app.
	 */
	public function handle_report_error(): void {
		check_ajax_referer( 'advajra_telemetry', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Unauthorized', 403 );
		}

		$error_type    = sanitize_text_field( wp_unslash( $_POST['error_type'] ?? '' ) );
		$error_message = sanitize_textarea_field( wp_unslash( $_POST['error_message'] ?? '' ) );
		$context       = sanitize_text_field( wp_unslash( $_POST['context'] ?? '' ) );

		if ( ! $error_type || ! $error_message ) {
			wp_send_json_error( 'Bad Request', 400 );
		}

		$sent = \AdVajra\Telemetry\ErrorReporter::report( $error_type, $error_message, $context );

		wp_send_json_success( [ 'reported' => $sent ] );
	}

	/**
	 * Get all user roles for frontend.
	 *
	 * @return array
	 */
	private function get_user_roles() {
		$wp_roles = wp_roles();
		$roles    = [];

		$icons = [
			'administrator' => '🛡️',
			'editor'        => '✏️',
			'author'        => '✍️',
			'contributor'   => '📝',
			'subscriber'    => '👥',
			'customer'      => '🛒',
			'shop_manager'  => '🏪',
		];

		foreach ( $wp_roles->get_names() as $slug => $name ) {
			$roles[] = [
				'slug' => $slug,
				'name' => translate_user_role( $name ),
				'icon' => isset( $icons[ $slug ] ) ? $icons[ $slug ] : '👤',
			];
		}

		return $roles;
	}
}
