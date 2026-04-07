<?php
namespace AdVajra\Core\Targeting;

/**
 * Class Device
 */
class Device implements TargetingInterface {
	public function get_id() {
		return 'device';
	}

	public function get_label() {
		return 'Device';
	}

	public function get_group() {
		return 'User';
	}

	public function get_operators() {
		return [
			'==' => 'is',
		];
	}

	public function get_options() {
		return [
			'mobile'  => 'Mobile',
			'desktop' => 'Desktop',
		];
	}

	public function check( $operator, $value ) {
		$is_mobile      = wp_is_mobile();
		$current_device = $is_mobile ? 'mobile' : 'desktop';

		// Support both single string and array of values
		if ( is_array( $value ) ) {
			return in_array( $current_device, $value, true );
		}

		return $current_device === $value;
	}
}
