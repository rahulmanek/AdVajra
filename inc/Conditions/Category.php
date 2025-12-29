<?php
/**
 * Category Condition.
 *
 * @package AdVajra\Conditions
 */

namespace AdVajra\Conditions;

/**
 * Class Category
 */
class Category extends Condition {

	/**
	 * Get type.
	 *
	 * @return string
	 */
	public function get_type() {
		return 'category';
	}

	/**
	 * Get label.
	 *
	 * @return string
	 */
	public function get_label() {
		return __( 'Category', 'advajra' );
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
		// Only check on single posts or category archives.
		if ( ! is_single() && ! is_category() ) {
			return false;
		}

		// operator: 'is' (in category), 'is_not' (not in category)
		$is_match = has_category( $args['value'] );

		if ( is_category() ) {
			$obj = get_queried_object();
			if ( $obj && isset( $obj->term_id ) ) {
				$is_match = ( (int) $obj->term_id === (int) $args['value'] );
			}
		}

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
		$categories = get_categories( [ 'hide_empty' => false ] );
		$options    = [];

		foreach ( $categories as $cat ) {
			$options[] = [
				'value' => $cat->term_id,
				'label' => $cat->name,
			];
		}

		return [
			'type'    => 'select',
			'options' => $options,
		];
	}
}
