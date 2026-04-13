<?php
/**
 * AdVajra Logger — Free Plugin Stub.
 *
 * @package AdVajra\Utils
 */

namespace AdVajra\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Logger
 */
class Logger {

	/**
	 * Log file name.
	 */
	const LOG_FILE = 'advajra-debug.log';

	/**
	 * Log directory name inside wp-content/uploads/.
	 */
	const LOG_DIR = 'advajra-logs';

	/**
	 * Maximum log file size in bytes (2 MB).
	 * Kept here so PRO and any REST endpoint can reference it as a constant.
	 */
	const MAX_SIZE = 2 * 1024 * 1024;

	// ─────────────────────────────────────────────────────────────
	// PUBLIC DISPATCH API  (callers never changed — same signatures)
	// ─────────────────────────────────────────────────────────────

	/**
	 * Dispatch an error-level log event.
	 *
	 * @param string $message Message.
	 * @param array  $context Optional context map.
	 */
	public static function error( $message, $context = [] ) {
		/**
		 * Fires when an error-level log entry is dispatched.
		 *
		 * PRO plugin hooks here to perform the actual write.
		 * When PRO is inactive this action has no listeners and costs nothing.
		 *
		 * @param string $level   Log level ('ERROR').
		 * @param string $message Human-readable message.
		 * @param array  $context Structured context key/value pairs.
		 */
		do_action( 'advajra_log', 'ERROR', $message, $context );
	}

	/**
	 * Dispatch a warning-level log event.
	 *
	 * @param string $message Message.
	 * @param array  $context Optional context map.
	 */
	public static function warning( $message, $context = [] ) {
		/** This action is documented in inc/Utils/Logger.php */
		do_action( 'advajra_log', 'WARN', $message, $context );
	}

	/**
	 * Dispatch an info-level log event.
	 *
	 * @param string $message Message.
	 * @param array  $context Optional context map.
	 */
	public static function info( $message, $context = [] ) {
		/** This action is documented in inc/Utils/Logger.php */
		do_action( 'advajra_log', 'INFO', $message, $context );
	}

	/**
	 * Dispatch a debug-level log event.
	 *
	 * @param string $message Message.
	 * @param array  $context Optional context map.
	 */
	public static function debug( $message, $context = [] ) {
		/** This action is documented in inc/Utils/Logger.php */
		do_action( 'advajra_log', 'DEBUG', $message, $context );
	}

	// ─────────────────────────────────────────────────────────────
	// PATH CONTRACT  (shared by free + PRO, no file I/O here)
	// ─────────────────────────────────────────────────────────────

	/**
	 * Return the absolute path to the log file (whether it exists or not).
	 *
	 * PRO's Handler calls this to know where to write.
	 *
	 * @return string
	 */
	public static function get_log_path() {
		$upload_dir = wp_upload_dir();
		return trailingslashit( $upload_dir['basedir'] ) . self::LOG_DIR . '/' . self::LOG_FILE;
	}

	/**
	 * Return the absolute path to the log directory.
	 *
	 * @return string
	 */
	public static function get_log_dir() {
		$upload_dir = wp_upload_dir();
		return trailingslashit( $upload_dir['basedir'] ) . self::LOG_DIR;
	}
}
