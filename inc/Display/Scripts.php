<?php
/**
 * Scripts Manager.
 *
 * @package AdVajra\Display
 */

namespace AdVajra\Display;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Scripts
 */
class Scripts {

	/**
	 * Whether the tracking script has been registered.
	 *
	 * @var bool
	 */
	private static $registered = false;

	/**
	 * Whether the tracking script has been enqueued.
	 *
	 * @var bool
	 */
	private static $enqueued = false;

	/**
	 * Tracking config payload.
	 *
	 * @var array
	 */
	private static $tracking_config = [];

	/**
	 * Init.
	 */
	public function init() {
		add_action( 'wp_enqueue_scripts', [ $this, 'register_assets' ] );
		add_action( 'wp_footer', [ $this, 'maybe_enqueue_tracking_script' ], 15 );
	}

	/**
	 * Register frontend assets without enqueuing them.
	 */
	public function register_assets() {
		$asset_file = ADVAJRA_PATH . 'build/tracking.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : [
			'dependencies' => [],
			'version'      => ADVAJRA_VERSION,
		];

		wp_register_script(
			'advajra-tracking',
			ADVAJRA_URL . 'build/tracking.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		self::$tracking_config = [
			'api_url' => rest_url( 'advajra/v1/tracking' ),
			'nonce'   => wp_create_nonce( 'wp_rest' ),
		];

		self::$tracking_config = apply_filters( 'advajra_tracking_config', self::$tracking_config );

		wp_add_inline_script(
			'advajra-tracking',
			'window.advajra_config = ' . wp_json_encode( self::$tracking_config ) . ';',
			'before'
		);

		self::$registered = true;
	}

	/**
	 * Whether frontend runtime is required for a rendered ad.
	 *
	 * @param string $tracking_mode Tracking mode.
	 * @return bool
	 */
	public static function requires_tracking_runtime( $tracking_mode ) {
		$tracking_mode = sanitize_key( (string) $tracking_mode );

		if ( in_array( $tracking_mode, [ 'both', 'impressions', 'clicks' ], true ) ) {
			return true;
		}

		return ! empty( self::$tracking_config['cfp_enabled'] );
	}

	/**
	 * Enqueue the tracking runtime if it was registered.
	 *
	 * @return void
	 */
	public static function enqueue_tracking_script() {
		if ( self::$enqueued || ! self::$registered ) {
			return;
		}

		wp_enqueue_script( 'advajra-tracking' );
		self::$enqueued = true;
	}

	/**
	 * Late enqueue before footer scripts print.
	 *
	 * @return void
	 */
	public function maybe_enqueue_tracking_script() {
		if ( \AdVajra\Delivery\RenderState::needs_tracking_asset() ) {
			self::enqueue_tracking_script();
		}
	}
}
