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
			25
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

		$settings_data = [
			'root'            => esc_url_raw( rest_url( 'advajra/v1/' ) ),
			'nonce'           => wp_create_nonce( 'wp_rest' ),
			'pluginUrl'       => ADVAJRA_URL,
			'timezone'        => wp_timezone_string(),
			'timezone_offset' => 'UTC' . $offset_string,
			'isPro'           => defined( 'ADVAJRA_PRO_ACTIVE' ) && ADVAJRA_PRO_ACTIVE,
			'proFeatures'     => apply_filters( 'advajra_pro_features', [] ),
			'presets'         => \AdVajra\Data\Defaults::get_presets_for_frontend(),
			'reset_defaults'  => \AdVajra\Data\Defaults::get_reset_defaults(),
			'userRoles'       => $this->get_user_roles(),
			'adTypes'         => $ad_types,
			'activeModules'   => $module_manager->get_active_module_ids(),
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
