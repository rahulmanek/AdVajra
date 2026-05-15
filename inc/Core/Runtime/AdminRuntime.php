<?php
/**
 * Admin runtime bootstrap.
 *
 * @package AdVajra\Core\Runtime
 */

namespace AdVajra\Core\Runtime;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AdminRuntime
 */
class AdminRuntime {

	/**
	 * Init admin runtime.
	 *
	 * @return void
	 */
	public function init() {
		if ( is_admin() ) {
			( new \AdVajra\Core\Admin() )->init();
			( new \AdVajra\Core\DeactivationSurvey() )->init();
		}
	}
}
