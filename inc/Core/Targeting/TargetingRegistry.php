<?php
namespace AdVajra\Core\Targeting;

/**
 * Class TargetingRegistry
 * Manages available targeting options.
 */
class TargetingRegistry {
	/**
	 * Instance
	 *
	 * @var TargetingRegistry
	 */
	private static $instance = null;

	/**
	 * Registered conditions.
	 *
	 * @var TargetingInterface[]
	 */
	private $conditions = [];

	/**
	 * Singleton instance.
	 *
	 * @return TargetingRegistry
	 */
	public static function instance() {
		if ( is_null( self::$instance ) ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register a condition.
	 *
	 * @param TargetingInterface $condition
	 */
	public function register( TargetingInterface $condition ) {
		$this->conditions[ $condition->get_id() ] = $condition;
	}

	/**
	 * Get all registered conditions.
	 *
	 * @return TargetingInterface[]
	 */
	public function get_all() {
		return $this->conditions;
	}

	/**
	 * Get a specific condition by ID.
	 *
	 * @param string $id
	 * @return TargetingInterface|null
	 */
	public function get( $id ) {
		return isset( $this->conditions[ $id ] ) ? $this->conditions[ $id ] : null;
	}

	/**
	 * Return conditions formatted for the API/Frontend.
	 *
	 * @return array
	 */
	public function to_array() {
		$data = [];
		foreach ( $this->conditions as $condition ) {
			$data[] = [
				'id'        => $condition->get_id(),
				'label'     => $condition->get_label(),
				'group'     => $condition->get_group(),
				'operators' => $condition->get_operators(),
				'options'   => $condition->get_options(),
			];
		}
		return $data;
	}
}
