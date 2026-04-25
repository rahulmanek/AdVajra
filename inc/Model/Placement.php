<?php
/**
 * Placement Model.
 *
 * Handles CRUD operations for Placements using custom table.
 * Optimized for speed: Numeric enums + Object Caching.
 *
 * @package AdVajra\Model
 */

namespace AdVajra\Model;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Placement
 */
class Placement {

	const TABLE       = 'advajra_placements';
	const CACHE_GROUP = 'advajra_placements';

	const TYPE_BEFORE_CONTENT  = 1;
	const TYPE_AFTER_CONTENT   = 2;
	const TYPE_AFTER_PARAGRAPH = 3;
	const TYPE_HEADER          = 5;
	const TYPE_FOOTER          = 6;
	const TYPE_SHORTCODE       = 7;

	const ITEM_AD    = 1;
	const ITEM_GROUP = 2;

	const STATUS_ACTIVE   = 1;
	const STATUS_DISABLED = 2;
	const STATUS_EMPTY    = 3;

	/**
	 * Type slug to ID mapping.
	 */
	private static $type_map = [
		'before_content'  => self::TYPE_BEFORE_CONTENT,
		'after_content'   => self::TYPE_AFTER_CONTENT,
		'after_paragraph' => self::TYPE_AFTER_PARAGRAPH,
		'header'          => self::TYPE_HEADER,
		'footer'          => self::TYPE_FOOTER,
		'shortcode'       => self::TYPE_SHORTCODE,
	];

	/**
	 * Item type slug to ID mapping.
	 */
	private static $item_type_map = [
		'ad'    => self::ITEM_AD,
		'group' => self::ITEM_GROUP,
	];

	/**
	 * Status slug to ID mapping.
	 */
	private static $status_map = [
		'active'   => self::STATUS_ACTIVE,
		'disabled' => self::STATUS_DISABLED,
		'empty'    => self::STATUS_EMPTY,
	];

	/**
	 * Placement types that are valid in manual embed contexts.
	 *
	 * @return string[]
	 */
	public static function get_embed_type_slugs() {
		return [ 'shortcode' ];
	}

	/**
	 * Whether a placement type is valid for manual embeds.
	 *
	 * @param int|string $type Type ID or slug.
	 * @return bool
	 */
	public static function is_embed_type( $type ) {
		$type_slug = is_numeric( $type ) ? self::id_to_type( (int) $type ) : sanitize_key( (string) $type );
		return in_array( $type_slug, self::get_embed_type_slugs(), true );
	}

	/**
	 * Get placements that are allowed in manual embed contexts.
	 *
	 * @return array
	 */
	public static function get_embed_eligible() {
		return array_values(
			array_filter(
				self::get_all(),
				function ( $placement ) {
					return ! empty( $placement['type'] ) && self::is_embed_type( $placement['type'] );
				}
			)
		);
	}

	/**
	 * Debug logger (WP_DEBUG only).
	 *
	 * @param string $message Message.
	 * @param array  $context Context map.
	 * @return void
	 */
	private static function debug_log( $message, $context = [] ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			$payload = wp_json_encode( $context );
			error_log( '[AdVajra Placement Model] ' . $message . ( $payload ? ' ' . $payload : '' ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		}
	}

	/**
	 * Get table name with prefix.
	 */
	public static function get_table() {
		global $wpdb;
		return esc_sql( $wpdb->prefix . self::TABLE );
	}

	/**
	 * Convert type slug to ID.
	 */
	public static function type_to_id( $slug ) {
		return self::$type_map[ $slug ] ?? self::TYPE_BEFORE_CONTENT;
	}

	/**
	 * Convert type ID to slug.
	 */
	public static function id_to_type( $id ) {
		return array_search( (int) $id, self::$type_map, true ) ?: 'before_content';
	}

	/**
	 * Convert item_type slug to ID.
	 */
	public static function item_type_to_id( $slug ) {
		return self::$item_type_map[ $slug ] ?? self::ITEM_AD;
	}

	/**
	 * Convert item_type ID to slug.
	 */
	public static function id_to_item_type( $id ) {
		return array_search( (int) $id, self::$item_type_map, true ) ?: 'ad';
	}

	/**
	 * Convert status slug to ID.
	 */
	public static function status_to_id( $slug ) {
		return self::$status_map[ $slug ] ?? self::STATUS_ACTIVE;
	}

	/**
	 * Convert status ID to slug.
	 */
	public static function id_to_status( $id ) {
		return array_search( (int) $id, self::$status_map, true ) ?: 'active';
	}

	/**
	 * Transform DB row to API response format (slugs for frontend).
	 * Casts numeric fields to integers since MySQL returns strings.
	 */
	private static function transform_for_api( $item ) {
		if ( ! $item ) {
			return $item;
		}
		$item->id            = (int) $item->id;
		$item->item_id       = $item->item_id ? (int) $item->item_id : null;
		$item->paragraph_num = $item->paragraph_num ? (int) $item->paragraph_num : null;
		$item->is_pinned     = ! empty( $item->is_pinned ) ? true : false;

		$item->type      = self::id_to_type( $item->type );
		$item->item_type = self::id_to_item_type( $item->item_type );
		$item->status    = self::id_to_status( $item->status );
		$item->config    = $item->config ? json_decode( $item->config, true ) : [];
		return $item;
	}

	/**
	 * Create a placement.
	 *
	 * @param array $data Placement data (accepts slugs or IDs).
	 * @return int|false ID on success, false on failure.
	 */
	public static function create( $data ) {
		global $wpdb;

		$type_id      = is_numeric( $data['type'] ?? '' ) ? (int) $data['type'] : self::type_to_id( $data['type'] ?? 'before_content' );
		$item_type_id = is_numeric( $data['item_type'] ?? '' ) ? (int) $data['item_type'] : self::item_type_to_id( $data['item_type'] ?? 'ad' );
		$status_id    = is_numeric( $data['status'] ?? '' ) ? (int) $data['status'] : self::status_to_id( $data['status'] ?? 'active' );

		$item_id = ! empty( $data['item_id'] ) ? absint( $data['item_id'] ) : null;
		if ( null === $item_id ) {
			$status_id = self::STATUS_EMPTY;
		}

		$paragraph_num = ( $type_id === self::TYPE_AFTER_PARAGRAPH && isset( $data['args']['paragraph'] ) )
			? absint( $data['args']['paragraph'] )
			: null;

		$name   = sanitize_text_field( $data['name'] ?? '' );
		$config = wp_json_encode( $data['config'] ?? $data['args'] ?? [] );

			$table  = self::get_table();
			$sql    = null;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom placement table write.
			$result = $wpdb->insert(
			$table,
			[
				'name'          => $name,
				'type'          => $type_id,
				'item_type'     => $item_type_id,
				'item_id'       => $item_id,
				'status'        => $status_id,
				'paragraph_num' => $paragraph_num,
				'config'        => $config,
			],
			[
				'%s',
				'%d',
				'%d',
				'%d',
				'%d',
				'%d',
				'%s',
			]
		);

		if ( $result ) {
			wp_cache_delete( 'last_changed', self::CACHE_GROUP );
			return $wpdb->insert_id;
		}

		self::debug_log(
			'Create query failed',
			[
				'db_error' => $wpdb->last_error,
				'sql'      => $sql,
				'input'    => $data,
			]
		);

		return false;
	}

	/**
	 * Get a placement by ID.
	 */
	public static function get( $id ) {
		global $wpdb;

		$id = absint( $id );
		if ( ! $id ) {
			return false;
		}

		$cache_key = "placement_$id";
		$item      = wp_cache_get( $cache_key, self::CACHE_GROUP );

		if ( false === $item ) {
			$table = self::get_table();
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Result is cached by placement ID immediately below.
			$item  = $wpdb->get_row(
				$wpdb->prepare(
					'SELECT * FROM %i WHERE id = %d',
					$table,
					$id
				)
			);

			if ( $item ) {
				$item = self::transform_for_api( $item );
				wp_cache_set( $cache_key, $item, self::CACHE_GROUP );
			}
		}

		return $item;
	}

	/**
	 * Update a placement.
	 */
	public static function update( $id, $data ) {
		global $wpdb;

		$id = absint( $id );
		if ( ! $id ) {
			return false;
		}

		$update = [];
		$format = [];

		if ( isset( $data['name'] ) ) {
			$update['name'] = sanitize_text_field( $data['name'] );
			$format[]       = '%s';
		}
		if ( isset( $data['type'] ) ) {
			$update['type'] = is_numeric( $data['type'] ) ? (int) $data['type'] : self::type_to_id( $data['type'] );
			$format[]       = '%d';
		}
		if ( isset( $data['item_type'] ) ) {
			$update['item_type'] = is_numeric( $data['item_type'] ) ? (int) $data['item_type'] : self::item_type_to_id( $data['item_type'] );
			$format[]            = '%d';
		}
		if ( array_key_exists( 'item_id', $data ) ) {
			$update['item_id'] = ! empty( $data['item_id'] ) ? absint( $data['item_id'] ) : null;
			$format[]          = '%d';
		}
		if ( isset( $data['status'] ) ) {
			$update['status'] = is_numeric( $data['status'] ) ? (int) $data['status'] : self::status_to_id( $data['status'] );
			$format[]         = '%d';
		}
		if ( isset( $data['paragraph_num'] ) ) {
			$update['paragraph_num'] = absint( $data['paragraph_num'] );
			$format[]                = '%d';
		}
		if ( isset( $data['config'] ) || isset( $data['args'] ) ) {
			$update['config'] = wp_json_encode( $data['config'] ?? $data['args'] ?? [] );
			$format[]         = '%s';
		}
		if ( isset( $data['is_pinned'] ) ) {
			$update['is_pinned'] = $data['is_pinned'] ? 1 : 0;
			$format[]            = '%d';
		}

		if ( empty( $update ) ) {
			return false;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom placement table write.
		$result = $wpdb->update( self::get_table(), $update, [ 'id' => $id ], $format, [ '%d' ] );

		if ( false !== $result ) {
			wp_cache_delete( "placement_$id", self::CACHE_GROUP );
			wp_cache_delete( 'last_changed', self::CACHE_GROUP );
			return true;
		}

		self::debug_log(
			'Update query failed',
			[
				'id'       => $id,
				'db_error' => $wpdb->last_error,
				'input'    => $data,
			]
		);

		return false;
	}

	/**
	 * Delete a placement.
	 */
	public static function delete( $id ) {
		global $wpdb;

		$id = absint( $id );
		if ( ! $id ) {
			return false;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Custom placement table write.
		$result = $wpdb->delete( self::get_table(), [ 'id' => $id ], [ '%d' ] );

		if ( $result ) {
			wp_cache_delete( "placement_$id", self::CACHE_GROUP );
			wp_cache_delete( 'last_changed', self::CACHE_GROUP );
			return true;
		}

		self::debug_log(
			'Delete query failed',
			[
				'id'       => $id,
				'db_error' => $wpdb->last_error,
			]
		);

		return false;
	}

	/**
	 * Get all placements (with cache).
	 */
	public static function get_all() {
		global $wpdb;

		$last_changed = wp_cache_get_last_changed( self::CACHE_GROUP );
		$cache_key    = "all_placements:$last_changed";
		$items        = wp_cache_get( $cache_key, self::CACHE_GROUP );

		if ( false === $items ) {
			$table = self::get_table();
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Result is cached by all-placements cache key immediately below.
			$items = $wpdb->get_results(
				$wpdb->prepare( 'SELECT * FROM %i ORDER BY id DESC', $table )
			);

			foreach ( $items as &$item ) {
				$item = self::transform_for_api( $item );
			}
			unset( $item );

			wp_cache_set( $cache_key, $items, self::CACHE_GROUP );
		}

		return $items;
	}

	/**
	 * Get placements by type (for frontend rendering).
	 */
	public static function get_by_type( $type_slug ) {
		global $wpdb;

		$type_id = self::type_to_id( $type_slug );
		$table   = self::get_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Placement queries use a small custom table and are cached at higher rendering layers.
		$items = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM %i WHERE type = %d AND status = %d ORDER BY id ASC',
				$table,
				$type_id,
				self::STATUS_ACTIVE
			)
		);

		foreach ( $items as &$item ) {
			$item = self::transform_for_api( $item );
		}
		unset( $item );

		return $items;
	}
}
