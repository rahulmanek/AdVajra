<?php
/**
 * Condition Registry.
 *
 * @package AdVajra\Conditions
 */

namespace AdVajra\Conditions;

/**
 * Class Registry
 */
class Registry {

	/**
	 * Instance of the registry.
	 *
	 * @var Registry
	 */
	private static $instance = null;

	/**
	 * Registered conditions.
	 *
	 * @var Condition[]
	 */
	private $conditions = [];

	/**
	 * Get instance.
	 *
	 * @return Registry
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register a condition.
	 *
	 * @param Condition $condition Condition instance.
	 */
	public function register( Condition $condition ) {
		$this->conditions[ $condition->get_type() ] = $condition;
	}

	/**
	 * Get all registered conditions.
	 *
	 * @return Condition[]
	 */
	public function get_all() {
		return $this->conditions;
	}

	/**
	 * Get a condition by type.
	 *
	 * @param string $type Condition type.
	 * @return Condition|null
	 */
	public function get( $type ) {
		return isset( $this->conditions[ $type ] ) ? $this->conditions[ $type ] : null;
	}
}
