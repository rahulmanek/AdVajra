<?php
/**
 * Audit log helper.
 *
 * @package AdVajra\Utils
 */

namespace AdVajra\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AuditLog
 */
class AuditLog {
	/**
	 * Cached table existence flag.
	 *
	 * @var bool|null
	 */
	private static $table_exists = null;

	/**
	 * Table suffix.
	 *
	 * @var string
	 */
	const TABLE = 'advajra_activity_log';

	/**
	 * Resolve full table name.
	 *
	 * @return string
	 */
	private static function get_table_name() {
		global $wpdb;
		return $wpdb->prefix . self::TABLE;
	}

	/**
	 * Check whether audit table exists.
	 *
	 * @return bool
	 */
	private static function table_exists() {
		if ( null !== self::$table_exists ) {
			return self::$table_exists;
		}

		global $wpdb;
		$table = self::get_table_name();
		$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) );
		self::$table_exists = ! empty( $found );

		return self::$table_exists;
	}

	/**
	 * Insert an activity log row.
	 *
	 * @param string   $action      Action slug.
	 * @param string   $entity_type Entity type slug.
	 * @param int|null $entity_id   Entity ID.
	 * @param string   $summary     Human-readable summary.
	 * @param array    $context     Optional context.
	 * @param int|null $actor_id    Optional actor override.
	 * @return void
	 */
	public static function log( $action, $entity_type, $entity_id = null, $summary = '', $context = [], $actor_id = null ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return;
		}

		$action      = sanitize_key( (string) $action );
		$entity_type = sanitize_key( (string) $entity_type );
		$entity_id   = $entity_id ? absint( $entity_id ) : null;
		$summary     = sanitize_text_field( $summary );

		if ( empty( $action ) || empty( $entity_type ) ) {
			return;
		}

		if ( empty( $summary ) ) {
			$summary = ucwords( str_replace( '_', ' ', $action ) );
		}

		$actor = null !== $actor_id ? absint( $actor_id ) : get_current_user_id();
		$actor = $actor > 0 ? $actor : null;

		$encoded_context = null;
		if ( ! empty( $context ) ) {
			$encoded_context = wp_json_encode( $context );
		}

		$wpdb->insert(
			self::get_table_name(),
			[
				'actor'      => $actor,
				'action'     => $action,
				'entity_type'=> $entity_type,
				'entity_id'  => $entity_id,
				'summary'    => $summary,
				'context'    => $encoded_context,
				'created_at' => current_time( 'mysql' ),
			],
			[ '%d', '%s', '%s', '%d', '%s', '%s', '%s' ]
		);
	}

	/**
	 * Fetch recent activity feed rows.
	 *
	 * @param int $limit Max records.
	 * @return array<int,array<string,mixed>>
	 */
	public static function get_recent( $limit = 12 ) {
		global $wpdb;

		if ( ! self::table_exists() ) {
			return [];
		}

		$limit = max( 1, min( 100, absint( $limit ) ) );
		$rows  = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, actor, action, entity_type, entity_id, summary, context, created_at
				FROM " . self::get_table_name() . "
				ORDER BY created_at DESC
				LIMIT %d",
				$limit
			),
			ARRAY_A
		);

		if ( empty( $rows ) ) {
			return [];
		}

		$actors      = array_filter( array_map( 'absint', wp_list_pluck( $rows, 'actor' ) ) );
		$actor_names = [];

		if ( ! empty( $actors ) ) {
			$users = get_users(
				[
					'include' => array_values( array_unique( $actors ) ),
					'fields'  => [ 'ID', 'display_name' ],
				]
			);

			foreach ( $users as $user ) {
				$actor_names[ (int) $user->ID ] = $user->display_name;
			}
		}

		return array_map(
			static function ( $row ) use ( $actor_names ) {
				$actor_id = ! empty( $row['actor'] ) ? (int) $row['actor'] : 0;
				$context  = [];
				if ( ! empty( $row['context'] ) ) {
					$decoded = json_decode( $row['context'], true );
					if ( is_array( $decoded ) ) {
						$context = $decoded;
					}
				}

				return [
					'id'          => (int) $row['id'],
					'actor_id'    => $actor_id ?: null,
					'actor_name'  => $actor_id && isset( $actor_names[ $actor_id ] ) ? $actor_names[ $actor_id ] : __( 'System', 'advajra' ),
					'action'      => $row['action'],
					'entity_type' => $row['entity_type'],
					'entity_id'   => ! empty( $row['entity_id'] ) ? (int) $row['entity_id'] : null,
					'summary'     => $row['summary'],
					'context'     => $context,
					'created_at'  => $row['created_at'],
				];
			},
			$rows
		);
	}
}
