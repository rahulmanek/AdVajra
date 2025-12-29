<?php
/**
 * Abstract Condition Class.
 *
 * @package AdVajra\Conditions
 */

namespace AdVajra\Conditions;

/**
 * Abstract Class Condition
 */
abstract class Condition {

	/**
	 * Get the type/slug of the condition.
	 *
	 * @return string
	 */
	abstract public function get_type();

	/**
	 * Get the label for the condition.
	 *
	 * @return string
	 */
	abstract public function get_label();

	/**
	 * Get the category of the condition (e.g., 'content', 'visitor').
	 *
	 * @return string
	 */
	abstract public function get_category();

	/**
	 * Check if the condition is met.
	 *
	 * @param array $args Arguments for the check.
	 * @return bool
	 */
	abstract public function check( $args );

	/**
	 * Get the UI options for the condition.
	 *
	 * @return array
	 */
	public function get_options_ui() {
		return [];
	}
}
