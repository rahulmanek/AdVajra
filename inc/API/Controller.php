<?php
/**
 * Base REST Controller.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Controller
 */
abstract class Controller extends \WP_REST_Controller {

	/**
	 * Namespace.
	 *
	 * @var string
	 */
	protected $namespace = 'advajra/v1';

	/**
	 * Permissions check.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return bool
	 */
	public function permissions_check( $request ) {
		return current_user_can( 'manage_options' );
	}
}
