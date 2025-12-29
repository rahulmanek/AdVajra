<?php
/**
 * Core Plugin Class.
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Plugin
 */
final class Plugin {

	/**
	 * The single instance of the class.
	 *
	 * @var Plugin
	 */
	private static $instance = null;

	/**
	 * Main instance.
	 *
	 * @return Plugin
	 */
	public static function instance() {
		if ( is_null( self::$instance ) ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->define_constants();
		$this->includes();
		$this->init_hooks();
	}

	/**
	 * Define constants.
	 */
	private function define_constants() {
	}

	/**
	 * Include required files.
	 */
	private function includes() {
		if ( file_exists( ADVAJRA_PATH . 'inc/Core/functions.php' ) ) {
			require_once ADVAJRA_PATH . 'inc/Core/functions.php';
		}

		if ( file_exists( ADVAJRA_PATH . 'inc/API/AdTypesRest.php' ) ) {
			require_once ADVAJRA_PATH . 'inc/API/AdTypesRest.php';
		}
	}

	/**
	 * Hook into WordPress.
	 */
	private function init_hooks() {
		add_action( 'plugins_loaded', [ $this, 'on_plugins_loaded' ] );
		add_action( 'init', [ $this, 'init' ] );
		add_action( 'widgets_init', [ $this, 'register_widgets' ] );
		register_activation_hook( ADVAJRA_FILE, [ $this, 'activation_hook' ] );
		register_deactivation_hook( ADVAJRA_FILE, [ $this, 'deactivation_hook' ] );
	}

	/**
	 * Plugins Loaded.
	 */
	public function on_plugins_loaded() {
		load_plugin_textdomain( 'advajra', false, dirname( ADVAJRA_BASENAME ) . '/languages' );
	}

	/**
	 * Init.
	 */
	public function init() {
		( new \AdVajra\Model\PostTypes() )->init();

		add_action(
			'rest_api_init',
			function () {
				( new \AdVajra\API\Ads() )->register_routes();
				( new \AdVajra\API\Placements() )->register_routes();
				( new \AdVajra\API\Settings() )->register_routes();
				( new \AdVajra\API\Targeting() )->register_routes();
				( new \AdVajra\API\Tracking() )->register_routes();
				( new \AdVajra\API\Analytics() )->register_routes();
				( new \AdVajra\API\Modules() )->register_routes();
				( new \AdVajra\API\AdsTxt() )->register_routes();
			}
		);

		( new \AdVajra\Display\Shortcode() )->init();
		( new \AdVajra\Display\Block() )->init();

		\AdVajra\Core\Placements\Injector::get_instance()->init();

		( new \AdVajra\Core\Cron() )->init();

		( new \AdVajra\Display\Scripts() )->init();

		\AdVajra\Core\PreviewController::init();

		if ( is_admin() ) {
			( new \AdVajra\Core\Admin() )->init();
		}

		\AdVajra\Features\Privacy::init();

		$module_manager = new \AdVajra\Core\Modules\ModuleManager();
		$module_manager->init();

		$registry = \AdVajra\Core\Targeting\TargetingRegistry::instance();
		$registry->register( new \AdVajra\Core\Targeting\PostType() );
		$registry->register( new \AdVajra\Core\Targeting\Category() );
		$registry->register( new \AdVajra\Core\Targeting\UserRole() );
		$registry->register( new \AdVajra\Core\Targeting\Device() );
	}

	/**
	 * Register Widgets.
	 */
	public function register_widgets() {
		register_widget( '\AdVajra\Display\Widget' );
	}

	/**
	 * Activation hook.
	 */
	public function activation_hook() {
		\AdVajra\Core\Install::install();
	}

	/**
	 * Deactivation hook.
	 */
	public function deactivation_hook() {
		wp_clear_scheduled_hook( 'advajra_sync_tracking' );
		wp_clear_scheduled_hook( 'advajra_cleanup_stats' );
	}
}
