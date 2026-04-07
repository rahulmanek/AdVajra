<?php
/**
 * IP Blocker Module.
 *
 * @package AdVajra\Core\Modules
 */

namespace AdVajra\Core\Modules;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class IpBlockerModule
 */
class IpBlockerModule implements ModuleInterface {

	/**
	 * Get Module ID.
	 */
	public function get_id(): string {
		return 'ip_blocker';
	}

	/**
	 * Get Module Name.
	 */
	public function get_name(): string {
		return 'IP Blocker';
	}

	/**
	 * Get Module Description.
	 */
	public function get_description(): string {
		return 'Block specific IP addresses from seeing your ads. Protect your revenue from known bad actors and bots.';
	}

	/**
	 * Is this a Pro feature?
	 */
	public function is_pro(): bool {
		return false;
	}

	/**
	 * Is module always active?
	 */
	public function is_always_active(): bool {
		return false;
	}

	/**
	 * Get module icon identifier.
	 */
	public function get_icon(): string {
		return 'ip_blocker';
	}

	/**
	 * Does module have settings?
	 */
	public function has_settings(): bool {
		return true;
	}

	/**
	 * Initialize module.
	 */
	public function init(): void {
		add_filter( 'advajra_is_user_allowed', [ $this, 'enforce_ip_blocking' ] );
	}

	/**
	 * Enforce IP blocking against the current user.
	 *
	 * @param bool $is_allowed Current allowed state.
	 * @return bool True if allowed, false if blocked.
	 */
	public function enforce_ip_blocking( bool $is_allowed ): bool {
		if ( ! $is_allowed ) {
			return false;
		}

		$settings    = get_option( 'advajra_settings', [] );
		$blocked_ips = $settings['blocked_ips'] ?? [];

		if ( empty( $blocked_ips ) || ! is_array( $blocked_ips ) ) {
			return $is_allowed;
		}

		$blocked_map = array_flip( array_map( 'trim', $blocked_ips ) );
		$user_ip     = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';

		$headers_to_check = [
			'HTTP_CLIENT_IP',
			'HTTP_X_FORWARDED_FOR',
			'HTTP_X_FORWARDED',
			'HTTP_X_CLUSTER_CLIENT_IP',
			'HTTP_FORWARDED_FOR',
			'HTTP_FORWARDED',
		];

		foreach ( $headers_to_check as $header ) {
			if ( ! empty( $_SERVER[ $header ] ) ) {
				$forwarded_ips = explode( ',', sanitize_text_field( wp_unslash( $_SERVER[ $header ] ) ) );
				$potential_ip  = trim( $forwarded_ips[0] );

				if ( filter_var( $potential_ip, FILTER_VALIDATE_IP ) ) {
					$user_ip = $potential_ip;
					break;
				}
			}
		}

		if ( empty( $user_ip ) ) {
			return $is_allowed;
		}

		if ( isset( $blocked_map[ $user_ip ] ) ) {
			return false;
		}

		return $is_allowed;
	}
}
