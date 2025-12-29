<?php
/**
 * Buffer Utility Class.
 *
 * @package AdVajra\Utils
 */

namespace AdVajra\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Buffer
 */
class Buffer {

	/**
	 * Log File Path.
	 *
	 * @var string
	 */
	private $log_file;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$upload_dir     = wp_upload_dir();
		$this->log_file = $upload_dir['basedir'] . '/advajra/logs/events.log';

		if ( ! file_exists( dirname( $this->log_file ) ) ) {
			wp_mkdir_p( dirname( $this->log_file ) );
			// Add .htaccess to prevent public access
			file_put_contents( dirname( $this->log_file ) . '/.htaccess', 'deny from all' );
		}
	}

	/**
	 * Log an event.
	 *
	 * @param int    $ad_id Ad ID.
	 * @param string $type  Event Type (impression|click).
	 */
	public function log( $ad_id, $type ) {
		$timestamp = current_time( 'timestamp' ); // Local timestamp
		$line      = sprintf( "%d|%s|%d\n", $ad_id, $type, $timestamp );

		// Atomic Append
		file_put_contents( $this->log_file, $line, FILE_APPEND | LOCK_EX );
	}

	/**
	 * Get the log file path.
	 *
	 * @return string
	 */
	public function get_file_path() {
		return $this->log_file;
	}
}
