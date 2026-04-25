<?php
/**
 * Frontend runtime bootstrap.
 *
 * @package AdVajra\Core\Runtime
 */

namespace AdVajra\Core\Runtime;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class FrontendRuntime
 */
class FrontendRuntime {

	/**
	 * Init frontend runtime.
	 *
	 * Skips admin pages and cron to avoid loading display/tracking
	 * code where it will never render. AJAX requests are allowed
	 * because block previews use admin-ajax.
	 *
	 * @return void
	 */
	public function init() {
		if ( ( is_admin() && ! wp_doing_ajax() ) || wp_doing_cron() ) {
			return;
		}

		( new \AdVajra\Display\Shortcode() )->init();
		( new \AdVajra\Display\Block() )->init();
		( new \AdVajra\Display\Scripts() )->init();
		\AdVajra\Core\Placements\Injector::get_instance()->init();
	}
}
