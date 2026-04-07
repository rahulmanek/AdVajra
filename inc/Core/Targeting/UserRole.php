<?php
namespace AdVajra\Core\Targeting;

/**
 * Class UserRole
 */
class UserRole implements TargetingInterface {
	public function get_id() {
		return 'user_role';
	}

	public function get_label() {
		return 'User Role';
	}

	public function get_group() {
		return 'User';
	}

	public function get_operators() {
		return [
			'==' => 'is',
			'!=' => 'is not',
		];
	}

	public function get_options() {
		global $wp_roles;
		return $wp_roles->get_names();
	}

	public function check( $operator, $value ) {
		if ( ! is_user_logged_in() ) {
			return false;
		}

		$user = wp_get_current_user();
		if ( is_array( $value ) ) {
			$match = ! empty( array_intersect( $value, (array) $user->roles ) );
			return $operator === '==' ? $match : ! $match;
		}

		if ( $operator === '==' ) {
			return in_array( $value, (array) $user->roles, true );
		} else {
			return ! in_array( $value, (array) $user->roles, true );
		}
	}
}
