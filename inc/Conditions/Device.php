<?php
/**
 * Device Condition.
 *
 * @package AdVajra\Conditions
 */

namespace AdVajra\Conditions;

/**
 * Class Device
 */
class Device extends Condition {

	/**
	 * Get type.
	 *
	 * @return string
	 */
	public function get_type() {
		return 'device';
	}

	/**
	 * Get label.
	 *
	 * @return string
	 */
	public function get_label() {
		return __( 'Device', 'advajra' );
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
	 * Detect current device type.
	 *
	 * @return string 'mobile', 'tablet', or 'desktop'
	 */
	private function detect_device() {
		// Use Mobile_Detect if available for better detection
		if ( class_exists( '\Detection\MobileDetect' ) ) {
			$detect = new \Detection\MobileDetect();
			if ( $detect->isTablet() ) {
				return 'tablet';
			}
			if ( $detect->isMobile() ) {
				return 'mobile';
			}
			return 'desktop';
		}

		// Fallback to WordPress detection (less accurate for tablets)
		if ( wp_is_mobile() ) {
			// Try basic tablet detection via user agent
			$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
			if ( preg_match( '/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i', $user_agent ) ) {
				return 'tablet';
			}
			return 'mobile';
		}

		return 'desktop';
	}

	/**
	 * Check condition.
	 *
	 * @param array $args Arguments.
	 * @return bool
	 */
	public function check( $args ) {
		$current_device = $this->detect_device();
		$target         = $args['value']; // 'mobile', 'tablet', or 'desktop'

		$is_match = ( $current_device === $target );

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
		return [
			'type'    => 'select',
			'options' => [
				[
					'value' => 'desktop',
					'label' => __( 'Desktop', 'advajra' ),
				],
				[
					'value' => 'tablet',
					'label' => __( 'Tablet', 'advajra' ),
				],
				[
					'value' => 'mobile',
					'label' => __( 'Mobile', 'advajra' ),
				],
			],
		];
	}
}
