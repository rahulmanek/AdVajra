<?php
/**
 * Custom Code Module.
 *
 * Allows users to inject arbitrary HTML, CSS, and JS snippets into their site's
 * <head>, <body>, and <footer> safely and efficiently.
 *
 * @package AdVajra\Core\Modules
 */

namespace AdVajra\Core\Modules;

use AdVajra\Core\Modules\ModuleInterface;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class CustomCodeModule
 */
class CustomCodeModule implements ModuleInterface {

	/**
	 * Get module ID.
	 */
	public function get_id(): string {
		return 'custom_code';
	}

	/**
	 * Get module name.
	 */
	public function get_name(): string {
		return __( 'Custom Code', 'advajra' );
	}

	/**
	 * Get module description.
	 */
	public function get_description(): string {
		return __( 'Inject HTML, CSS, or JS into the site header, body, or footer.', 'advajra' );
	}

	/**
	 * Get module category.
	 */
	public function get_category(): string {
		return 'advanced';
	}

	/**
	 * Get module icon identifier.
	 */
	public function get_icon(): string {
		return 'code';
	}

	/**
	 * Is module PRO only?
	 */
	public function is_pro(): bool {
		return false;
	}

	/**
	 * Is module always active?
	 */
	public function is_always_active(): bool {
		return true;
	}

	/**
	 * Does module have settings UI?
	 */
	public function has_settings(): bool {
		return true;
	}

	/**
	 * Initialize module hooks.
	 */
	public function init(): void {
		$settings = get_option( 'advajra_settings', [] );

		if ( ! empty( $settings['custom_code_header_enabled'] ) ) {
			add_action( 'wp_head', [ $this, 'inject_header' ], 999 );
		}

		if ( ! empty( $settings['custom_code_body_enabled'] ) ) {
			add_action( 'wp_body_open', [ $this, 'inject_body' ], 1 );
		}

		if ( ! empty( $settings['custom_code_footer_enabled'] ) ) {
			add_action( 'wp_footer', [ $this, 'inject_footer' ], 999 );
		}
	}

	public function inject_header(): void {
		$settings = get_option( 'advajra_settings', [] );
		if ( ! empty( $settings['custom_code_header'] ) ) {
			echo "\n<!-- AdVajra Custom Code (Header) -->\n";
			echo $settings['custom_code_header']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo "\n";
		}
	}

	public function inject_body(): void {
		$settings = get_option( 'advajra_settings', [] );
		if ( ! empty( $settings['custom_code_body'] ) ) {
			echo "\n<!-- AdVajra Custom Code (Body) -->\n";
			echo $settings['custom_code_body']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo "\n";
		}
	}

	public function inject_footer(): void {
		$settings = get_option( 'advajra_settings', [] );
		if ( ! empty( $settings['custom_code_footer'] ) ) {
			echo "\n<!-- AdVajra Custom Code (Footer) -->\n";
			echo $settings['custom_code_footer']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo "\n";
		}
	}
}
