<?php
/**
 * Logger Utility.
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
	 * Log error.
	 *
	 * @param string $message Message.
	 * @param array  $context Context.
	 */
	public static function error( $message, $context = [] ) {
		self::log( 'error', $message, $context );
	}

	/**
	 * Log info.
	 *
	 * @param string $message Message.
	 * @param array  $context Context.
	 */
	public static function info( $message, $context = [] ) {
		self::log( 'info', $message, $context );
	}

	/**
	 * Internal log handler.
	 *
	 * @param string $level   Level.
	 * @param string $message Message.
	 * @param array  $context Context.
	 */
	private static function log( $level, $message, $context = [] ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			$entry = sprintf( '[AdVajra][%s] %s %s', strtoupper( $level ), $message, json_encode( $context ) );
			error_log( $entry );
		}
	}
}
