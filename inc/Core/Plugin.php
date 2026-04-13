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
	 * @var Plugin|null
	 */
	private static $instance = null;

	/**
	 * Main instance.
	 *
	 * @return Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->includes();
		$this->init_hooks();
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
		add_action( 'init', [ $this, 'init' ] );
		add_action( 'widgets_init', [ $this, 'register_widgets' ] );
		register_activation_hook( ADVAJRA_FILE, [ $this, 'activation_hook' ] );
		register_deactivation_hook( ADVAJRA_FILE, [ $this, 'deactivation_hook' ] );
	}

	/**
	 * Init.
	 */
	public function init() {
		( new \AdVajra\Model\PostTypes() )->init();
		( new \AdVajra\Core\Runtime\ApiRuntime() )->init();
		( new \AdVajra\Core\Runtime\FrontendRuntime() )->init();
		( new \AdVajra\Core\Runtime\CronRuntime() )->init();

		\AdVajra\Core\PreviewController::init();
		( new \AdVajra\Core\Runtime\AdminRuntime() )->init();

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
