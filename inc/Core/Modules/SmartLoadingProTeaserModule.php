<?php
/**
 * Smart Loading PRO teaser module.
 *
 * Placeholder shown in the free plugin's module grid with a PRO badge.
 * When AdVajra Pro is active, the real SmartLoadingModule (same ID)
 * replaces this teaser via the advajra_registered_modules filter.
 *
 * @package AdVajra\Core\Modules
 */

namespace AdVajra\Core\Modules;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class SmartLoadingProTeaserModule
 */
class SmartLoadingProTeaserModule implements ModuleInterface {

	/**
	 * Get the unique ID of the module.
	 *
	 * Must match the PRO module's ID so it gets replaced when PRO is active.
	 *
	 * @return string
	 */
	public function get_id(): string {
		return 'smart_loading';
	}

	/**
	 * Get the display name.
	 *
	 * @return string
	 */
	public function get_name(): string {
		return __( 'Smart Loading', 'advajra' );
	}

	/**
	 * Get the description.
	 *
	 * @return string
	 */
	public function get_description(): string {
		return __( 'Intelligent above/below fold detection for ad images. Boosts LCP for visible ads and defers off-screen ads to improve Core Web Vitals.', 'advajra' );
	}

	/**
	 * Get the icon identifier.
	 *
	 * @return string
	 */
	public function get_icon(): string {
		return 'smart_loading';
	}

	/**
	 * Teaser has no runtime logic.
	 *
	 * @return void
	 */
	public function init(): void {
	}

	/**
	 * Whether the module has a dedicated settings panel.
	 *
	 * @return bool
	 */
	public function has_settings(): bool {
		return false;
	}

	/**
	 * Module is PRO-only.
	 *
	 * @return bool
	 */
	public function is_pro(): bool {
		return true;
	}

	/**
	 * Module is not always active.
	 *
	 * @return bool
	 */
	public function is_always_active(): bool {
		return false;
	}
}
