<?php
/**
 * Uninstall AdVajra.
 * @package AdVajra
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

$advajra_settings           = get_option( 'advajra_settings', [] );
$advajra_erase_on_uninstall = ! empty( $advajra_settings['erase_data_on_uninstall'] );


// 1. CRON EVENTS
wp_clear_scheduled_hook( 'advajra_sync_tracking' );
wp_clear_scheduled_hook( 'advajra_cleanup_stats' );

/*
 * advajra_expire_single_ad is scheduled per-ad with [ $post_id ] as args.
 * wp_clear_scheduled_hook() without args only clears future events with
 * no args — we must iterate every ad ID to clear its specific event.
 */
$advajra_ad_ids = get_posts(
	[
		'post_type'      => 'advajra_ad',
		'post_status'    => 'any',
		'posts_per_page' => -1,
		'fields'         => 'ids',
	]
);

foreach ( $advajra_ad_ids as $advajra_ad_id ) {
	wp_clear_scheduled_hook( 'advajra_expire_single_ad', [ (int) $advajra_ad_id ] );
}

// 2. HOUSEKEEPING OPTIONS

$advajra_housekeeping_options = [
	'advajra_version',
	'advajra_active_modules',
	'advajra_deleted_stats',
	'advajra_last_tracking_sync',
];

foreach ( $advajra_housekeeping_options as $advajra_option ) {
	delete_option( $advajra_option );
	delete_site_option( $advajra_option );
}

if ( ! $advajra_erase_on_uninstall ) {
	return;
}

// 3. OPTIONS
$advajra_user_options = [
	'advajra_settings',
	'advajra_trial_started',
];

foreach ( $advajra_user_options as $advajra_option ) {
	delete_option( $advajra_option );
	delete_site_option( $advajra_option );
}

// 4. POSTS & POST META
$advajra_post_ids = get_posts(
	[
		'post_type'      => [ 'advajra_ad', 'advajra_group' ],
		'post_status'    => 'any',
		'posts_per_page' => -1,
		'fields'         => 'ids',
	]
);

foreach ( $advajra_post_ids as $advajra_post_id ) {
	wp_delete_post( (int) $advajra_post_id, true );
}

// 5. DATABASE TABLES

// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared
$wpdb->query( 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'advajra_stats' );
$wpdb->query( 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'advajra_placements' );
$wpdb->query( 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'advajra_activity_log' );
// phpcs:enable WordPress.DB.PreparedSQL.NotPrepared

// 6. UPLOAD DIRECTORY
$advajra_upload_dir = wp_upload_dir();
$advajra_dir        = trailingslashit( $advajra_upload_dir['basedir'] ) . 'advajra';

advajra_delete_directory( $advajra_dir );

/**
 * Recursively delete a directory and all its contents.
 *
 * Uses wp_delete_file() for individual files (WP's safe deletion wrapper)
 * and rmdir() for directories once emptied.
 *
 * @param string $path Absolute path to the directory.
 */
function advajra_delete_directory( $path ) {
	if ( ! is_dir( $path ) ) {
		return;
	}

	require_once ABSPATH . 'wp-admin/includes/file.php';

	global $wp_filesystem;

	if ( ! $wp_filesystem && ! \WP_Filesystem() ) {
		return;
	}

	$wp_filesystem->rmdir( $path, true );
}
