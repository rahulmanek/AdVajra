<?php
/**
 * Cron runtime bootstrap.
 *
 * @package AdVajra\Core\Runtime
 */

namespace AdVajra\Core\Runtime;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class CronRuntime
 */
class CronRuntime {

	/**
	 * Init cron runtime.
	 *
	 * @return void
	 */
	public function init() {
		( new \AdVajra\Core\Cron() )->init();
	}
}
