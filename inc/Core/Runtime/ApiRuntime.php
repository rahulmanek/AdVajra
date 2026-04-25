<?php
/**
 * API runtime bootstrap.
 *
 * @package AdVajra\Core\Runtime
 */

namespace AdVajra\Core\Runtime;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ApiRuntime
 */
class ApiRuntime {

	/**
	 * Init REST routes.
	 *
	 * @return void
	 */
	public function init() {
		add_action(
			'rest_api_init',
			function () {
				( new \AdVajra\API\Ads() )->register_routes();
				( new \AdVajra\API\Placements() )->register_routes();
				( new \AdVajra\API\Settings() )->register_routes();
				( new \AdVajra\API\Targeting() )->register_routes();
				( new \AdVajra\API\Analytics() )->register_routes();
				( new \AdVajra\API\Modules() )->register_routes();
				( new \AdVajra\API\AdsTxt() )->register_routes();
			}
		);
	}
}
