<?php
/**
 * Review notice REST controller.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ReviewNotice
 */
class ReviewNotice extends Controller {

	/**
	 * REST resource base.
	 *
	 * @var string
	 */
	protected $rest_base = 'review-notice';

	/**
	 * Register routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_state' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/dismiss',
			[
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'dismiss' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);
	}

	/**
	 * Get review notice state payload.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_state() {
		$service = new \AdVajra\Core\AdminReviewNotice();
		return rest_ensure_response( $service->get_payload() );
	}

	/**
	 * Persist dismissal for current user.
	 *
	 * @return \WP_REST_Response
	 */
	public function dismiss() {
		$service = new \AdVajra\Core\AdminReviewNotice();
		$saved   = $service->dismiss_for_current_user();

		if ( ! $saved ) {
			return new \WP_Error( 'dismiss_failed', __( 'Unable to save dismissal state.', 'advajra' ), [ 'status' => 500 ] );
		}

		return rest_ensure_response( [ 'dismissed' => true ] );
	}
}
