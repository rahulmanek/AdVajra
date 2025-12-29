<?php
/**
 * Ads.txt REST Controller.
 *
 * Handles direct file system Read/Write operations for the ads.txt file at ABSPATH.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AdsTxt
 */
class AdsTxt extends Controller {

	/**
	 * REST Resource base.
	 *
	 * @var string
	 */
	protected $rest_base = 'ads-txt';

	/**
	 * Get the absolute path to the ads.txt file.
	 *
	 * @return string
	 */
	private function get_file_path(): string {
		return ABSPATH . 'ads.txt';
	}

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'update_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);
	}

	/**
	 * Get ads.txt content.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_item( $request ) {
		$file_path = $this->get_file_path();
		$exists    = file_exists( $file_path );
		$content   = '';
		$writable  = is_writable( ABSPATH ) || ( $exists && is_writable( $file_path ) );

		if ( $exists ) {
			$file_content = file_get_contents( $file_path );
			if ( false !== $file_content ) {
				$content = $file_content;
			}
		}

		return rest_ensure_response( [
			'exists'   => $exists,
			'content'  => $content,
			'writable' => $writable,
			'path'     => $file_path,
		] );
	}

	/**
	 * Update or create ads.txt.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( $request ) {
		$content = $request->get_param( 'content' );

		$sanitized_content = wp_strip_all_tags( $content );
		$sanitized_content = preg_replace( '/<\?php|<script/i', '', $sanitized_content );

		$file_path = $this->get_file_path();
		$writable  = true;
		if ( file_exists( $file_path ) ) {
			if ( ! is_writable( $file_path ) ) {
				$writable = false;
			}
		} else {
			if ( ! is_writable( ABSPATH ) ) {
				$writable = false;
			}
		}

		if ( ! $writable ) {
			return new \WP_Error(
				'advajra_fs_error',
				__( 'The root directory or ads.txt file is not writable. Please check server permissions.', 'advajra' ),
				[ 'status' => 403, 'path' => $file_path ]
			);
		}

		$result = file_put_contents( $file_path, $sanitized_content );

		if ( false === $result ) {
			return new \WP_Error(
				'advajra_write_error',
				__( 'Failed to write to ads.txt.', 'advajra' ),
				[ 'status' => 500, 'path' => $file_path ]
			);
		}

		return rest_ensure_response( [
			'success' => true,
			'message' => __( 'File saved successfully.', 'advajra' ),
			'content' => $sanitized_content,
		] );
	}
}
