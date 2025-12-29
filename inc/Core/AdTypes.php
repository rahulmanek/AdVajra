<?php
/**
 * Ad Types registry (autoloaded)
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdTypes {
	/**
	 * Return available ad types.
	 *
	 * @return array
	 */
	public static function get_types(): array {
		$cached = wp_cache_get( 'advajra_ad_types', 'advajra' );
		if ( false !== $cached && is_array( $cached ) ) {
			return $cached;
		}

		$types = [
			'image' => [
				'label'            => __( 'Image', 'advajra' ),
				'icon'             => 'image',
				'desc'             => __( 'Upload a banner image.', 'advajra' ),
				'supports_preview' => true,
			],
			'rich'  => [
				'label'            => __( 'Rich Content', 'advajra' ),
				'icon'             => 'edit',
				'desc'             => __( 'Design using visual editor.', 'advajra' ),
				'supports_preview' => true,
			],
			'plain'  => [
				'label'            => __( 'Plain', 'advajra' ),
				'icon'             => 'code',
				'desc'             => __( 'Text, HTML, JS, PHP or Shortcodes.', 'advajra' ),
				'supports_preview' => true,
			],
		];

		/**
		 * Filter ad types.
		 *
		 * Allows Free/Pro/extensions to register or modify ad types.
		 *
		 * @param array $types Associative array of ad types.
		 */
		$types = apply_filters( 'advajra_ad_types', $types );

		if ( ! is_array( $types ) ) {
			$types = [];
		}

		wp_cache_set( 'advajra_ad_types', $types, 'advajra', HOUR_IN_SECONDS );

		return $types;
	}

	/**
	 * Get the default ad type key (first registered type).
	 *
	 * @return string Default type key.
	 */
	public static function get_default(): string {
		$types = self::get_types();
		if ( empty( $types ) ) {
			return 'plain';
		}
		$keys = array_keys( $types );
		return $keys[0];
	}

	/**
	 * Validate and normalize a type key.
	 * Returns the key if valid, or the default if invalid/empty.
	 *
	 * @param string|null $type Type key to validate.
	 * @return string Valid type key.
	 */
	public static function normalize( $type ): string {
		if ( ! empty( $type ) && self::exists( $type ) ) {
			return $type;
		}
		return self::get_default();
	}

	/**
	 * Check if a type key exists in the registry.
	 *
	 * @param string $type Type key to check.
	 * @return bool True if type exists.
	 */
	public static function exists( string $type ): bool {
		return isset( self::get_types()[ $type ] );
	}

	/**
	 * Clear ad types cache (useful when types are changed at runtime).
	 *
	 * @return void
	 */
	public static function clear_cache() {
		wp_cache_delete( 'advajra_ad_types', 'advajra' );
	}

	/**
	 * Programmatically register a new ad type at runtime.
	 * This adds a small filter that appends the new type and clears cache.
	 *
	 * @param string $key  Type key (slug).
	 * @param array  $args Type definition array (label, icon, desc, supports_preview...)
	 * @return bool True on success.
	 */
	public static function register_type( string $key, array $args ): bool {
		if ( empty( $key ) || ! is_string( $key ) ) {
			return false;
		}

		add_filter( 'advajra_ad_types', function( $types ) use ( $key, $args ) {
			if ( ! is_array( $types ) ) {
				$types = [];
			}
			$types[ $key ] = wp_parse_args( $args, [
				'label' => ucfirst( str_replace( '-', ' ', $key ) ),
				'icon' => 'admin-site',
				'desc' => '',
				'supports_preview' => false,
			] );
			return $types;
		} );

		self::clear_cache();

		/**
		 * Action fired after a new ad type is registered programmatically.
		 *
		 * @param string $key
		 * @param array  $args
		 */
		do_action( 'advajra_register_ad_type', $key, $args );

		return true;
	}

	/**
	 * Programmatically unregister an ad type.
	 *
	 * @param string $key Type key.
	 * @return bool True if removed (or not present).
	 */
	public static function unregister_type( string $key ): bool {
		if ( empty( $key ) || ! is_string( $key ) ) {
			return false;
		}

		add_filter( 'advajra_ad_types', function( $types ) use ( $key ) {
			if ( ! is_array( $types ) ) {
				return [];
			}
			if ( isset( $types[ $key ] ) ) {
				unset( $types[ $key ] );
			}
			return $types;
		} );

		self::clear_cache();

		do_action( 'advajra_unregister_ad_type', $key );

		return true;
	}
}
