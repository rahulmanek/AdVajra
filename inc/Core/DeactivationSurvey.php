<?php
/**
 * Deactivation Survey — intercepts the Deactivate link on plugins.php,
 * shows a premium modal, emails feedback to support@advajra.com.
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class DeactivationSurvey
 */
class DeactivationSurvey {

	/**
	 * Init hooks.
	 */
	public function init(): void {
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue' ] );
		add_action( 'wp_ajax_advajra_deactivation_feedback', [ $this, 'handle_feedback' ] );
	}

	/**
	 * Enqueue modal assets only on plugins.php.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue( string $hook ): void {
		if ( ! in_array( $hook, [ 'plugins.php', 'plugins-network.php' ], true ) ) {
			return;
		}

		wp_enqueue_style(
			'advajra-deactivation-survey',
			ADVAJRA_URL . 'assets/css/deactivation-survey.css',
			[],
			ADVAJRA_VERSION
		);

		wp_enqueue_script(
			'advajra-deactivation-survey',
			ADVAJRA_URL . 'assets/js/deactivation-survey.js',
			[],
			ADVAJRA_VERSION,
			true
		);

		$current_user = wp_get_current_user();

		wp_localize_script(
			'advajra-deactivation-survey',
			'advajraDeactivation',
			[
				'pluginFile'  => 'advajra/advajra.php',
				'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
				'nonce'       => wp_create_nonce( 'advajra_deactivation_feedback' ),
				'userEmail'   => $current_user->user_email ?? '',
				'siteUrl'     => home_url(),
				'supportUrl'  => 'https://advajra.com/support?utm_source=advajra-plugin&utm_medium=deactivation-survey&utm_campaign=support',
				'featureUrl'  => 'https://advajra.com/feature-request?utm_source=advajra-plugin&utm_medium=deactivation-survey&utm_campaign=feature-request',
				'logoUrl'     => ADVAJRA_URL . 'assets/images/logo.png',
			]
		);
	}

	/**
	 * Handle AJAX feedback submission, send email, then pass back the deactivation URL.
	 */
	public function handle_feedback(): void {
		check_ajax_referer( 'advajra_deactivation_feedback', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Unauthorized', 403 );
		}

		$reason      = sanitize_text_field( wp_unslash( $_POST['reason'] ?? '' ) );
		$detail      = sanitize_textarea_field( wp_unslash( $_POST['detail'] ?? '' ) );
		$email       = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
		$site_url    = home_url();
		$wp_version  = get_bloginfo( 'version' );
		$plugin_ver  = ADVAJRA_VERSION;

		// Reason labels for the email body.
		$reason_labels = [
			'bug'            => '🐛 Found a bug / Something is broken',
			'missing_feature'=> '🔧 Missing a feature I need',
			'conflict'       => '🧩 Plugin conflict / Compatibility issue',
			'too_complex'    => '🤷 Too complex or hard to set up',
			'no_revenue'     => '📉 Not seeing ad revenue improvement',
			'too_expensive'  => '💰 Too expensive / Switching to free alternative',
			'switching'      => '🔄 Switching to a different plugin',
			'temporary'      => '⏸️ Temporarily deactivating',
			'no_longer_ads'  => '🚫 No longer running ads on this site',
			'other'          => '💬 Other reason',
		];

		$reason_label = $reason_labels[ $reason ] ?? $reason;

		// Build a clean, formatted HTML email body.
		$body = $this->build_email_html( $reason_label, $detail, $email, $site_url, $wp_version, $plugin_ver );

		$headers = [
			'Content-Type: text/html; charset=UTF-8',
		];

		// Set reply-to as user's email if we have it, so you can reply directly.
		if ( $email && is_email( $email ) ) {
			$current_user = wp_get_current_user();
			$name         = $current_user->display_name ?? '';
			$headers[]    = 'Reply-To: ' . ( $name ? "$name <$email>" : $email );
		}

		wp_mail(
			'support@advajra.com',
			'[AdVajra Uninstall] ' . $reason_label . ' — ' . $site_url,
			$body,
			$headers
		);

		wp_send_json_success( [ 'sent' => true ] );
	}

	/**
	 * Build the HTML email body.
	 *
	 * @param string $reason_label Human-readable reason.
	 * @param string $detail       Optional user message.
	 * @param string $email        User email.
	 * @param string $site_url     Site URL.
	 * @param string $wp_version   WordPress version.
	 * @param string $plugin_ver   AdVajra version.
	 * @return string
	 */
	private function build_email_html(
		string $reason_label,
		string $detail,
		string $email,
		string $site_url,
		string $wp_version,
		string $plugin_ver
	): string {
		$detail_html = $detail
			? '<p style="margin:0 0 8px;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">' . esc_html( $detail ) . '</p>'
			: '<p style="margin:0;color:#9ca3af;font-size:13px;font-style:italic;">No additional message provided.</p>';

		return '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f1c2e;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f1c2e 0%,#1f2e44 100%);padding:28px 32px;border-bottom:1px solid rgba(237,175,3,0.3);">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#edaf03;font-weight:700;">AdVajra Plugin</p>
            <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:800;line-height:1.2;">A user just left 👋</h1>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">' . esc_html( $site_url ) . '</p>
          </td>
        </tr>
        <!-- Reason -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#edaf03;font-weight:700;">Reason</p>
            <div style="background:rgba(237,175,3,0.1);border:1px solid rgba(237,175,3,0.35);border-radius:10px;padding:14px 16px;">
              <p style="margin:0;font-size:16px;color:#ffffff;font-weight:700;">' . esc_html( $reason_label ) . '</p>
            </div>
          </td>
        </tr>
        <!-- Message -->
        <tr>
          <td style="padding:20px 32px 0;">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.5);font-weight:700;">Their Message</p>
            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px 16px;">
              ' . $detail_html . '
            </div>
          </td>
        </tr>
        <!-- Meta -->
        <tr>
          <td style="padding:20px 32px 28px;">
            <p style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.5);font-weight:700;">Site Info</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:5px 0;font-size:13px;color:rgba(255,255,255,0.5);">Email</td>
                <td style="padding:5px 0;font-size:13px;color:#ffffff;text-align:right;">' . esc_html( $email ?: '—' ) . '</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:13px;color:rgba(255,255,255,0.5);">WordPress</td>
                <td style="padding:5px 0;font-size:13px;color:#ffffff;text-align:right;">' . esc_html( $wp_version ) . '</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:13px;color:rgba(255,255,255,0.5);">AdVajra Version</td>
                <td style="padding:5px 0;font-size:13px;color:#ffffff;text-align:right;">' . esc_html( $plugin_ver ) . '</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>';
	}
}
