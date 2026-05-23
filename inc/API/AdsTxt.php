<?php
/**
 * Ads.txt REST Controller.
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
	 * Try to get a WP_Filesystem instance using the "direct" method only.
	 *
	 * @return \WP_Filesystem_Base|null  Filesystem instance, or null if unavailable.
	 */
	private function get_filesystem() {
		require_once ABSPATH . 'wp-admin/includes/file.php';

		global $wp_filesystem;

		$root   = get_home_path();
		$method = get_filesystem_method( [], $root );

		// Only "direct" is safe in a REST context. FTP/SSH methods require an interactive HTML form.
		if ( 'direct' !== $method ) {
			return null;
		}

		if ( ! $wp_filesystem ) {
			if ( ! \WP_Filesystem( [], $root ) ) {
				return null;
			}
		}

		return $wp_filesystem;
	}

	/**
	 * Read the contents of a file.
	 *
	 * Tries WP_Filesystem first, falls back to native PHP.
	 *
	 * @param string                   $path Absolute file path.
	 * @param \WP_Filesystem_Base|null $fs   Filesystem instance or null.
	 * @return string|false File contents or false on failure.
	 */
	private function read_file( string $path, $fs ) {
		if ( $fs ) {
			$contents = $fs->get_contents( $path );
			if ( false !== $contents ) {
				return $contents;
			}
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$contents = file_get_contents( $path );
		return ( false !== $contents ) ? $contents : false;
	}

	/**
	 * Write content to a file.
	 *
	 * @param string                   $path    Absolute file path.
	 * @param string                   $content Content to write.
	 * @param \WP_Filesystem_Base|null $fs      Filesystem instance or null.
	 * @return bool True on success, false on failure.
	 */
	private function write_file( string $path, string $content, $fs ): bool {
		if ( $fs ) {
			$result = $fs->put_contents( $path, $content, FS_CHMOD_FILE );
			if ( false !== $result ) {
				return true;
			}
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		$bytes = file_put_contents( $path, $content );
		return ( false !== $bytes );
	}

	/**
	 * Check whether the given path (file or directory) is writable.
	 *
	 * @param string                   $path Absolute path.
	 * @param \WP_Filesystem_Base|null $fs   Filesystem instance or null.
	 * @return bool
	 */
	private function path_is_writable( string $path, $fs ): bool {
		if ( $fs ) {
			return $fs->is_writable( $path );
		}

		return is_writable( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_is_writable
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
		$root_path = trailingslashit( get_home_path() );

		$exists  = $fs ? $fs->exists( $file_path ) : file_exists( $file_path );
		$content = '';

		// Writable check: root dir (for creating a new file) or the file itself.
		if ( $exists ) {
			$writable = $this->path_is_writable( $file_path, $fs );
		} else {
			$writable = $this->path_is_writable( $root_path, $fs );
		}

		if ( $exists ) {
			$file_content = $this->read_file( $file_path, $fs );
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
		$root_path = trailingslashit( get_home_path() );

		$exists   = $fs ? $fs->exists( $file_path ) : file_exists( $file_path );
		$writable = $exists
			? $this->path_is_writable( $file_path, $fs )
			: $this->path_is_writable( $root_path, $fs );

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

		$result = $this->write_file( $file_path, $sanitized_content, $fs );

		if ( ! $result ) {
			return new \WP_Error(
				'advajra_write_error',
				__( 'Failed to write ads.txt. Check that the web server has write access to the site root.', 'advajra' ),
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
