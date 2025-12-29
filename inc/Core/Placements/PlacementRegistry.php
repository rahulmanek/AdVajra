<?php
namespace AdVajra\Core\Placements;

use AdVajra\Model\Placement;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PlacementRegistry
 *
 * Bridge between the custom table Placement model and the Injector.
 * Provides formatted placement data for frontend rendering.
 *
 * @package AdVajra\Core\Placements
 */
class PlacementRegistry {

	/**
	 * Instance.
	 *
	 * @var PlacementRegistry
	 */
	private static $instance = null;

	/**
	 * Get Instance.
	 *
	 * @return PlacementRegistry
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Get All Active Placements (formatted for Injector).
	 *
	 * @return array
	 */
	public function get_placements() {
		$raw        = Placement::get_all();
		$placements = [];

		foreach ( $raw as $p ) {
			if ( 'active' !== $p->status ) {
				continue;
			}

			$type = $this->map_type_to_injector_type( $p->type );

			$placements[] = [
				'id'        => (int) $p->id,
				'name'      => $p->name,
				'type'      => $type,
				'item_type' => $p->item_type,
				'item_id'   => (int) $p->item_id,
				'args'      => [
					'point'     => $this->get_point_from_type( $p->type ),
					'paragraph' => $p->paragraph_num ?? 0,
				],
			];
		}

		return apply_filters( 'advajra_active_placements', $placements );
	}

	/**
	 * Map our type slugs to Injector's expected types.
	 */
	private function map_type_to_injector_type( $type ) {
		$content_types = [ 'before_content', 'after_content', 'after_paragraph' ];
		if ( in_array( $type, $content_types, true ) ) {
			return 'content';
		}
		return $type;
	}

	/**
	 * Get injection point from type.
	 */
	private function get_point_from_type( $type ) {
		switch ( $type ) {
			case 'before_content':
				return 'before';
			case 'after_content':
			case 'after_paragraph':
			default:
				return 'after';
		}
	}

	/**
	 * Get Available Types.
	 */
	public function get_types() {
		return [
			'content'   => [
				'label'       => 'The Content',
				'description' => 'Inject ads automatically inside post/page content.',
				'supports'    => [ 'auto', 'paragraph' ],
			],
			'shortcode' => [
				'label'       => 'Shortcode',
				'description' => 'Manual placement using a generated shortcode.',
				'supports'    => [],
			],
			'header'    => [
				'label'       => 'Header',
				'description' => 'Display in site header.',
				'supports'    => [],
			],
			'footer'    => [
				'label'       => 'Footer',
				'description' => 'Display in site footer.',
				'supports'    => [],
			],
		];
	}
}
