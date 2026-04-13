<?php
/**
 * Placement renderer.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PlacementRenderer
 */
class PlacementRenderer {

	/**
	 * Resolver.
	 *
	 * @var PlacementResolver|null
	 */
	private static $resolver = null;

	/**
	 * Render a placement in a specific context.
	 *
	 * @param int    $placement_id Placement ID.
	 * @param string $context      Render context.
	 * @param array  $options      Options.
	 * @return string
	 */
	public static function render( $placement_id, $context, $options = [] ) {
		$decision = self::resolver()->resolve( $placement_id, $context );
		if ( null === $decision ) {
			return '';
		}

		$options['placement_id']   = $decision->placement_id;
		$options['placement_type'] = $decision->placement_type;

		return AdRenderer::render( $decision->ad_id, $decision->context, $options );
	}

	/**
	 * Get resolver.
	 *
	 * @return PlacementResolver
	 */
	private static function resolver() {
		if ( null === self::$resolver ) {
			self::$resolver = new PlacementResolver();
		}

		return self::$resolver;
	}
}
