<?php
/**
 * Cron Manager.
 *
 * Handles free-plugin cron tasks.
 * Tracking sync/retention jobs are owned by the PRO plugin.
 * This class keeps only ad-expiration scheduling in the free plugin.
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Cron
 */
class Cron {

	/**
	 * Init.
	 */
	public function init() {
		add_action( 'advajra_expire_single_ad', [ $this, 'expire_single_ad' ] );
	}

	/**
	 * Schedule expiration for a specific ad.
	 *
	 * @param int $post_id The Ad ID.
	 * @param int $timestamp The UNIX timestamp when it should expire.
	 * @return void
	 */
	public static function schedule_expiration( $post_id, $timestamp ) {
		wp_clear_scheduled_hook( 'advajra_expire_single_ad', [ $post_id ] );

		if ( $timestamp > time() ) {
			wp_schedule_single_event( $timestamp, 'advajra_expire_single_ad', [ $post_id ] );
		}
	}

	/**
	 * Callback: Expire a single ad.
	 *
	 * @param int $post_id The Ad ID.
	 * @return void
	 */
	public function expire_single_ad( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post || 'advajra_ad' !== $post->post_type ) {
			return;
		}

		wp_update_post(
			[
				'ID'          => $post_id,
				'post_status' => 'expired',
			]
		);
	}

	/**
	 * Add custom schedules.
	 *
	 * @param array $schedules Schedules.
	 * @return array
	 */
	public function add_schedules( $schedules ) {
		$settings = get_option( 'advajra_settings', [] );
		$interval = isset( $settings['sync_interval'] ) ? absint( $settings['sync_interval'] ) : 5;

		$interval_seconds = $interval * 60;

		$schedules['advajra_every_1min']  = [
			'interval' => 60,
			'display'  => __( 'Every 1 Minute', 'advajra' ),
		];
		$schedules['advajra_every_5min']  = [
			'interval' => 300,
			'display'  => __( 'Every 5 Minutes', 'advajra' ),
		];
		$schedules['advajra_every_15min'] = [
			'interval' => 900,
			'display'  => __( 'Every 15 Minutes', 'advajra' ),
		];
		$schedules['advajra_every_30min'] = [
			'interval' => 1800,
			'display'  => __( 'Every 30 Minutes', 'advajra' ),
		];

		return $schedules;
	}


}
