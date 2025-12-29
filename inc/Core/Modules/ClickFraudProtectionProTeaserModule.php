<?php
/**
 * Click Fraud Protection Teaser Module.
 *
 * @package AdVajra\Core\Modules
 */

namespace AdVajra\Core\Modules;

use AdVajra\Core\Modules\ModuleInterface;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ClickFraudProtectionProTeaserModule
 */
class ClickFraudProtectionProTeaserModule implements ModuleInterface {

	/**
	 * Get the unique ID of the module.
	 *
	 * @return string
	 */
	public function get_id(): string {
		return 'click_fraud_protection';
	}

	/**
	 * Get the display name of the module.
	 *
	 * @return string
	 */
	public function get_name(): string {
		return __( 'Click Fraud Protection', 'advajra' );
	}

	/**
	 * Get the description of the module.
	 *
	 * @return string
	 */
	public function get_description(): string {
		return __( 'Prevents malicious users and competitors from generating fake clicks on your ads.', 'advajra' );
	}

	/**
	 * Get the SVG icon for the module.
	 *
	 * @return string
	 */
	public function get_icon(): string {
		return 'click_fraud';
	}

	/**
	 * Run the module's Initialization logic.
	 *
	 * @return void
	 */
	public function init(): void {
	}

	/**
	 * Determines if the module has a dedicated settings page.
	 *
	 * @return bool
	 */
	public function has_settings(): bool {
		return true;
	}

	/**
	 * Is module PRO only?
	 */
	public function is_pro(): bool {
		return true;
	}

	/**
	 * Is module always active?
	 */
	public function is_always_active(): bool {
		return false;
	}
}
