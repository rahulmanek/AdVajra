<?php
/**
 * Ads.txt REST Controller.
 *
 * Handles direct file system Read/Write operations for the ads.txt file at the site root.
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
		if ( ! function_exists( 'get_home_path' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}

		return trailingslashit( get_home_path() ) . 'ads.txt';
	}

	/**
	 * Get a filesystem instance.
	 *
	 * @return \WP_Filesystem_Base|null
	 */
	private function get_filesystem() {
		require_once ABSPATH . 'wp-admin/includes/file.php';

		global $wp_filesystem;

		if ( ! $wp_filesystem && ! \WP_Filesystem() ) {
			return null;
		}

		return $wp_filesystem;
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
		$fs        = $this->get_filesystem();
		$exists    = $fs ? $fs->exists( $file_path ) : file_exists( $file_path );
		$content   = '';
		$root_path = trailingslashit( get_home_path() );
		$writable  = $fs ? $fs->is_writable( $root_path ) || ( $exists && $fs->is_writable( $file_path ) ) : false;

		if ( $exists ) {
			$file_content = $fs ? $fs->get_contents( $file_path ) : false;
			if ( false !== $file_content ) {
				$content = $file_content;
			}
		}

		return rest_ensure_response(
			[
				'exists'   => $exists,
				'content'  => $content,
				'writable' => $writable,
				'path'     => $file_path,
			]
		);
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
		$fs        = $this->get_filesystem();

		if ( ! $fs ) {
			return new \WP_Error(
				'advajra_fs_unavailable',
				__( 'WordPress filesystem could not be initialized.', 'advajra' ),
				[ 'status' => 500 ]
			);
		}

		$exists   = $fs->exists( $file_path );
		$writable = $exists ? $fs->is_writable( $file_path ) : $fs->is_writable( trailingslashit( get_home_path() ) );

		if ( ! $writable ) {
			return new \WP_Error(
				'advajra_fs_error',
				__( 'The root directory or ads.txt file is not writable. Please check server permissions.', 'advajra' ),
				[
					'status' => 403,
					'path'   => $file_path,
				]
			);
		}

		$result = $fs->put_contents( $file_path, $sanitized_content, FS_CHMOD_FILE );

		if ( false === $result ) {
			return new \WP_Error(
				'advajra_write_error',
				__( 'Failed to write to ads.txt.', 'advajra' ),
				[
					'status' => 500,
					'path'   => $file_path,
				]
			);
		}

		return rest_ensure_response(
			[
				'success' => true,
				'message' => __( 'File saved successfully.', 'advajra' ),
				'content' => $sanitized_content,
			]
		);
	}
}
