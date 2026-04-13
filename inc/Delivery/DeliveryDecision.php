<?php
/**
 * Resolved delivery decision.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class DeliveryDecision
 */
class DeliveryDecision {

	/**
	 * Placement ID.
	 *
	 * @var int
	 */
	public $placement_id;

	/**
	 * Placement type.
	 *
	 * @var string
	 */
	public $placement_type;

	/**
	 * Ad ID.
	 *
	 * @var int
	 */
	public $ad_id;

	/**
	 * Context.
	 *
	 * @var string
	 */
	public $context;

	/**
	 * Constructor.
	 *
	 * @param int    $placement_id   Placement ID.
	 * @param string $placement_type Placement type.
	 * @param int    $ad_id          Ad ID.
	 * @param string $context        Render context.
	 */
	public function __construct( $placement_id, $placement_type, $ad_id, $context ) {
		$this->placement_id   = absint( $placement_id );
		$this->placement_type = sanitize_key( (string) $placement_type );
		$this->ad_id          = absint( $ad_id );
		$this->context        = RenderContext::normalize( $context );
	}
}
