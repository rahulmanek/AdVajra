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
	 * Get the absolute path to the root domain's directory, even if installed in a subdirectory.
	 *
	 * @return string
	 */
	private function get_root_domain_path(): string {
		if ( ! function_exists( 'get_home_path' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}

		$wp_path        = get_home_path();
		$home_url_path  = wp_parse_url( home_url(), PHP_URL_PATH );
		$home_url_path  = trim( $home_url_path, '/' );

		if ( empty( $home_url_path ) ) {
			return trailingslashit( $wp_path );
		}

		$segments = explode( '/', $home_url_path );
		$depth    = count( $segments );

		$target_dir = $wp_path;
		for ( $i = 0; $i < $depth; $i++ ) {
			$target_dir = dirname( $target_dir );
		}

		return trailingslashit( $target_dir );
	}

	/**
	 * Get the absolute path to the ads.txt file.
	 * Checks if root domain is writable or already has an ads.txt, escalating past subdirectory.
	 *
	 * @return string
	 */
	private function get_file_path(): string {
		if ( ! function_exists( 'get_home_path' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}

		$root_path = $this->get_root_domain_path();
		$root_file = $root_path . 'ads.txt';
		$wp_path   = trailingslashit( get_home_path() );
		$wp_file   = $wp_path . 'ads.txt';

		if ( $root_path === $wp_path ) {
			return $wp_file;
		}

		$fs = $this->get_filesystem();

		// Case 1: An ads.txt already exists at the root domain and is writable.
		$root_exists = $fs ? $fs->exists( $root_file ) : file_exists( $root_file );
		if ( $root_exists ) {
			$root_writable = $fs ? $fs->is_writable( $root_file ) : is_writable( $root_file );
			if ( $root_writable ) {
				return $root_file;
			}
		}

		// Case 2: Root domain directory itself is writable, so we can write directly there.
		$root_dir_writable = $fs ? $fs->is_writable( $root_path ) : is_writable( $root_path );
		if ( $root_dir_writable ) {
			return $root_file;
		}

		// Fallback Case 3: Root is not writable, write locally to the WordPress subdirectory.
		return $wp_file;
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

		$root_path       = $this->get_root_domain_path();
		$wp_path         = trailingslashit( get_home_path() );
		$parsed_url      = wp_parse_url( home_url() );
		$is_subdirectory = ! empty( $parsed_url['path'] ) && '/' !== $parsed_url['path'];
		$root_domain_url = '';
		if ( ! empty( $parsed_url['scheme'] ) && ! empty( $parsed_url['host'] ) ) {
			$root_domain_url = $parsed_url['scheme'] . '://' . $parsed_url['host'];
		}

		// Check if we managed to write to root domain or had to fall back to the subdirectory.
		$written_to_root = false;
		if ( $is_subdirectory ) {
			if ( strpos( $file_path, $root_path ) === 0 && strpos( $file_path, $wp_path ) !== 0 ) {
				$written_to_root = true;
			}
		}

		return rest_ensure_response(
			[
				'exists'          => $exists,
				'content'         => $content,
				'writable'        => $writable,
				'path'            => $file_path,
				'is_subdirectory' => $is_subdirectory,
				'root_domain_url' => $root_domain_url,
				'written_to_root' => $written_to_root,
				'wp_path'         => $wp_path,
				'root_path'       => $root_path,
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
		$dir_path  = dirname( $file_path );

		$exists   = $fs ? $fs->exists( $file_path ) : file_exists( $file_path );
		$writable = $exists
			? $this->path_is_writable( $file_path, $fs )
			: $this->path_is_writable( $dir_path, $fs );

		if ( ! $writable ) {
			return new \WP_Error(
				'advajra_fs_error',
				__( 'The target directory or ads.txt file is not writable. Please check server permissions.', 'advajra' ),
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
