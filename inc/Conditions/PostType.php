<?php
/**
 * Post Type Condition.
 *
 * @package AdVajra\Conditions
 */

namespace AdVajra\Conditions;

/**
 * Class PostType
 */
class PostType extends Condition {

	/**
	 * Get type.
	 *
	 * @return string
	 */
	public function get_type() {
		return 'post_type';
	}

	/**
	 * Get label.
	 *
	 * @return string
	 */
	public function get_label() {
		return __( 'Post Type', 'advajra' );
	}

	/**
	 * Get category.
	 *
	 * @return string
	 */
	public function get_category() {
		return 'content';
	}

	/**
	 * Check condition.
	 *
	 * @param array $args Arguments.
	 * @return bool
	 */
	public function check( $args ) {
		// If operator is 'is', check if post_type equals value.
		// If operator is 'is_not', check if post_type does not equal value.
		$is_match = get_post_type() === $args['value'];

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
		$post_types = get_post_types( [ 'public' => true ], 'objects' );
		$options    = [];

		foreach ( $post_types as $pt ) {
			$options[] = [
				'value' => $pt->name,
				'label' => $pt->label,
			];
		}

		return [
			'type'    => 'select',
			'options' => $options,
		];
	}
}
