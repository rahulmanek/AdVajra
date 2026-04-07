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
	 * Init.
	 */
	public function init() {
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_scripts' ] );
	}

	/**
	 * Enqueue Scripts.
	 */
	public function enqueue_scripts() {
		$asset_file = ADVAJRA_PATH . 'build/tracking.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : [
			'dependencies' => [],
			'version'      => ADVAJRA_VERSION,
		];

		wp_enqueue_script(
			'advajra-tracking',
			ADVAJRA_URL . 'build/tracking.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
		$settings       = get_option( 'advajra_settings', [] );
		$active_modules = get_option( 'advajra_active_modules', [] );

		$tracking_config = [
			'api_url' => rest_url( 'advajra/v1/tracking' ),
			'nonce'   => wp_create_nonce( 'wp_rest' ),
		];

		$tracking_config = apply_filters( 'advajra_tracking_config', $tracking_config );

		wp_localize_script(
			'advajra-tracking',
			'advajra_config',
			$tracking_config
		);
	}
}
