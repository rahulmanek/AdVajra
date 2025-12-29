<?php
/**
 * Post Types Registration.
 *
 * @package AdVajra\Model
 */

namespace AdVajra\Model;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PostTypes
 */
class PostTypes {

	/**
	 * Init.
	 */
	public function init() {
		add_action( 'init', [ $this, 'register_post_types' ] );
	}

	/**
	 * Register Post Types.
	 */
	public function register_post_types() {
		register_post_type(
			'advajra_ad',
			[
				'labels'          => [
					'name'          => __( 'Ads', 'advajra' ),
					'singular_name' => __( 'Ad', 'advajra' ),
					'menu_name'     => __( 'AdVajra', 'advajra' ),
				],
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => true,
				'supports'        => [ 'title', 'custom-fields' ],
				'show_in_rest'    => true,
				'menu_icon'       => $this->get_menu_icon_data_uri(),
				'capability_type' => 'post',
				'map_meta_cap'    => true,
			]
		);

		// Register Custom Statuses
		$this->register_custom_statuses();
	}

	/**
	 * Register Custom Statuses.
	 */
	private function register_custom_statuses() {
		register_post_status(
			'paused',
			[
				'label'                     => __( 'Paused', 'advajra' ),
				'public'                    => false,
				'exclude_from_search'       => false,
				'show_in_admin_all_list'    => true,
				'show_in_admin_status_list' => true,
				'label_count'               => _n_noop( 'Paused <span class="count">(%s)</span>', 'Paused <span class="count">(%s)</span>', 'advajra' ),
			]
		);

		register_post_status(
			'expired',
			[
				'label'                     => __( 'Expired', 'advajra' ),
				'public'                    => false,
				'exclude_from_search'       => false,
				'show_in_admin_all_list'    => true,
				'show_in_admin_status_list' => true,
				'label_count'               => _n_noop( 'Expired <span class="count">(%s)</span>', 'Expired <span class="count">(%s)</span>', 'advajra' ),
			]
		);

		register_post_status(
			'archived',
			[
				'label'                     => __( 'Archived', 'advajra' ),
				'public'                    => false,
				'exclude_from_search'       => true,
				'show_in_admin_all_list'    => false,
				'show_in_admin_status_list' => true,
				'label_count'               => _n_noop( 'Archived <span class="count">(%s)</span>', 'Archived <span class="count">(%s)</span>', 'advajra' ),
			]
		);
	}

	/**
	 * Get WP admin menu icon as data URI.
	 *
	 * @return string
	 */
	private function get_menu_icon_data_uri() {
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 662 600" aria-hidden="true">'
			. '<path fill="black" d="M0 39.1517C0 0 0 0 52.8 0H607.2C661 0 661 0 662 21.6229L660 450.245C660 471.868 636.361 478.396 607.2 489.396L326.04 600L52.8 489.396C23.6394 477.396 0 471.868 0 450.245V39.1517Z"/>'
			. '<path fill="white" d="M497.545 46.7002C500.212 44.157 504.345 43.9234 507.283 46.1777C510.269 48.4688 511.094 52.6185 509.213 55.8779L404.836 236.664H479.346C482.407 236.664 485.161 238.524 486.304 241.364C487.446 244.204 486.748 247.453 484.54 249.573L233.194 490.91C230.5 493.497 226.314 493.707 223.374 491.403C220.434 489.1 219.638 484.984 221.505 481.75L318.355 314H248.346C245.312 314 242.578 312.173 241.417 309.37C240.256 306.568 240.897 303.341 243.042 301.196L497.414 46.8252L497.542 46.6963L497.545 46.7002Z"/>'
			. '</svg>';

		return 'data:image/svg+xml;base64,' . base64_encode( $svg );
	}
}
