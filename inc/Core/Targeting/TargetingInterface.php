<?php
namespace AdVajra\Core\Targeting;

/**
 * Interface TargetingInterface
 * Contract for all targeting conditions.
 */
interface TargetingInterface {
	/**
	 * Get the unique ID of the condition (e.g., 'user_role').
	 *
	 * @return string
	 */
	public function get_id();

	/**
	 * Get the human-readable label (e.g., 'User Role').
	 *
	 * @return string
	 */
	public function get_label();

	/**
	 * Get the group (e.g., 'User', 'Content').
	 *
	 * @return string
	 */
	public function get_group();

	/**
	 * Get available operators (e.g., ['==', '!=']).
	 *
	 * @return array
	 */
	public function get_operators();

	/**
	 * Get value options (if applicable, for select inputs).
	 *
	 * @return array
	 */
	public function get_options();

	/**
	 * Evaluate the condition against the current request.
	 *
	 * @param string $operator The operator (e.g., '==').
	 * @param mixed  $value The value to check against.
	 * @return bool
	 */
	public function check( $operator, $value );
}
