<?php
namespace AdVajra\Core\Targeting;

/**
 * Class PostType
 */
class PostType implements TargetingInterface {
	public function get_id() {
		return 'post_type';
	}

	public function get_label() {
		return 'Post Type';
	}

	public function get_group() {
		return 'Content';
	}

	public function get_operators() {
		return [
			'==' => 'is',
			'!=' => 'is not',
		];
	}

	public function get_options() {
		$types   = get_post_types( [ 'public' => true ], 'objects' );
		$options = [];
		foreach ( $types as $slug => $type ) {
			$options[ $slug ] = $type->labels->singular_name;
		}
		return $options;
	}

	public function check( $operator, $value ) {
		$current_type = get_post_type();
		if ( ! $current_type && is_front_page() ) {
			$current_type = 'page';
		}

		// Support both single string and array of values
		if ( is_array( $value ) ) {
			$match = in_array( $current_type, $value, true );
			return $operator === '==' ? $match : ! $match;
		}

		if ( $operator === '==' ) {
			return $current_type === $value;
		} else {
			return $current_type !== $value;
		}
	}
}
