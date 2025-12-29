<?php
/**
 * Uninstall AdVajra.
 * @package AdVajra
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

$settings           = get_option( 'advajra_settings', [] );
$erase_on_uninstall = ! empty( $settings['erase_data_on_uninstall'] );


// 1. CRON EVENTS
wp_clear_scheduled_hook( 'advajra_sync_tracking' );
wp_clear_scheduled_hook( 'advajra_cleanup_stats' );

/*
 * advajra_expire_single_ad is scheduled per-ad with [ $post_id ] as args.
 * wp_clear_scheduled_hook() without args only clears future events with
 * no args — we must iterate every ad ID to clear its specific event.
 */
$ad_ids = get_posts(
	[
		'post_type'      => 'advajra_ad',
		'post_status'    => 'any',
		'posts_per_page' => -1,
		'fields'         => 'ids',
	]
);

foreach ( $ad_ids as $ad_id ) {
	wp_clear_scheduled_hook( 'advajra_expire_single_ad', [ (int) $ad_id ] );
}

// 2. HOUSEKEEPING OPTIONS

$housekeeping_options = [
	'advajra_version',
	'advajra_active_modules',
	'advajra_deleted_stats',
	'advajra_last_tracking_sync',
];

foreach ( $housekeeping_options as $option ) {
	delete_option( $option );
	delete_site_option( $option );
}

if ( ! $erase_on_uninstall ) {
	return;
}

// 3. OPTIONS
$user_options = [
	'advajra_settings',
	'advajra_trial_started',
];

foreach ( $user_options as $option ) {
	delete_option( $option );
	delete_site_option( $option );
}

// 4. POSTS & POST META
$post_ids = get_posts(
	[
		'post_type'      => [ 'advajra_ad', 'advajra_group' ],
		'post_status'    => 'any',
		'posts_per_page' => -1,
		'fields'         => 'ids',
	]
);

foreach ( $post_ids as $post_id ) {
	wp_delete_post( (int) $post_id, true );
}

// 5. DATABASE TABLES

// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared
$wpdb->query( 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'advajra_stats' );
$wpdb->query( 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'advajra_placements' );
$wpdb->query( 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'advajra_activity_log' );
// phpcs:enable WordPress.DB.PreparedSQL.NotPrepared

// 6. UPLOAD DIRECTORY
$upload_dir  = wp_upload_dir();
$advajra_dir = trailingslashit( $upload_dir['basedir'] ) . 'advajra';

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

	$entries = array_diff( scandir( $path ), [ '.', '..' ] );

	foreach ( $entries as $entry ) {
		$full_path = $path . DIRECTORY_SEPARATOR . $entry;

		if ( is_dir( $full_path ) ) {
			advajra_delete_directory( $full_path );
		} else {
			wp_delete_file( $full_path );
		}
	}

	rmdir( $path );
}
