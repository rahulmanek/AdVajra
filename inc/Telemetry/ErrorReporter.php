<?php
/**
 * Error Reporter.
 *
 * Sends a silent email to support@advajra.com when a critical error
 * is detected on a user's site. Throttled to one email per error type
 * per site per 24 hours to prevent inbox flooding.
 *
 * This class is intentionally lean — no external HTTP calls, no
 * database tables, no scheduled tasks. It piggybacks on WordPress
 * core's wp_mail() and transient API.
 *
 * @package AdVajra\Telemetry
 */

namespace AdVajra\Telemetry;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ErrorReporter
 */
class ErrorReporter {

	/**
	 * Email address that receives all error reports.
	 *
	 * @var string
	 */
	private const RECIPIENT = 'support@advajra.com';

	/**
	 * Throttle: only one email per error type per site per N seconds.
	 *
	 * @var int
	 */
	private const THROTTLE_TTL = DAY_IN_SECONDS;

	/**
	 * Report an error if telemetry is enabled and throttle hasn't fired yet.
	 *
	 * @param string $error_type    Machine-readable error type (e.g. 'REST_API_ERROR').
	 * @param string $error_message Human-readable message from the client.
	 * @param string $context       Where in the plugin the error occurred.
	 * @return bool Whether the email was sent.
	 */
	public static function report( string $error_type, string $error_message, string $context = '' ): bool {
		// Respect the opt-out toggle in Advanced Settings.
		$settings = get_option( 'advajra_settings', [] );
		if ( isset( $settings['telemetry_enabled'] ) && false === (bool) $settings['telemetry_enabled'] ) {
			return false;
		}

		// Throttle: one email per error_type per site per 24h.
		$throttle_key = 'advajra_telemetry_' . hash( 'sha256', $error_type . home_url() );
		if ( get_transient( $throttle_key ) ) {
			return false;
		}

		set_transient( $throttle_key, 1, self::THROTTLE_TTL );

		$site_name = get_bloginfo( 'name' );
		$site_url  = home_url();

		/**
		 * Subject format: "[AdVajra] {Site Name} — {Error Type}"
		 *
		 * Using the site name in the subject means your email client
		 * threads all emails from the same site into one conversation.
		 */
		$subject = sprintf(
			'[AdVajra] %s — %s',
			$site_name ?: $site_url,
			$error_type
		);

		$body    = self::build_email_body( $error_type, $error_message, $context, $site_name, $site_url );
		$headers = [ 'Content-Type: text/plain; charset=UTF-8' ];

		return (bool) wp_mail( self::RECIPIENT, $subject, $body, $headers );
	}

	/**
	 * Build the plain text email body.
	 *
	 * @param string $error_type    Machine-readable error type.
	 * @param string $error_message Human-readable error message.
	 * @param string $context       Context where the error occurred.
	 * @param string $site_name     The site's blogname.
	 * @param string $site_url      The site's home URL.
	 * @return string Plain text email body.
	 */
	private static function build_email_body(
		string $error_type,
		string $error_message,
		string $context,
		string $site_name,
		string $site_url
	): string {
		$wp_version     = get_bloginfo( 'version' );
		$php_version    = PHP_VERSION;
		$plugin_version = ADVAJRA_VERSION;
		$context_str    = $context ?: 'Not specified';

		return "AdVajra Telemetry Error Report
===============================
Site Name : {$site_name}
Site URL  : {$site_url}
WordPress : {$wp_version}
PHP       : {$php_version}
AdVajra   : v{$plugin_version}

ERROR CLASSIFICATION:
--------------------
Type      : {$error_type}
Context   : {$context_str}

ERROR DETAILS:
-------------
{$error_message}
";
	}
}
