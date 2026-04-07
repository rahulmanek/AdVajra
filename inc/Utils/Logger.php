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
			/**
			 * Allow local/dev tooling to consume structured AdVajra logs without
			 * relying on discouraged direct error_log() calls.
			 *
			 * @param array<string,mixed> $payload Log payload.
			 */
			do_action(
				'advajra_debug_log',
				[
					'level'   => (string) $level,
					'message' => (string) $message,
					'context' => $context,
				]
			);
		}
	}
}
