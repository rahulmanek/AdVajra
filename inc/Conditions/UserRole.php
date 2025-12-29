<?php
/**
 * User Role Condition.
 *
 * @package AdVajra\Conditions
 */

namespace AdVajra\Conditions;

/**
 * Class UserRole
 */
class UserRole extends Condition {

	/**
	 * Get type.
	 *
	 * @return string
	 */
	public function get_type() {
		return 'user_role';
	}

	/**
	 * Get label.
	 *
	 * @return string
	 */
	public function get_label() {
		return __( 'User Role', 'advajra' );
	}

	/**
	 * Get category.
	 *
	 * @return string
	 */
	public function get_category() {
		return 'visitor';
	}

	/**
	 * Check condition.
	 *
	 * @param array $args Arguments.
	 * @return bool
	 */
	public function check( $args ) {
		if ( ! is_user_logged_in() ) {
			// Special handling for 'guest' role check? For now assume no role match if not logged in.
			// Unless we define a virtual 'guest' role.
			return 'is_not' === $args['operator'];
		}

		$user     = wp_get_current_user();
		$is_match = in_array( $args['value'], (array) $user->roles, true );

		if ( 'is_not' === $args['operator'] ) {
			return ! $is_match;
		}

		return $is_match;
	}

	/**
	 * Get UI options.
	 *
	 * @return array
	 */
	public function get_options_ui() {
		global $wp_roles;
		$options = [];

		if ( ! isset( $wp_roles ) ) {
			$wp_roles = new \WP_Roles();
		}

		foreach ( $wp_roles->roles as $slug => $role ) {
			$options[] = [
				'value' => $slug,
				'label' => $role['name'],
			];
		}

		return [
			'type'    => 'select',
			'options' => $options,
		];
	}
}
