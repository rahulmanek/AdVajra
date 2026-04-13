<?php
/**
 * Render contexts.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class RenderContext
 */
final class RenderContext {

	const AUTO_HEADER          = 'auto_header';
	const AUTO_FOOTER          = 'auto_footer';
	const AUTO_BEFORE_CONTENT  = 'auto_before_content';
	const AUTO_AFTER_CONTENT   = 'auto_after_content';
	const AUTO_AFTER_PARAGRAPH = 'auto_after_paragraph';
	const SHORTCODE            = 'shortcode';
	const BLOCK                = 'block';
	const WIDGET               = 'widget';

	/**
	 * Normalize a context value.
	 *
	 * @param string $context Context.
	 * @return string
	 */
	public static function normalize( $context ) {
		$context = sanitize_key( (string) $context );

		$allowed = [
			self::AUTO_HEADER,
			self::AUTO_FOOTER,
			self::AUTO_BEFORE_CONTENT,
			self::AUTO_AFTER_CONTENT,
			self::AUTO_AFTER_PARAGRAPH,
			self::SHORTCODE,
			self::BLOCK,
			self::WIDGET,
		];

		return in_array( $context, $allowed, true ) ? $context : self::SHORTCODE;
	}
}
