<?php
/**
 * Installation Class.
 *
 * @package AdVajra\Core
 */

namespace AdVajra\Core;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Install
 */
class Install {
	/**
	 * Install routine.
	 */
	public static function install() {
		self::create_tables();
		self::create_roles();
		self::set_defaults();
	}

	/**
	 * Create Database Tables.
	 */
	private static function create_tables() {
		global $wpdb;

		$charset_collate = $wpdb->get_charset_collate();

		$table_name = $wpdb->prefix . 'advajra_stats';

		$sql = "CREATE TABLE $table_name (
			ad_id bigint(20) UNSIGNED NOT NULL,
			date date NOT NULL,
			hour tinyint(2) UNSIGNED NOT NULL,
			impressions mediumint(8) UNSIGNED DEFAULT 0 NOT NULL,
			clicks mediumint(8) UNSIGNED DEFAULT 0 NOT NULL,
			ad_requests mediumint(8) UNSIGNED DEFAULT 0 NOT NULL,
			matched_requests mediumint(8) UNSIGNED DEFAULT 0 NOT NULL,
			viewable_impressions mediumint(8) UNSIGNED DEFAULT 0 NOT NULL,
			revenue_micros bigint(20) DEFAULT NULL,
			load_time_ms_sum bigint(20) UNSIGNED DEFAULT 0 NOT NULL,
			load_samples mediumint(8) UNSIGNED DEFAULT 0 NOT NULL,
			viewable_time_ms_sum bigint(20) UNSIGNED DEFAULT 0 NOT NULL,
			viewable_samples mediumint(8) UNSIGNED DEFAULT 0 NOT NULL,
			PRIMARY KEY  (ad_id, date, hour),
			KEY date_hour (date, hour)
		) $charset_collate;";

		$placements_table = $wpdb->prefix . 'advajra_placements';

		$sql_placements = "CREATE TABLE $placements_table (
			id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			name varchar(191) NOT NULL,
			type tinyint(2) UNSIGNED NOT NULL,
			item_type tinyint(1) UNSIGNED NOT NULL DEFAULT 1,
			item_id bigint(20) UNSIGNED DEFAULT NULL,
			status tinyint(1) UNSIGNED NOT NULL DEFAULT 1,
			paragraph_num tinyint(2) UNSIGNED DEFAULT NULL,
			is_pinned tinyint(1) UNSIGNED NOT NULL DEFAULT 0,
			config longtext,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY idx_type_status (type, status),
			KEY idx_item (item_id),
			KEY idx_pinned (is_pinned)
		) ENGINE=InnoDB $charset_collate;";

		$activity_table = $wpdb->prefix . 'advajra_activity_log';

		$sql_activity = "CREATE TABLE $activity_table (
			id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			actor bigint(20) UNSIGNED DEFAULT NULL,
			action varchar(80) NOT NULL,
			entity_type varchar(40) NOT NULL,
			entity_id bigint(20) UNSIGNED DEFAULT NULL,
			summary varchar(255) NOT NULL,
			context longtext,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY idx_created_at (created_at),
			KEY idx_entity_lookup (entity_type, entity_id),
			KEY idx_actor (actor)
		) ENGINE=InnoDB $charset_collate;";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
		dbDelta( $sql_placements );
		dbDelta( $sql_activity );
	}

	/**
	 * Create Roles/Caps.
	 */
	private static function create_roles() {
		// intentionally empty
	}

	/**
	 * Set default options.
	 */
	private static function set_defaults() {
		if ( ! get_option( 'advajra_version' ) ) {
			update_option( 'advajra_version', ADVAJRA_VERSION );
		}

		\AdVajra\Core\AnalyticsAccess::bootstrap_trial_metadata();

		if ( false === get_option( 'advajra_settings' ) ) {
			$defaults = \AdVajra\Data\Defaults::get_balanced_defaults();
			update_option( 'advajra_settings', $defaults );
		}
	}
}
