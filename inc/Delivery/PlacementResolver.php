<?php
/**
 * Placement resolver.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

use AdVajra\Model\Group;
use AdVajra\Model\Placement;
use AdVajra\Utils\Logger;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PlacementResolver
 */
class PlacementResolver {

	/**
	 * Repository.
	 *
	 * @var PlacementRepository
	 */
	private $placements;

	/**
	 * Policy.
	 *
	 * @var PlacementPolicy
	 */
	private $policy;

	/**
	 * Constructor.
	 *
	 * @param PlacementRepository|null $placements Placement repository.
	 * @param PlacementPolicy|null     $policy     Policy.
	 */
	public function __construct( ?PlacementRepository $placements = null, ?PlacementPolicy $policy = null ) {
		$this->policy     = $policy ?: new PlacementPolicy();
		$this->placements = $placements ?: new PlacementRepository( $this->policy );
	}

	/**
	 * Resolve a placement into a delivery decision.
	 *
	 * @param int    $placement_id Placement ID.
	 * @param string $context      Render context.
	 * @return DeliveryDecision|null
	 */
	public function resolve( $placement_id, $context ) {
		$placement = $this->placements->find( $placement_id );

		if ( ! $placement ) {
			Logger::debug(
				'Placement skipped: not found',
				[
					'placement_id' => (int) $placement_id,
					'context'      => (string) $context,
					'reason'       => 'placement_not_found',
				]
			);
			return null;
		}

		if ( empty( $placement->type ) ) {
			Logger::debug(
				'Placement skipped: missing type',
				[
					'placement_id' => (int) $placement_id,
					'context'      => (string) $context,
					'reason'       => 'placement_type_empty',
				]
			);
			return null;
		}

		if ( ! $this->policy->allows( $placement->type, $context ) ) {
			Logger::debug(
				'Placement skipped: policy denied',
				[
					'placement_id'   => (int) $placement_id,
					'placement_type' => (string) $placement->type,
					'context'        => (string) $context,
					'reason'         => 'policy_denied',
				]
			);
			return null;
		}

		$ad_id     = 0;
		$item_type = $placement->item_type;

		if ( 'ad' === $item_type ) {
			$ad_id = absint( $placement->item_id );
		} elseif ( 'group' === $item_type ) {
			$ads = Group::get_ads_for_display( $placement->item_id );

			if ( empty( $ads ) ) {
				Logger::debug(
					'Placement skipped: ad group has no active ads',
					[
						'placement_id' => (int) $placement_id,
						'group_id'     => (int) $placement->item_id,
						'context'      => (string) $context,
						'reason'       => 'group_empty',
					]
				);
				return null;
			}

			$ad_id = absint( $ads[0] );
		}

		if ( ! $ad_id ) {
			Logger::debug(
				'Placement skipped: could not resolve an ad ID',
				[
					'placement_id' => (int) $placement_id,
					'item_type'    => (string) $item_type,
					'item_id'      => isset( $placement->item_id ) ? (int) $placement->item_id : null,
					'context'      => (string) $context,
					'reason'       => 'ad_id_unresolvable',
				]
			);
			return null;
		}

		return new DeliveryDecision( $placement->id, $placement->type, $ad_id, $context );
	}
}
