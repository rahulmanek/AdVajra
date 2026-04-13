<?php
/**
 * Buffered tracking collector for render-path server metrics.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class TrackingCollector
 */
final class TrackingCollector {

	/**
	 * Supported metric fields.
	 *
	 * @var string[]
	 */
	private static $metric_fields = [
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
	 * In-request buffer.
	 *
	 * @var array<int,array<string,int>>
	 */
	private static $buffer = [];

	/**
	 * Whether hooks are registered.
	 *
	 * @var bool
	 */
	private static $bootstrapped = false;

	/**
	 * Cache key prefix.
	 *
	 * @var string
	 */
	private static $cache_prefix = 'advajra_track_';

	/**
	 * Bootstrap shutdown flushing once.
	 *
	 * @return void
	 */
	public static function bootstrap() {
		if ( self::$bootstrapped ) {
			return;
		}

		self::$bootstrapped = true;
		add_action( 'shutdown', [ __CLASS__, 'flush' ], 1 );
	}

	/**
	 * Collect a metric increment.
	 *
	 * @param int    $ad_id  Ad ID.
	 * @param string $metric Metric key.
	 * @param int    $value  Increment.
	 * @return void
	 */
	public static function collect( $ad_id, $metric, $value = 1 ) {
		$ad_id  = absint( $ad_id );
		$metric = sanitize_key( $metric );
		$value  = (int) $value;

		if ( ! $ad_id || 0 === $value || ! in_array( $metric, self::$metric_fields, true ) ) {
			return;
		}

		self::bootstrap();

		if ( ! isset( self::$buffer[ $ad_id ] ) ) {
			self::$buffer[ $ad_id ] = [];
		}

		if ( ! isset( self::$buffer[ $ad_id ][ $metric ] ) ) {
			self::$buffer[ $ad_id ][ $metric ] = 0;
		}

		self::$buffer[ $ad_id ][ $metric ] += $value;
	}

	/**
	 * Flush buffered metrics.
	 *
	 * @return void
	 */
	public static function flush() {
		if ( empty( self::$buffer ) ) {
			return;
		}

		$aggregates   = self::$buffer;
		self::$buffer = [];

		if ( self::has_apcu() ) {
			self::store_in_apcu( $aggregates );
			return;
		}

		if ( wp_using_ext_object_cache() ) {
			self::store_in_object_cache( $aggregates );
			return;
		}

		self::store_in_file( $aggregates );
	}

	/**
	 * Check APCu availability.
	 *
	 * @return bool
	 */
	private static function has_apcu() {
		return function_exists( 'apcu_store' ) && function_exists( 'apcu_enabled' ) && apcu_enabled();
	}

	/**
	 * Store in APCu.
	 *
	 * @param array<int,array<string,int>> $aggregates Aggregated metrics.
	 * @return void
	 */
	private static function store_in_apcu( $aggregates ) {
		$date = current_time( 'Y-m-d' );
		$hour = current_time( 'H' );

		foreach ( $aggregates as $ad_id => $metrics ) {
			foreach ( $metrics as $metric => $delta ) {
				if ( 0 === (int) $delta ) {
					continue;
				}

				$key = self::$cache_prefix . $ad_id . '_' . $date . '_' . $hour . '_' . $metric;

				if ( ! apcu_exists( $key ) ) {
					apcu_store( $key, (int) $delta, 7200 );
					continue;
				}

				if ( (int) $delta > 0 ) {
					apcu_inc( $key, (int) $delta );
				}
			}
		}

		apcu_store( self::$cache_prefix . 'has_data', true, 7200 );
	}

	/**
	 * Store in object cache.
	 *
	 * @param array<int,array<string,int>> $aggregates Aggregated metrics.
	 * @return void
	 */
	private static function store_in_object_cache( $aggregates ) {
		$date = current_time( 'Y-m-d' );
		$hour = current_time( 'H' );

		foreach ( $aggregates as $ad_id => $metrics ) {
			foreach ( $metrics as $metric => $delta ) {
				$delta = (int) $delta;
				if ( 0 === $delta ) {
					continue;
				}

				$key = self::$cache_prefix . $ad_id . '_' . $date . '_' . $hour . '_' . $metric;

				// Use atomic increment when possible (Redis, Memcached).
				// wp_cache_incr returns false if the key does not exist.
				$result = wp_cache_incr( $key, $delta, 'advajra' );

				if ( false === $result ) {
					// Key does not exist yet — seed it.
					wp_cache_set( $key, $delta, 'advajra', 7200 );
				}
			}
		}

		wp_cache_set( self::$cache_prefix . 'has_data', true, 'advajra', 7200 );
	}

	/**
	 * Store in file as a shutdown fallback.
	 *
	 * @param array<int,array<string,int>> $aggregates Aggregated metrics.
	 * @return void
	 */
	private static function store_in_file( $aggregates ) {
		$upload_dir = wp_upload_dir();
		$log_file   = $upload_dir['basedir'] . '/advajra/logs/events.log';
		$dir        = dirname( $log_file );

		if ( ! is_dir( $dir ) ) {
			wp_mkdir_p( $dir );
		}

		if ( ! file_exists( $dir . '/.htaccess' ) ) {
			file_put_contents( $dir . '/.htaccess', "deny from all\n" );
		}

		$lines     = '';
		$timestamp = time();

		foreach ( $aggregates as $ad_id => $metrics ) {
			foreach ( $metrics as $metric => $delta ) {
				$delta = (int) $delta;
				if ( 0 === $delta ) {
					continue;
				}

				$lines .= $ad_id . '|' . $metric . '|' . $timestamp . '|' . $delta . "\n";
			}
		}

		if ( '' !== $lines ) {
			file_put_contents( $log_file, $lines, FILE_APPEND | LOCK_EX );
		}
	}
}
