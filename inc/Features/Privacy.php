<?php
/**
 * Privacy Feature.
 *
 * @package AdVajra\Features
 */

namespace AdVajra\Features;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Privacy
 */
class Privacy {

	/**
	 * Settings cache.
	 *
	 * @var array|null
	 */
	private static $settings = null;

	/**
	 * Initialize.
	 */
	public static function init() {
		add_filter( 'advajra_should_track', [ __CLASS__, 'check_consent' ], 10, 2 );
		add_filter( 'advajra_tracking_config', [ __CLASS__, 'add_consent_config' ] );
		add_action( 'wp_footer', [ __CLASS__, 'inject_consent_listener' ], 5 );
		add_filter( 'advajra_tracking_data', [ __CLASS__, 'filter_tracking_data' ], 10, 2 );
		add_action( 'rest_api_init', [ __CLASS__, 'register_rest_routes' ] );
	}

	/**
	 * Get settings (cached).
	 *
	 * @return array
	 */
	private static function get_settings() {
		if ( null === self::$settings ) {
			self::$settings = get_option( 'advajra_settings', [] );
		}
		return self::$settings;
	}

	/**
	 * Check if a feature is enabled.
	 *
	 * @param string $key Setting key.
	 * @return bool
	 */
	protected static function is_enabled( $key ) {
		$settings = self::get_settings();
		return ! empty( $settings[ $key ] );
	}

	/**
	 * Check if tracking consent is given.
	 * Can be overridden by PRO for auto-detection.
	 *
	 * @param bool $should_track Current tracking status.
	 * @param int  $ad_id        Ad ID.
	 * @return bool
	 */
	public static function check_consent( $should_track, $ad_id ) {
		if ( ! self::is_enabled( 'gdpr_consent_mode' ) ) {
			return $should_track;
		}

		if ( self::is_enabled( 'privacy_safe_mode' ) ) {
			return false;
		}

		$settings     = self::get_settings();
		$cookie_name  = isset( $settings['consent_cookie_name'] ) ? $settings['consent_cookie_name'] : '';
		$cookie_value = isset( $settings['consent_cookie_value'] ) ? $settings['consent_cookie_value'] : '';

		if ( empty( $cookie_name ) ) {
			return $should_track;
		}

		if ( isset( $_COOKIE[ $cookie_name ] ) ) {
			$actual_value = sanitize_text_field( wp_unslash( $_COOKIE[ $cookie_name ] ) );

			if ( ! empty( $cookie_value ) ) {
				return strpos( $actual_value, $cookie_value ) !== false;
			}
			return true;
		}

		return false;
	}

	/**
	 * Add consent configuration to frontend.
	 *
	 * @param array $config Tracking configuration.
	 * @return array
	 */
	public static function add_consent_config( $config ) {
		$settings = self::get_settings();

		if ( self::is_enabled( 'gdpr_consent_mode' ) ) {
			$config['require_consent'] = true;
			$config['consent_method']  = 'tcf2';

			if ( ! empty( $settings['consent_cookie_name'] ) ) {
				$config['consent_cookie_name']  = $settings['consent_cookie_name'];
				$config['consent_cookie_value'] = isset( $settings['consent_cookie_value'] ) ? $settings['consent_cookie_value'] : '';
			}
		}

		if ( self::is_enabled( 'privacy_safe_mode' ) ) {
			$config['privacy_safe'] = true;
			$config['no_cookies']   = true;
		}

		return apply_filters( 'advajra_privacy_config', $config );
	}

	/**
	 * Filter tracking data for privacy compliance.
	 *
	 * @param array $data  Tracking data.
	 * @param int   $ad_id Ad ID.
	 * @return array
	 */
	public static function filter_tracking_data( $data, $ad_id ) {
		if ( self::is_enabled( 'privacy_safe_mode' ) ) {
			return [
				'ad_id' => $ad_id,
				'type'  => isset( $data['type'] ) ? $data['type'] : 'impression',
				'date'  => current_time( 'Y-m-d' ),
			];
		}

		return $data;
	}

	/**
	 * Inject TCF 2.0 consent listener.
	 * This is the FREE version - basic TCF 2.0 support.
	 */
	public static function inject_consent_listener() {
		if ( ! self::is_enabled( 'gdpr_consent_mode' ) ) {
			return;
		}

		$settings     = self::get_settings();
		$cookie_name  = isset( $settings['consent_cookie_name'] ) ? (string) $settings['consent_cookie_name'] : '';
		$cookie_value = isset( $settings['consent_cookie_value'] ) ? (string) $settings['consent_cookie_value'] : '';
		$cookie_regex = ! empty( $cookie_name ) ? preg_quote( $cookie_name, '/' ) : '';
		?>
		<script id="advajra-consent-listener">
		(function() {
			'use strict';

			var cookieName = <?php echo wp_json_encode( $cookie_name ); ?>;
			var cookieValue = <?php echo wp_json_encode( $cookie_value ); ?>;
			var cookieRegex = <?php echo wp_json_encode( $cookie_regex ); ?>;

			window.advajraConsent = {
				hasConsent: false,
				pending: [],

				init: function() {
					var self = this;

					if (self.checkExistingConsent()) {
						self.hasConsent = true;
						return;
					}

					if (window.__tcfapi) {
						window.__tcfapi('addEventListener', 2, function(tcData, success) {
							if (success && (tcData.eventStatus === 'useractioncomplete' || tcData.eventStatus === 'tcloaded')) {
								if (tcData.purpose && tcData.purpose.consents) {
									if (tcData.purpose.consents[1] || tcData.purpose.consents[3]) {
										self.grantConsent();
									}
								}
							}
						});
					}

					<?php if ( ! empty( $cookie_name ) ) : ?>
					self.watchCookie(cookieName, cookieValue);
					<?php endif; ?>
				},

				checkExistingConsent: function() {
					<?php if ( ! empty( $cookie_name ) ) : ?>
					var cookie = document.cookie.match(new RegExp(cookieRegex + '=([^;]+)'));
					if (cookie) {
						<?php if ( ! empty( $cookie_value ) ) : ?>
						return cookie[1].indexOf(cookieValue) !== -1;
						<?php else : ?>
						return true;
						<?php endif; ?>
					}
					<?php endif; ?>
					return false;
				},

				watchCookie: function(name, value) {
					var self = this;
					var check = function() {
						var cookie = document.cookie.match(new RegExp(name + '=([^;]+)'));
						if (cookie) {
							if (!value || cookie[1].indexOf(value) !== -1) {
								self.grantConsent();
								return true;
							}
						}
						return false;
					};

					var interval = setInterval(function() {
						if (check() || self.hasConsent) {
							clearInterval(interval);
						}
					}, 500);

					setTimeout(function() { clearInterval(interval); }, 30000);
				},

				grantConsent: function() {
					if (this.hasConsent) return;
					this.hasConsent = true;

					if (this.pending.length && window.advajraTrack) {
						this.pending.forEach(function(event) {
							window.advajraTrack(event.adId, event.type);
						});
						this.pending = [];
					}

					document.dispatchEvent(new CustomEvent('advajra_consent_granted'));
				},

				queue: function(adId, type) {
					this.pending.push({ adId: adId, type: type });
				},

				check: function() {
					return this.hasConsent;
				}
			};

			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', function() {
					window.advajraConsent.init();
				});
			} else {
				window.advajraConsent.init();
			}
		})();
		</script>
		<?php
	}

	/**
	 * Register REST routes.
	 */
	public static function register_rest_routes() {
		register_rest_route(
			'advajra/v1',
			'/privacy-status',
			[
				'methods'             => 'GET',
				'callback'            => [ __CLASS__, 'get_privacy_status' ],
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			]
		);
	}

	/**
	 * Get privacy status for admin UI.
	 *
	 * @return \WP_REST_Response
	 */
	public static function get_privacy_status() {
		$settings = self::get_settings();

		$response = [
			'consent_mode_enabled' => self::is_enabled( 'gdpr_consent_mode' ),
			'privacy_safe_enabled' => self::is_enabled( 'privacy_safe_mode' ),
			'manual_config'        => [
				'cookie_name'  => isset( $settings['consent_cookie_name'] ) ? $settings['consent_cookie_name'] : '',
				'cookie_value' => isset( $settings['consent_cookie_value'] ) ? $settings['consent_cookie_value'] : '',
			],
			'detected_cmp'         => null,
			'is_pro'               => false,
		];

		$response = apply_filters( 'advajra_privacy_status', $response );

		return rest_ensure_response( $response );
	}
}
