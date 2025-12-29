<?php
/**
 * Ad Groups Module.
 *
 * @package AdVajra\Core\Modules\AdGroups
 */

namespace AdVajra\Core\Modules;

use AdVajra\Core\Modules\ModuleInterface;
use AdVajra\Core\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AdGroupsModule
 */
class AdGroupsModule implements ModuleInterface {

	/**
	 * Get the unique ID of the module.
	 *
	 * @return string
	 */
	public function get_id(): string {
		return 'ad_groups';
	}

	/**
	 * Get the display name of the module.
	 *
	 * @return string
	 */
	public function get_name(): string {
		return __( 'Ad Groups & Rotation', 'advajra' );
	}

	/**
	 * Get the description of the module.
	 *
	 * @return string
	 */
	public function get_description(): string {
		return __( 'Rotate ads in one slot for cleaner A/B testing and better performance.', 'advajra' );
	}

	/**
	 * Get the SVG icon for the module.
	 *
	 * @return string
	 */
	public function get_icon(): string {
		// Use the built-in 'group' icon from @wordpress/icons which is what the frontend expects
		return 'group';
	}

	/**
	 * Run the module's Initialization logic.
	 *
	 * @return void
	 */
	public function init(): void {
		add_action( 'init', [ $this, 'register_cpt' ] );
		add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
	}

	/**
	 * Determines if the module has a dedicated settings page.
	 *
	 * @return bool
	 */
	public function has_settings(): bool {
		return false;
	}

	/**
	 * Determines if the module is a PRO feature.
	 *
	 * @return bool
	 */
	public function is_pro(): bool {
		return false;
	}

	/**
	 * Is module always active?
	 */
	public function is_always_active(): bool {
		return false;
	}

	/**
	 * Register the Custom Post Type.
	 */
	public function register_cpt() {
		register_post_type(
			'advajra_group',
			[
				'labels'          => [
					'name'          => __( 'Ad Groups', 'advajra' ),
					'singular_name' => __( 'Ad Group', 'advajra' ),
				],
				'public'          => false,
				'show_ui'         => false, // Hidden from standard UI, managed in React.
				'supports'        => [ 'title' ],
				'show_in_rest'    => true,
				'capability_type' => 'post',
				'map_meta_cap'    => true,
			]
		);
	}

	/**
	 * Register the REST API Routes.
	 */
	public function register_rest_routes() {
		if ( class_exists( '\AdVajra\API\Groups' ) ) {
			( new \AdVajra\API\Groups() )->register_routes();
		}
	}
}
