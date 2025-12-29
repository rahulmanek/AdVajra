<?php
/**
 * Analytics access and entitlement helper.
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

use DateTimeImmutable;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Central analytics access rules for FREE vs PRO.
 */
class AnalyticsAccess {

	/**
	 * Free trial length in days.
	 */
	private const TRIAL_DAYS = 7;

	/**
	 * Default preset key.
	 */
	private const DEFAULT_PRESET = 'last_7_days';

	/**
	 * Ensure analytics trial metadata exists and is signed.
	 *
	 * @return void
	 */
	public static function bootstrap_trial_metadata() {
		$installed_at  = (int) get_option( 'advajra_installed_at', 0 );
		$trial_started = (int) get_option( 'advajra_trial_started', 0 );
		$origin        = get_option( 'advajra_trial_origin', [] );
		$origin_start  = self::get_valid_origin_started_at( $origin );
		$now           = time();

		if ( $installed_at <= 0 ) {
			$installed_at = $trial_started > 0 ? $trial_started : $now;
			update_option( 'advajra_installed_at', $installed_at );
		}

		if ( $trial_started <= 0 ) {
			$trial_started = $installed_at;
			update_option( 'advajra_trial_started', $trial_started );
		}

		$canonical_start = min(
			array_filter(
				[
					$installed_at,
					$trial_started,
					$origin_start,
				],
				function ( $value ) {
					return (int) $value > 0;
				}
			)
		);

		if ( $trial_started !== $canonical_start ) {
			update_option( 'advajra_trial_started', $canonical_start );
		}

		if ( $installed_at !== $canonical_start ) {
			update_option( 'advajra_installed_at', $canonical_start );
		}

		$expected_origin = self::build_signed_origin( $canonical_start );
		if ( $origin !== $expected_origin ) {
			update_option( 'advajra_trial_origin', $expected_origin, false );
		}
	}

	/**
	 * Check if analytics has an active PRO entitlement.
	 *
	 * @return bool
	 */
	public static function has_pro_access() {
		return defined( 'ADVAJRA_PRO_ACTIVE' ) && ADVAJRA_PRO_ACTIVE && apply_filters( 'advajra_pro_license_valid', false );
	}

	/**
	 * Get canonical trial started timestamp.
	 *
	 * @return int
	 */
	public static function get_trial_started() {
		self::bootstrap_trial_metadata();

		$installed_at  = (int) get_option( 'advajra_installed_at', 0 );
		$trial_started = (int) get_option( 'advajra_trial_started', 0 );
		$origin_start  = self::get_valid_origin_started_at( get_option( 'advajra_trial_origin', [] ) );

		$candidates = array_filter(
			[
				$installed_at,
				$trial_started,
				$origin_start,
			],
			function ( $value ) {
				return (int) $value > 0;
			}
		);

		if ( empty( $candidates ) ) {
			$started = time();
			update_option( 'advajra_installed_at', $started );
			update_option( 'advajra_trial_started', $started );
			update_option( 'advajra_trial_origin', self::build_signed_origin( $started ), false );
			return $started;
		}

		return (int) min( $candidates );
	}

	/**
	 * Get trial and retention context.
	 *
	 * @return array<string,mixed>
	 */
	public static function get_access_context() {
		$is_pro         = self::has_pro_access();
		$retention_days = self::get_retention_days();
		$deleted_stats  = get_option( 'advajra_deleted_stats', [] );
		$total_deleted  = 0;

		foreach ( $deleted_stats as $stat ) {
			$total_deleted += (int) ( $stat['rows'] ?? 0 );
		}

		$trial_started    = self::get_trial_started();
		$now              = time();
		$days_since_start = max( 0, (int) floor( ( $now - $trial_started ) / DAY_IN_SECONDS ) );
		$days_remaining   = max( 0, self::TRIAL_DAYS - $days_since_start );
		$trial_expired    = $days_remaining <= 0;
		$trial_ends_at    = date( 'Y-m-d H:i:s', $trial_started + ( self::TRIAL_DAYS * DAY_IN_SECONDS ) );
		$is_locked        = ! $is_pro && $trial_expired;

		return [
			'is_pro'    => $is_pro,
			'is_locked' => $is_locked,
			'retention' => [
				'days'           => $is_pro ? 'unlimited' : $retention_days,
				'is_pro'         => $is_pro,
				'deleted_total'  => $total_deleted,
				'deleted_recent' => array_slice( $deleted_stats, -7 ),
			],
			'trial'     => [
				'days_remaining'   => $days_remaining,
				'days_since_start' => $days_since_start,
				'expired'          => $trial_expired,
				'ends_at'          => $trial_ends_at,
				'total_days'       => self::TRIAL_DAYS,
				'started_at'       => $trial_started,
			],
		];
	}

	/**
	 * Whether tracking should still accept events.
	 *
	 * @return bool
	 */
	public static function tracking_is_allowed() {
		$access = self::get_access_context();
		return ! $access['is_locked'];
	}

	/**
	 * Get analytics retention days for free, null for unlimited.
	 *
	 * @return int|null
	 */
	public static function get_retention_days() {
		return self::has_pro_access() ? null : self::TRIAL_DAYS;
	}

	/**
	 * Get allowed analytics presets.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public static function get_allowed_presets() {
		$presets = [
			[
				'key'     => self::DEFAULT_PRESET,
				'label'   => 'Last 7 Days',
				'compare' => true,
			],
		];

		$presets = apply_filters(
			'advajra_analytics_presets',
			$presets,
			self::get_access_context()
		);

		$normalized = [];
		foreach ( (array) $presets as $preset ) {
			$key = sanitize_key( $preset['key'] ?? '' );
			if ( empty( $key ) ) {
				continue;
			}

			$normalized[ $key ] = [
				'key'     => $key,
				'label'   => sanitize_text_field( $preset['label'] ?? $key ),
				'compare' => ! empty( $preset['compare'] ),
			];
		}

		if ( empty( $normalized[ self::DEFAULT_PRESET ] ) ) {
			$normalized = array_merge(
				[
					self::DEFAULT_PRESET => [
						'key'     => self::DEFAULT_PRESET,
						'label'   => 'Last 7 Days',
						'compare' => true,
					],
				],
				$normalized
			);
		}

		return array_values( $normalized );
	}

	/**
	 * Resolve a preset into concrete query dates.
	 *
	 * @param string $requested_preset Requested preset key.
	 * @return array<string,mixed>
	 */
	public static function resolve_preset( $requested_preset ) {
		$allowed     = self::index_presets( self::get_allowed_presets() );
		$preset_key  = sanitize_key( $requested_preset );
		$preset_key  = isset( $allowed[ $preset_key ] ) ? $preset_key : self::DEFAULT_PRESET;
		$preset_meta = $allowed[ $preset_key ];
		$resolved    = self::resolve_default_preset( $preset_key );

		if ( null === $resolved ) {
			$resolved = apply_filters(
				'advajra_analytics_resolve_preset',
				null,
				$preset_key,
				self::get_access_context()
			);
		}

		if (
			! is_array( $resolved ) ||
			empty( $resolved['start'] ) ||
			empty( $resolved['end'] )
		) {
			$preset_key  = self::DEFAULT_PRESET;
			$preset_meta = $allowed[ $preset_key ];
			$resolved    = self::resolve_default_preset( $preset_key );
		}

		$resolved['key']     = $preset_key;
		$resolved['label']   = $preset_meta['label'];
		$resolved['compare'] = ! empty( $preset_meta['compare'] ) && ! empty( $resolved['compare'] );
		$resolved['prev_start'] = ! empty( $resolved['prev_start'] ) ? date( 'Y-m-d', strtotime( $resolved['prev_start'] ) ) : null;
		$resolved['prev_end']   = ! empty( $resolved['prev_end'] ) ? date( 'Y-m-d', strtotime( $resolved['prev_end'] ) ) : null;

		return $resolved;
	}

	/**
	 * Resolve the built-in free preset.
	 *
	 * @param string $preset_key Preset key.
	 * @return array<string,mixed>|null
	 */
	private static function resolve_default_preset( $preset_key ) {
		if ( self::DEFAULT_PRESET !== $preset_key ) {
			return null;
		}

		$end   = self::now();
		$start = $end->modify( '-6 days' );

		return [
			'start'   => $start->format( 'Y-m-d' ),
			'end'     => $end->format( 'Y-m-d' ),
			'compare' => true,
		];
	}

	/**
	 * Get a signed trial origin payload.
	 *
	 * @param int $started_at Trial started timestamp.
	 * @return array<string,mixed>
	 */
	private static function build_signed_origin( $started_at ) {
		$started_at = (int) $started_at;

		return [
			'started_at' => $started_at,
			'site'       => home_url(),
			'signature'  => hash_hmac(
				'sha256',
				home_url() . '|' . $started_at . '|advajra_analytics_trial',
				wp_salt( 'auth' )
			),
		];
	}

	/**
	 * Validate a signed origin payload and return its timestamp.
	 *
	 * @param mixed $origin Origin payload.
	 * @return int
	 */
	private static function get_valid_origin_started_at( $origin ) {
		if ( ! is_array( $origin ) ) {
			return 0;
		}

		$started_at = (int) ( $origin['started_at'] ?? 0 );
		$signature  = (string) ( $origin['signature'] ?? '' );
		$site       = (string) ( $origin['site'] ?? '' );

		if ( $started_at <= 0 || empty( $signature ) || $site !== home_url() ) {
			return 0;
		}

		$expected = self::build_signed_origin( $started_at );
		if ( ! hash_equals( $expected['signature'], $signature ) ) {
			return 0;
		}

		return $started_at;
	}

	/**
	 * Re-index preset arrays by key.
	 *
	 * @param array<int,array<string,mixed>> $presets Presets.
	 * @return array<string,array<string,mixed>>
	 */
	private static function index_presets( $presets ) {
		$indexed = [];
		foreach ( $presets as $preset ) {
			$key = sanitize_key( $preset['key'] ?? '' );
			if ( empty( $key ) ) {
				continue;
			}
			$indexed[ $key ] = $preset;
		}

		return $indexed;
	}

	/**
	 * Get current time in site timezone.
	 *
	 * @return DateTimeImmutable
	 */
	private static function now() {
		return ( new DateTimeImmutable( '@' . current_time( 'timestamp' ) ) )->setTimezone( wp_timezone() );
	}
}
