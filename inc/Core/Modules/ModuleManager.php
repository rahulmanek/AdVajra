<?php
/**
 * Module Manager Core Architect.
 *
 * @package AdVajra\Core\Modules
 */

namespace AdVajra\Core\Modules;

use AdVajra\Core\Modules\ModuleInterface;
use AdVajra\Core\Modules\AdGroupsModule;
use AdVajra\Core\Modules\IpBlockerModule;
use AdVajra\Core\Modules\BotProtectionModule;
use AdVajra\Core\Modules\CustomCodeModule;
use AdVajra\Core\Modules\AdBlockerProTeaserModule;
use AdVajra\Core\Modules\ClickFraudProtectionProTeaserModule;
use AdVajra\Core\Modules\AgniRuntimeProTeaserModule;
use AdVajra\Core\Modules\AgniCwvGuardProTeaserModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ModuleManager
 */
class ModuleManager {

	/**
	 * Option key for storing active modules.
	 */
	const OPTION_KEY = 'advajra_active_modules';

	/**
	 * All registered modules.
	 *
	 * @var ModuleInterface[]
	 */
	private array $modules = [];

	/**
	 * Array of active module IDs.
	 *
	 * @var array
	 */
	private array $active_module_ids = [];

	/**
	 * Init.
	 */
	public function init() {
		$this->load_active_module_ids();
		$this->register_core_modules();
		$this->initialize_active_modules();
	}

	/**
	 * Load active module states from database.
	 */
	private function load_active_module_ids() {
		$saved                   = get_option( self::OPTION_KEY, [] );
		$this->active_module_ids = is_array( $saved ) ? $saved : [];
	}

	private function register_core_modules() {
		$core_modules = [
			new AdGroupsModule(),
			new IpBlockerModule(),
			new BotProtectionModule(),
			new CustomCodeModule(),
			new AdBlockerProTeaserModule(),
			new ClickFraudProtectionProTeaserModule(),
			new AgniRuntimeProTeaserModule(),
			new AgniCwvGuardProTeaserModule(),
		];

		$all_modules = apply_filters( 'advajra_registered_modules', $core_modules );

		foreach ( $all_modules as $module ) {
			if ( $module instanceof ModuleInterface ) {
				$this->modules[ $module->get_id() ] = $module;
			}
		}
	}

	private function initialize_active_modules() {
		foreach ( $this->modules as $id => $module ) {
			if ( $this->is_active( $id ) ) {
				$module->init();
			}
		}
	}

	public function is_active( string $id ): bool {
		if ( isset( $this->modules[ $id ] ) && $this->modules[ $id ]->is_always_active() ) {
			return true;
		}
		return in_array( $id, $this->active_module_ids, true );
	}

	public function toggle_module( string $id, bool $status ): bool {
		if ( ! isset( $this->modules[ $id ] ) ) {
			return false;
		}

		if ( $this->modules[ $id ]->is_pro() && ( ! defined( 'ADVAJRA_PRO_ACTIVE' ) || ! ADVAJRA_PRO_ACTIVE ) ) {
			return false;
		}

		if ( $this->modules[ $id ]->is_always_active() ) {
			return false;
		}

		$current_status = $this->is_active( $id );

		if ( $current_status === $status ) {
			return false;
		}

		if ( $status ) {
			$this->active_module_ids[] = $id;
		} else {
			$this->active_module_ids = array_filter( $this->active_module_ids, fn( $v ) => $v !== $id );
		}

		$this->active_module_ids = array_values( $this->active_module_ids );
		return update_option( self::OPTION_KEY, $this->active_module_ids );
	}

	/**
	 * Get data for frontend UI rendering.
	 *
	 * @return array
	 */
	public function get_frontend_data(): array {
		$data = [];
		foreach ( $this->modules as $id => $module ) {
			$data[] = [
				'id'           => $module->get_id(),
				'name'         => $module->get_name(),
				'description'  => $module->get_description(),
				'icon'         => $module->get_icon(),
				'active'       => $this->is_active( $id ),
				'hasSettings'  => $module->has_settings(),
				'isPro'        => $module->is_pro(),
				'alwaysActive' => $module->is_always_active(),
			];
		}
		return $data;
	}

	/**
	 * Get the array of active module IDs.
	 *
	 * @return array
	 */
	public function get_active_module_ids(): array {
		return $this->active_module_ids;
	}
}
