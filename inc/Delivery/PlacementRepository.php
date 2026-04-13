<?php
/**
 * Placement repository.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

use AdVajra\Model\Placement;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PlacementRepository
 */
class PlacementRepository {

	/**
	 * Request-local active placement cache grouped by type.
	 *
	 * @var array<string,array>|null
	 */
	private static $active_by_type = null;

	/**
	 * Policy.
	 *
	 * @var PlacementPolicy
	 */
	private $policy;

	/**
	 * Constructor.
	 *
	 * @param PlacementPolicy|null $policy Policy.
	 */
	public function __construct( ?PlacementPolicy $policy = null ) {
		$this->policy = $policy ?: new PlacementPolicy();
	}

	/**
	 * Find one placement.
	 *
	 * @param int $placement_id Placement ID.
	 * @return object|false
	 */
	public function find( $placement_id ) {
		$placement = Placement::get( $placement_id );

		if ( ! $placement || empty( $placement->status ) || 'active' !== $placement->status ) {
			return false;
		}

		return $placement;
	}

	/**
	 * Get active placements for an auto context.
	 *
	 * @param string $context Render context.
	 * @return array
	 */
	public function get_active_for_context( $context ) {
		$type = $this->policy->type_for_context( $context );

		if ( empty( $type ) ) {
			return [];
		}

		$this->prime_active_cache();

		return self::$active_by_type[ $type ] ?? [];
	}

	/**
	 * Prime request-local active placement cache.
	 *
	 * @return void
	 */
	private function prime_active_cache() {
		if ( null !== self::$active_by_type ) {
			return;
		}

		self::$active_by_type = [];

		$placements = Placement::get_all();
		foreach ( (array) $placements as $placement ) {
			if ( ! is_object( $placement ) ) {
				continue;
			}

			if ( empty( $placement->status ) || 'active' !== $placement->status ) {
				continue;
			}

			$type = sanitize_key( (string) ( $placement->type ?? '' ) );
			if ( '' === $type ) {
				continue;
			}

			if ( ! isset( self::$active_by_type[ $type ] ) ) {
				self::$active_by_type[ $type ] = [];
			}

			self::$active_by_type[ $type ][] = $placement;
		}

		foreach ( self::$active_by_type as $type => $items ) {
			usort(
				$items,
				static function ( $left, $right ) {
					return (int) ( $left->id ?? 0 ) <=> (int) ( $right->id ?? 0 );
				}
			);
			self::$active_by_type[ $type ] = $items;
		}
	}

	/**
	 * Reset the request-local cache.
	 *
	 * Useful in unit tests and during admin preview flows where
	 * placement data may change within the same request.
	 *
	 * @return void
	 */
	public static function reset() {
		self::$active_by_type = null;
	}
}
