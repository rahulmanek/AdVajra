<?php
/**
 * Module Interface.
 * Defines the contract for all Advajra modules.
 *
 * @package AdVajra\Core\Modules
 */

namespace AdVajra\Core\Modules;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Interface ModuleInterface
 */
interface ModuleInterface {

	/**
	 * Get the unique ID of the module.
	 *
	 * @return string
	 */
	public function get_id(): string;

	/**
	 * Get the display name of the module.
	 *
	 * @return string
	 */
	public function get_name(): string;

	/**
	 * Get the description of the module.
	 *
	 * @return string
	 */
	public function get_description(): string;

	/**
	 * Get the SVG icon for the module.
	 *
	 * @return string
	 */
	public function get_icon(): string;

	/**
	 * Run the module's Initialization logic.
	 * This is only called if the module is active.
	 *
	 * @return void
	 */
	public function init(): void;

	/**
	 * Determines if the module has a dedicated settings page.
	 *
	 * @return bool
	 */
	public function has_settings(): bool;

	/**
	 * Determines if the module is a PRO feature.
	 *
	 * @return bool
	 */
	public function is_pro(): bool;

	/**
	 * Determines if the module is always active and cannot be toggled.
	 *
	 * @return bool
	 */
	public function is_always_active(): bool;
}
