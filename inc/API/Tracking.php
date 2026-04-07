<?php
/**
 * Tracking REST API Controller.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

use AdVajra\Core\AnalyticsAccess;
use WP_REST_Server;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Tracking
 */
class Tracking extends Controller {

	/**
	 * Log File Path.
	 *
	 * @var string
	 */
	private $log_file;

	/**
	 * Cache key prefix for memory counters.
	 *
	 * @var string
	 */
	private $cache_prefix = 'advajra_track_';

	/**
	 * Metrics that map directly to stats table columns.
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
	 * Supported tracking event types.
	 *
	 * @var string[]
	 */
	private $supported_event_types = [
		'impression',
		'click',
		'request',
		'matched',
		'viewable',
		'load_time',
		'viewable_time',
		'revenue',
		// Backward/forward compatibility with direct metric payloads.
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
	 * Constructor.
	 */
	public function __construct() {
		$upload_dir     = wp_upload_dir();
		$this->log_file = $upload_dir['basedir'] . '/advajra/logs/events.log';
	}

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/tracking',
			[
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'record_event' ],
					'permission_callback' => '__return_true',
					'args'                => [
						'events' => [
							'required' => true,
							'type'     => 'array',
						],
					],
				],
			]
		);
	}

	/**
	 * Check if APCu is available.
	 *
	 * @return bool
	 */
	private function has_apcu() {
		return function_exists( 'apcu_store' ) && function_exists( 'apcu_enabled' ) && apcu_enabled();
	}

	/**
	 * Check if Redis (via Object Cache) is available.
	 *
	 * @return bool
	 */
	private function has_redis() {
		return wp_using_ext_object_cache();
	}

	/**
	 * Record Event - optimized to avoid DB writes in request lifecycle.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function record_event( $request ) {
		$access = AnalyticsAccess::get_access_context();

		if ( $access['is_locked'] ) {
			return new WP_REST_Response(
				[
					'success'      => false,
					'code'         => 'trial_expired',
					'message'      => 'Analytics trial has ended. Upgrade to PRO for unlimited tracking.',
					'days_expired' => max( 0, (int) $access['trial']['days_since_start'] - (int) $access['trial']['total_days'] ),
				],
				403
			);
		}

		$events = $request->get_param( 'events' );

		if ( empty( $events ) || ! is_array( $events ) ) {
			return new WP_REST_Response( [ 'success' => false ], 400 );
		}

		$settings = get_option( 'advajra_settings', [] );
		if ( isset( $settings['analytics_enabled'] ) && false === $settings['analytics_enabled'] ) {
			return new WP_REST_Response(
				[
					'success' => true,
					'skipped' => 'analytics_disabled',
				],
				200
			);
		}

		$aggregates = [];

		foreach ( $events as $event ) {
			$ad_id = absint( $event['id'] ?? 0 );
			$type  = sanitize_key( $event['type'] ?? '' );

			if ( ! $ad_id || ! in_array( $type, $this->supported_event_types, true ) ) {
				continue;
			}

			$should_track = apply_filters( 'advajra_should_track', true, $type, $event );
			if ( ! $should_track ) {
				continue;
			}

			$is_valid = apply_filters( 'advajra_validate_tracking_event', true, $event );
			if ( ! $is_valid ) {
				continue;
			}

			if ( 'click' === $type || 'clicks' === $type ) {
				$is_valid_click = apply_filters( 'advajra_validate_click', true, $event );
				if ( ! $is_valid_click ) {
					continue;
				}
			}

			$value   = isset( $event['value'] ) ? (float) $event['value'] : 1;
			$metrics = $this->event_to_metrics( $type, $value );
			if ( empty( $metrics ) ) {
				continue;
			}

			if ( ! isset( $aggregates[ $ad_id ] ) ) {
				$aggregates[ $ad_id ] = $this->empty_metric_bucket();
			}

			foreach ( $metrics as $metric => $delta ) {
				$aggregates[ $ad_id ][ $metric ] += (int) $delta;
			}
		}

		if ( empty( $aggregates ) ) {
			return new WP_REST_Response( [ 'success' => true ], 200 );
		}

		if ( $this->has_apcu() ) {
			$this->store_in_apcu( $aggregates );
		} elseif ( $this->has_redis() ) {
			$this->store_in_redis( $aggregates );
		} else {
			$this->store_in_file( $aggregates );
		}

		return new WP_REST_Response( [ 'success' => true ], 200 );
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
	 * Map inbound event type to stats metrics.
	 *
	 * @param string $event_type Event type.
	 * @param float  $value      Optional event value.
	 * @return array<string,int>
	 */
	private function event_to_metrics( $event_type, $value ) {
		$normalized_value = (int) round( $value );

		switch ( $event_type ) {
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
				return $normalized_value > 0 ? [
					'load_time_ms_sum' => $normalized_value,
					'load_samples'     => 1,
				] : [];
			case 'viewable_time':
				return $normalized_value > 0 ? [
					'viewable_time_ms_sum' => $normalized_value,
					'viewable_samples'     => 1,
				] : [];
			case 'revenue':
				return $normalized_value !== 0 ? [ 'revenue_micros' => $normalized_value ] : [];
			case 'impressions':
			case 'clicks':
			case 'ad_requests':
			case 'matched_requests':
			case 'viewable_impressions':
			case 'load_samples':
			case 'viewable_samples':
			case 'load_time_ms_sum':
			case 'viewable_time_ms_sum':
				return $normalized_value > 0 ? [ $event_type => $normalized_value ] : [];
			case 'revenue_micros':
				return $normalized_value !== 0 ? [ 'revenue_micros' => $normalized_value ] : [];
			default:
				return [];
		}
	}

	/**
	 * Store in APCu (fastest - in-process memory).
	 *
	 * @param array<int,array<string,int>> $aggregates Aggregated metrics.
	 * @return void
	 */
	private function store_in_apcu( $aggregates ) {
		$date = current_time( 'Y-m-d' );
		$hour = current_time( 'H' );

		foreach ( $aggregates as $ad_id => $metrics ) {
			foreach ( $metrics as $metric => $delta ) {
				if ( 0 === (int) $delta ) {
					continue;
				}

				$key = "{$this->cache_prefix}{$ad_id}_{$date}_{$hour}_{$metric}";

				if ( ! apcu_exists( $key ) ) {
					apcu_store( $key, (int) $delta, 7200 );
					continue;
				}

				if ( (int) $delta > 0 ) {
					apcu_inc( $key, (int) $delta );
				} else {
					$current = (int) apcu_fetch( $key );
					apcu_store( $key, $current + (int) $delta, 7200 );
				}
			}
		}

		apcu_store( $this->cache_prefix . 'has_data', true, 7200 );
	}

	/**
	 * Store in Redis/Object Cache.
	 *
	 * @param array<int,array<string,int>> $aggregates Aggregated metrics.
	 * @return void
	 */
	private function store_in_redis( $aggregates ) {
		$date = current_time( 'Y-m-d' );
		$hour = current_time( 'H' );

		foreach ( $aggregates as $ad_id => $metrics ) {
			foreach ( $metrics as $metric => $delta ) {
				if ( 0 === (int) $delta ) {
					continue;
				}

				$key     = "{$this->cache_prefix}{$ad_id}_{$date}_{$hour}_{$metric}";
				$current = (int) wp_cache_get( $key, 'advajra' );
				wp_cache_set( $key, $current + (int) $delta, 'advajra', 7200 );
			}
		}

		wp_cache_set( $this->cache_prefix . 'has_data', true, 'advajra', 7200 );
	}

	/**
	 * Store in file buffer (default fallback).
	 *
	 * @param array<int,array<string,int>> $aggregates Aggregated metrics.
	 * @return void
	 */
	private function store_in_file( $aggregates ) {
		$dir = dirname( $this->log_file );
		if ( ! is_dir( $dir ) ) {
			wp_mkdir_p( $dir );
		}

		$lines = '';
		// Use UTC epoch; Cron converts to site timezone when bucketing by date/hour.
		$timestamp = time();

		foreach ( $aggregates as $ad_id => $metrics ) {
			foreach ( $metrics as $metric => $delta ) {
				$delta = (int) $delta;
				if ( 0 === $delta ) {
					continue;
				}
				$lines .= "{$ad_id}|{$metric}|{$timestamp}|{$delta}\n";
			}
		}

		if ( ! empty( $lines ) ) {
			file_put_contents( $this->log_file, $lines, FILE_APPEND | LOCK_EX );
		}
	}
}
