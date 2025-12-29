<?php
/**
 * Cron Manager.
 *
 * Handles:
 * - Processing tracking logs (file, APCu, Redis -> MySQL)
 * - Cleanup of old stats (7-day FREE retention)
 * - Ad expiration scheduling
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
	 * Log File.
	 *
	 * @var string
	 */
	private $log_file;

	/**
	 * Cache key prefix (must match Tracking.php).
	 *
	 * @var string
	 */
	private $cache_prefix = 'advajra_track_';

	/**
	 * Metrics that map to advajra_stats columns.
	 *
	 * @var string[]
	 */
	private $metric_fields = [
		'impressions',
		'clicks',
		'ad_requests',
		'matched_requests',
		'viewable_impressions',
		'revenue_micros',
		'load_time_ms_sum',
		'load_samples',
		'viewable_time_ms_sum',
		'viewable_samples',
	];

	/**
	 * Resolve cache key dates (today + yesterday) in WP local timezone.
	 *
	 * @return string[]
	 */
	private function get_cache_key_dates() {
		$now = new \DateTimeImmutable( 'now', wp_timezone() );
		return [
			$now->format( 'Y-m-d' ),
			$now->modify( '-1 day' )->format( 'Y-m-d' ),
		];
	}

	/**
	 * Constructor.
	 */
	public function __construct() {
		$upload_dir     = wp_upload_dir();
		$this->log_file = $upload_dir['basedir'] . '/advajra/logs/events.log';
	}

	/**
	 * Init.
	 */
	public function init() {
		add_filter( 'cron_schedules', [ $this, 'add_schedules' ] ); // phpcs:ignore
		add_action( 'advajra_sync_tracking', [ $this, 'sync_tracking_to_db' ] );
		add_action( 'advajra_cleanup_stats', [ $this, 'cleanup_old_stats' ] );

		if ( ! wp_next_scheduled( 'advajra_sync_tracking' ) ) {
			$settings      = get_option( 'advajra_settings', [] );
			$interval      = isset( $settings['sync_interval'] ) ? absint( $settings['sync_interval'] ) : 5;
			$schedule_name = "advajra_every_{$interval}min";

			wp_schedule_event( time(), $schedule_name, 'advajra_sync_tracking' );
		}

		if ( ! wp_next_scheduled( 'advajra_cleanup_stats' ) ) {
			wp_schedule_event( time(), 'daily', 'advajra_cleanup_stats' );
		}

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

		$schedules['advajra_every_1min'] = [
			'interval' => 60,
			'display'  => __( 'Every 1 Minute', 'advajra' ),
		];
		$schedules['advajra_every_5min'] = [
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

	/**
	 * Cleanup old stats (7-day FREE tier limit).
	 *
	 * NOTE: This is for database hygiene only.
	 * Security is enforced at QUERY TIME in Analytics.php.
	 * Even if this cron never runs, users can't access old data.
	 *
	 * @return void
	 */
	public function cleanup_old_stats() {
		$retention_days = \AdVajra\Core\AnalyticsAccess::get_retention_days();
		if ( null === $retention_days ) {
			return;
		}

		global $wpdb;
		$table_name  = $wpdb->prefix . 'advajra_stats';
		$cutoff_date = gmdate( 'Y-m-d', strtotime( "-{$retention_days} days" ) );

		$rows_to_delete = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM $table_name WHERE date < %s",
				$cutoff_date
			)
		);

		if ( $rows_to_delete > 0 ) {
			$deleted_stats   = get_option( 'advajra_deleted_stats', [] );
			$deleted_stats[] = [
				'date' => current_time( 'Y-m-d' ),
				'rows' => (int) $rows_to_delete,
			];
			$deleted_stats = array_slice( $deleted_stats, -30 );
			update_option( 'advajra_deleted_stats', $deleted_stats );

			$wpdb->query(
				$wpdb->prepare(
					"DELETE FROM $table_name WHERE date < %s",
					$cutoff_date
				)
			);
		}
	}

	/**
	 * Sync Tracking to Database - main cron handler.
	 *
	 * @return void
	 */
	public function sync_tracking_to_db() {
		$this->process_apcu_data();
		$this->process_redis_data();
		$this->process_file_data();

		update_option( 'advajra_last_tracking_sync', current_time( 'mysql' ) );
	}

	/**
	 * Build empty metric bucket.
	 *
	 * @return array<string,int>
	 */
	private function empty_metric_bucket() {
		$bucket = [];
		foreach ( $this->metric_fields as $field ) {
			$bucket[ $field ] = 0;
		}
		return $bucket;
	}

	/**
	 * Convert a tracking line/event type to metrics.
	 *
	 * @param string $type  Event type.
	 * @param float  $value Numeric value.
	 * @return array<string,int>
	 */
	private function event_to_metrics( $type, $value ) {
		$normalized_value = (int) round( $value );

		switch ( sanitize_key( $type ) ) {
			case 'impression':
				return [ 'impressions' => 1 ];
			case 'click':
				return [ 'clicks' => 1 ];
			case 'request':
				return [ 'ad_requests' => 1 ];
			case 'matched':
				return [ 'matched_requests' => 1 ];
			case 'viewable':
				return [ 'viewable_impressions' => 1 ];
			case 'load_time':
				return $normalized_value > 0 ? [ 'load_time_ms_sum' => $normalized_value, 'load_samples' => 1 ] : [];
			case 'viewable_time':
				return $normalized_value > 0 ? [ 'viewable_time_ms_sum' => $normalized_value, 'viewable_samples' => 1 ] : [];
			case 'revenue':
				return $normalized_value !== 0 ? [ 'revenue_micros' => $normalized_value ] : [];
			case 'impressions':
			case 'clicks':
			case 'ad_requests':
			case 'matched_requests':
			case 'viewable_impressions':
			case 'load_time_ms_sum':
			case 'load_samples':
			case 'viewable_time_ms_sum':
			case 'viewable_samples':
				return $normalized_value > 0 ? [ sanitize_key( $type ) => $normalized_value ] : [];
			case 'revenue_micros':
				return $normalized_value !== 0 ? [ 'revenue_micros' => $normalized_value ] : [];
			default:
				return [];
		}
	}

	/**
	 * Collect cached stats from APCu.
	 *
	 * @return void
	 */
	private function process_apcu_data() {
		if ( ! function_exists( 'apcu_enabled' ) || ! apcu_enabled() ) {
			return;
		}

		if ( ! apcu_exists( $this->cache_prefix . 'has_data' ) ) {
			return;
		}

		$ads = get_posts(
			[
				'post_type'      => 'advajra_ad',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			]
		);

		if ( empty( $ads ) ) {
			apcu_delete( $this->cache_prefix . 'has_data' );
			return;
		}

		$stats = [];
		$dates = $this->get_cache_key_dates();
		$hours = range( 0, 23 );

		foreach ( $ads as $ad_id ) {
			foreach ( $dates as $date ) {
				foreach ( $hours as $hour ) {
					$hour_padded = str_pad( (string) $hour, 2, '0', STR_PAD_LEFT );

					foreach ( $this->metric_fields as $metric ) {
						$key = "{$this->cache_prefix}{$ad_id}_{$date}_{$hour_padded}_{$metric}";
						if ( ! apcu_exists( $key ) ) {
							continue;
						}

						$value = (int) apcu_fetch( $key );
						apcu_delete( $key );

						if ( 0 === $value ) {
							continue;
						}

						if ( ! isset( $stats[ $ad_id ][ $date ][ $hour ] ) ) {
							$stats[ $ad_id ][ $date ][ $hour ] = $this->empty_metric_bucket();
						}

						$stats[ $ad_id ][ $date ][ $hour ][ $metric ] += $value;
					}
				}
			}
		}

		$this->flush_stats_to_db( $stats );
		apcu_delete( $this->cache_prefix . 'has_data' );
	}

	/**
	 * Collect cached stats from object cache (Redis-compatible).
	 *
	 * @return void
	 */
	private function process_redis_data() {
		if ( ! wp_using_ext_object_cache() ) {
			return;
		}

		if ( ! wp_cache_get( $this->cache_prefix . 'has_data', 'advajra' ) ) {
			return;
		}

		$ads = get_posts(
			[
				'post_type'      => 'advajra_ad',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			]
		);

		if ( empty( $ads ) ) {
			wp_cache_delete( $this->cache_prefix . 'has_data', 'advajra' );
			return;
		}

		$stats = [];
		$dates = $this->get_cache_key_dates();
		$hours = range( 0, 23 );

		foreach ( $ads as $ad_id ) {
			foreach ( $dates as $date ) {
				foreach ( $hours as $hour ) {
					$hour_padded = str_pad( (string) $hour, 2, '0', STR_PAD_LEFT );

					foreach ( $this->metric_fields as $metric ) {
						$key   = "{$this->cache_prefix}{$ad_id}_{$date}_{$hour_padded}_{$metric}";
						$value = wp_cache_get( $key, 'advajra' );
						if ( false === $value ) {
							continue;
						}

						wp_cache_delete( $key, 'advajra' );

						$value = (int) $value;
						if ( 0 === $value ) {
							continue;
						}

						if ( ! isset( $stats[ $ad_id ][ $date ][ $hour ] ) ) {
							$stats[ $ad_id ][ $date ][ $hour ] = $this->empty_metric_bucket();
						}

						$stats[ $ad_id ][ $date ][ $hour ][ $metric ] += $value;
					}
				}
			}
		}

		$this->flush_stats_to_db( $stats );
		wp_cache_delete( $this->cache_prefix . 'has_data', 'advajra' );
	}

	/**
	 * Process file data (fallback and server-render pipeline metrics).
	 *
	 * @return void
	 */
	private function process_file_data() {
		if ( ! file_exists( $this->log_file ) || filesize( $this->log_file ) === 0 ) {
			return;
		}

		$processing_file = $this->log_file . '.processing';
		if ( ! rename( $this->log_file, $processing_file ) ) {
			return;
		}

		$lines = file( $processing_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
		if ( empty( $lines ) ) {
			unlink( $processing_file );
			return;
		}

		$stats = [];

		foreach ( $lines as $line ) {
			$parts = explode( '|', $line );
			if ( count( $parts ) < 3 ) {
				continue;
			}

			$ad_id     = (int) $parts[0];
			$type      = sanitize_key( $parts[1] );
			$timestamp = (int) $parts[2];
			$value     = isset( $parts[3] ) ? (float) $parts[3] : 1;

			if ( $ad_id <= 0 || $timestamp <= 0 ) {
				continue;
			}

			$date    = wp_date( 'Y-m-d', $timestamp );
			$hour    = (int) wp_date( 'H', $timestamp );
			$metrics = $this->event_to_metrics( $type, $value );

			if ( empty( $metrics ) ) {
				continue;
			}

			if ( ! isset( $stats[ $ad_id ][ $date ][ $hour ] ) ) {
				$stats[ $ad_id ][ $date ][ $hour ] = $this->empty_metric_bucket();
			}

			foreach ( $metrics as $metric => $delta ) {
				$stats[ $ad_id ][ $date ][ $hour ][ $metric ] += (int) $delta;
			}
		}

		$this->flush_stats_to_db( $stats );
		unlink( $processing_file );
	}

	/**
	 * Check whether a metric bucket has any non-zero values.
	 *
	 * @param array<string,int> $counts Metric bucket.
	 * @return bool
	 */
	private function bucket_has_values( $counts ) {
		foreach ( $this->metric_fields as $metric ) {
			if ( ! empty( $counts[ $metric ] ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Flush aggregated stats to database.
	 *
	 * @param array $stats Aggregated stats array.
	 * @return void
	 */
	private function flush_stats_to_db( $stats ) {
		if ( empty( $stats ) ) {
			return;
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'advajra_stats';

		foreach ( $stats as $ad_id => $dates ) {
			foreach ( $dates as $date => $hours ) {
				foreach ( $hours as $hour => $counts ) {
					$counts = wp_parse_args( $counts, $this->empty_metric_bucket() );
					if ( ! $this->bucket_has_values( $counts ) ) {
						continue;
					}

					$wpdb->query(
						$wpdb->prepare(
							"INSERT INTO $table_name (
								ad_id,
								date,
								hour,
								impressions,
								clicks,
								ad_requests,
								matched_requests,
								viewable_impressions,
								revenue_micros,
								load_time_ms_sum,
								load_samples,
								viewable_time_ms_sum,
								viewable_samples
							)
							VALUES (%d, %s, %d, %d, %d, %d, %d, %d, %d, %d, %d, %d, %d)
							ON DUPLICATE KEY UPDATE
								impressions = impressions + %d,
								clicks = clicks + %d,
								ad_requests = ad_requests + %d,
								matched_requests = matched_requests + %d,
								viewable_impressions = viewable_impressions + %d,
								revenue_micros = IFNULL(revenue_micros, 0) + %d,
								load_time_ms_sum = load_time_ms_sum + %d,
								load_samples = load_samples + %d,
								viewable_time_ms_sum = viewable_time_ms_sum + %d,
								viewable_samples = viewable_samples + %d",
							$ad_id,
							$date,
							$hour,
							(int) $counts['impressions'],
							(int) $counts['clicks'],
							(int) $counts['ad_requests'],
							(int) $counts['matched_requests'],
							(int) $counts['viewable_impressions'],
							(int) $counts['revenue_micros'],
							(int) $counts['load_time_ms_sum'],
							(int) $counts['load_samples'],
							(int) $counts['viewable_time_ms_sum'],
							(int) $counts['viewable_samples'],
							(int) $counts['impressions'],
							(int) $counts['clicks'],
							(int) $counts['ad_requests'],
							(int) $counts['matched_requests'],
							(int) $counts['viewable_impressions'],
							(int) $counts['revenue_micros'],
							(int) $counts['load_time_ms_sum'],
							(int) $counts['load_samples'],
							(int) $counts['viewable_time_ms_sum'],
							(int) $counts['viewable_samples']
						)
					);
				}
			}
		}
	}
}
