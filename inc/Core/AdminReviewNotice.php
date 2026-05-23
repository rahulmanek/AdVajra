<?php
/**
 * Review notice eligibility and dismissal service.
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AdminReviewNotice
 */
class AdminReviewNotice {

	/**
	 * Install timestamp option key.
	 */
	private const OPTION_INSTALLED_AT = 'advajra_installed_at';

	/**
	 * Dismissal user meta key.
	 */
	private const USER_META_DISMISSED = 'advajra_review_notice_dismissed';

	/**
	 * Reviews URL.
	 */
	private const REVIEW_URL = 'https://wordpress.org/support/plugin/advajra/reviews/#new-post';

	/**
	 * Cache group for eligibility checks.
	 */
	private const CACHE_GROUP = 'advajra_review_notice';

	/**
	 * Cache lifetime in seconds.
	 */
	private const CACHE_TTL = 300;

	/**
	 * Minimum active age before showing notice.
	 */
	private const MIN_INSTALL_AGE = WEEK_IN_SECONDS;

	/**
	 * Public payload used by React app.
	 *
	 * @return array<string,mixed>
	 */
	public function get_payload(): array {
		return [
			'eligible'   => $this->is_eligible_for_current_user(),
			'message'    => __( 'Enjoying AdVajra? A quick review helps us improve and build faster for the WordPress community.', 'advajra' ),
			'review_url' => self::REVIEW_URL,
		];
	}

	/**
	 * Persist dismissal for current user.
	 *
	 * @return bool
	 */
	public function dismiss_for_current_user(): bool {
		$user_id = get_current_user_id();
		if ( $user_id <= 0 ) {
			return false;
		}

		return (bool) update_user_meta( $user_id, self::USER_META_DISMISSED, 1 );
	}

	/**
	 * Determine whether notice should be shown for current user.
	 *
	 * @return bool
	 */
	public function is_eligible_for_current_user(): bool {
		if ( ! current_user_can( 'manage_options' ) ) {
			return false;
		}

		$installed_at = (int) get_option( self::OPTION_INSTALLED_AT, 0 );
		if ( $installed_at <= 0 ) {
			return false;
		}

		if ( ( time() - $installed_at ) < self::MIN_INSTALL_AGE ) {
			return false;
		}

		$user_id = get_current_user_id();
		if ( $user_id <= 0 ) {
			return false;
		}

		if ( get_user_meta( $user_id, self::USER_META_DISMISSED, true ) ) {
			return false;
		}

		if ( ! $this->has_active_ad() ) {
			return false;
		}

		return true;
	}

	/**
	 * Check if a published ad exists.
	 *
	 * @return bool
	 */
	private function has_active_ad(): bool {
		$cache_key = 'has_active_ad';
		$cached    = wp_cache_get( $cache_key, self::CACHE_GROUP );

		if ( false !== $cached ) {
			return (bool) $cached;
		}

		$ads = \AdVajra\Model\Ad::get_all(
			[
				'post_status'            => 'publish',
				'posts_per_page'         => 1,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'cache_results'          => false,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			]
		);

		$exists = ! empty( $ads );
		wp_cache_set( $cache_key, $exists ? 1 : 0, self::CACHE_GROUP, self::CACHE_TTL );

		return $exists;
	}

}
