<?php
/**
 * Settings REST Controller.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Settings
 */
class Settings extends Controller {

	/**
	 * REST Resource base.
	 *
	 * @var string
	 */
	protected $rest_base = 'settings';

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_settings' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'update_settings' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);

		// GET /sync-status — returns next scheduled cron time + current interval.
		// Available to all users; UI uses it to display next run time.
		register_rest_route(
			$this->namespace,
			'/sync-status',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_sync_status' ],
				'permission_callback' => [ $this, 'permissions_check' ],
			]
		);

		// NOTE: POST /sync-now is a PRO-only endpoint registered in advajra-pro.
	}

	/**
	 * Get all settings.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function get_settings( $request ) {
		$settings = get_option( 'advajra_settings', [] );

		return rest_ensure_response( $settings );
	}

	/**
	 * Update settings.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function update_settings( $request ) {
		$data     = $request->get_json_params();
		$current  = get_option( 'advajra_settings', [] );
		$settings = [];

		$whitelist = [
			'active_preset'              => 'sanitize_text_field',
			'default_layout'             => 'sanitize_text_field',
			'default_target'             => 'sanitize_text_field',
			'default_nofollow'           => 'rest_sanitize_boolean',
			'default_sponsored'          => 'rest_sanitize_boolean',
			'default_tracking'           => 'sanitize_text_field',
			'analytics_enabled'          => 'rest_sanitize_boolean',
			'sync_interval'              => 'absint',
			'disable_all_ads'            => 'rest_sanitize_boolean',
			'disable_homepage'           => 'rest_sanitize_boolean',
			'disable_posts'              => 'rest_sanitize_boolean',
			'disable_pages'              => 'rest_sanitize_boolean',
			'disable_rss'                => 'rest_sanitize_boolean',
			'disable_404'                => 'rest_sanitize_boolean',
			'disable_search'             => 'rest_sanitize_boolean',
			'disable_archives'           => 'rest_sanitize_boolean',
			'hidden_roles'               => 'array',
			'blocked_ips'                => 'array',
			'hide_from_bots'             => 'rest_sanitize_boolean',
			'adblock_detection'          => 'rest_sanitize_boolean',
			'adblock_message'            => 'wp_kses_post',
			'gdpr_consent_mode'          => 'rest_sanitize_boolean',
			'privacy_safe_mode'          => 'rest_sanitize_boolean',
			'consent_cookie_name'        => 'sanitize_text_field',
			'consent_cookie_value'       => 'sanitize_text_field',
			'custom_code_header_enabled' => 'rest_sanitize_boolean',
			'custom_code_body_enabled'   => 'rest_sanitize_boolean',
			'custom_code_footer_enabled' => 'rest_sanitize_boolean',
			'custom_code_body'           => 'raw',
			'custom_code_footer'         => 'raw',
			'erase_data_on_uninstall'    => 'rest_sanitize_boolean',
		];

		$whitelist = apply_filters( 'advajra_save_settings_whitelist', $whitelist );

		foreach ( $whitelist as $key => $sanitize_callback ) {
			if ( isset( $data[ $key ] ) ) {
				$value = $data[ $key ];

				// Special handling for arrays or specific logic
				if ( 'array' === $sanitize_callback && is_array( $value ) ) {
					if ( 'hidden_roles' === $key ) {
						$valid_roles      = array_keys( wp_roles()->get_names() );
						$settings[ $key ] = array_values( array_intersect( $value, $valid_roles ) );
					} elseif ( 'blocked_ips' === $key ) {
						$settings[ $key ] = array_values(
							array_filter(
								$value,
								function ( $ip ) {
									return filter_var( $ip, FILTER_VALIDATE_IP );
								}
							)
						);
					} else {
						$settings[ $key ] = $value;
					}
					continue;
				}

				// Allow raw input (like custom code) but restrict to users with unfiltered_html
				if ( 'raw' === $sanitize_callback ) {
					if ( current_user_can( 'unfiltered_html' ) ) {
						$settings[ $key ] = $value;
					} else {
						$settings[ $key ] = wp_kses_post( $value );
					}
					continue;
				}

				if ( 'default_target' === $key ) {
					$settings[ $key ] = in_array( $value, [ '_blank', '_self' ], true ) ? $value : '_blank';
					continue;
				}

				if ( 'default_tracking' === $key ) {
					$settings[ $key ] = in_array( $value, [ 'both', 'impressions', 'clicks', 'disabled' ], true ) ? $value : 'both';
					continue;
				}

				if ( 'sync_interval' === $key ) {
					$interval         = absint( $value );
					$settings[ $key ] = in_array( $interval, [ 1, 5, 15, 30 ], true ) ? $interval : 5;
					continue;
				}

				if ( function_exists( $sanitize_callback ) ) {
					$settings[ $key ] = $sanitize_callback( $value );
				}
			}
		}

		// Handle Data Retention (Free Constraint logic preserved)
		$is_pro = defined( 'ADVAJRA_PRO_ACTIVE' ) && ADVAJRA_PRO_ACTIVE;
		if ( isset( $data['data_retention'] ) ) {
			if ( $is_pro ) {
				$settings['data_retention'] = absint( $data['data_retention'] );
			} else {
				$settings['data_retention'] = 7;
			}
		}

		// Merge and save.
		$merged = wp_parse_args( $settings, $current );
		update_option( 'advajra_settings', $merged );

		if ( ! empty( $settings ) ) {
			\AdVajra\Utils\AuditLog::log(
				'settings_updated',
				'settings',
				null,
				__( 'Updated platform settings', 'advajra' ),
				[
					'changed_keys' => array_keys( $settings ),
				]
			);
		}

		$old_interval = isset( $current['sync_interval'] ) ? absint( $current['sync_interval'] ) : 5;
		$new_interval = isset( $merged['sync_interval'] ) ? absint( $merged['sync_interval'] ) : 5;

		if ( $old_interval !== $new_interval ) {
			wp_clear_scheduled_hook( 'advajra_sync_tracking' );
			$schedule_name = "advajra_every_{$new_interval}min";
			wp_schedule_event( time(), $schedule_name, 'advajra_sync_tracking' );
		}

		return rest_ensure_response( $merged );
	}

	/**
	 * Get sync status: next scheduled cron time and current interval.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_sync_status() {
		$settings = get_option( 'advajra_settings', [] );
		$interval = isset( $settings['sync_interval'] ) ? absint( $settings['sync_interval'] ) : 5;
		$next_run = wp_next_scheduled( 'advajra_sync_tracking' );

		// Format next run in site's local timezone.
		$next_run_formatted = null;
		if ( $next_run ) {
			$next_run_formatted = wp_date( 'g:i A', $next_run );
		}

		return rest_ensure_response(
			[
				'next_run'           => $next_run ? (int) $next_run : null,
				'next_run_formatted' => $next_run_formatted,
				'interval'           => $interval,
			]
		);
	}

}
