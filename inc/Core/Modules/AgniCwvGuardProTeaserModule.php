<?php
/**
 * Vajra Agni CWV Guard teaser module.
 *
 * @package AdVajra\Core\Modules
 */

namespace AdVajra\Core\Modules;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AgniCwvGuardProTeaserModule
 */
class AgniCwvGuardProTeaserModule implements ModuleInterface {

	/**
	 * Get module ID.
	 *
	 * @return string
	 */
	public function get_id(): string {
		return 'vajra_agni_cwv_guard';
	}

	/**
	 * Get module name.
	 *
	 * @return string
	 */
	public function get_name(): string {
		return __( 'Vajra Agni CWV Guard', 'advajra' );
	}

	/**
	 * Get module description.
	 *
	 * @return string
	 */
	public function get_description(): string {
		return __( 'Pro Core Web Vitals guardrails for safer rendering and reduced tracking overhead.', 'advajra' );
	}

	/**
	 * Get icon.
	 *
	 * @return string
	 */
	public function get_icon(): string {
		return 'shield';
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

