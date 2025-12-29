<?php
namespace AdVajra\Core\Targeting;

/**
 * Class Category
 */
class Category implements TargetingInterface {
	public function get_id() {
		return 'category';
	}

	public function get_label() {
		return 'Category';
	}

	public function get_group() {
		return 'Content';
	}

	public function get_operators() {
		return [
			'IN'     => 'is',
			'NOT IN' => 'is not',
		];
	}

	public function get_options() {
		$categories = get_categories( [ 'hide_empty' => false ] );
		$options    = [];
		foreach ( $categories as $cat ) {
			$options[ $cat->term_id ] = $cat->name;
		}
		return $options;
	}

	public function check( $operator, $value ) {
		if ( ! is_single() && ! is_category() ) {
			return false;
		}

		// $value should be an array of IDs
		if ( ! is_array( $value ) ) {
			$value = [ $value ];
		}

		if ( $operator === 'IN' ) {
			return has_category( $value );
		} else {
			return ! has_category( $value );
		}
	}
}
