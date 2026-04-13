<?php
/**
 * Vajra Agni Runtime teaser module.
 *
 * @package AdVajra\Core\Modules
 */

namespace AdVajra\Core\Modules;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AgniRuntimeProTeaserModule
 */
class AgniRuntimeProTeaserModule implements ModuleInterface {

	/**
	 * Get module ID.
	 *
	 * @return string
	 */
	public function get_id(): string {
		return 'vajra_agni_runtime';
	}

	/**
	 * Get module name.
	 *
	 * @return string
	 */
	public function get_name(): string {
		return __( 'Vajra Agni Runtime', 'advajra' );
	}

	/**
	 * Get module description.
	 *
	 * @return string
	 */
	public function get_description(): string {
		return __( 'Pro speed takeover with lightweight tracking endpoint and faster runtime transport.', 'advajra' );
	}

	/**
	 * Get icon.
	 *
	 * @return string
	 */
	public function get_icon(): string {
		return 'performance';
	}

	/**
	 * Init module.
	 *
	 * @return void
	 */
	public function init(): void {
	}

	/**
	 * Has settings.
	 *
	 * @return bool
	 */
	public function has_settings(): bool {
		return true;
	}

	/**
	 * Is Pro module.
	 *
	 * @return bool
	 */
	public function is_pro(): bool {
		return true;
	}

	/**
	 * Is always active.
	 *
	 * @return bool
	 */
	public function is_always_active(): bool {
		return false;
	}
}

