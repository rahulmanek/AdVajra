<?php
/**
 * Placement policy rules.
 *
 * @package AdVajra\Delivery
 */

namespace AdVajra\Delivery;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class PlacementPolicy
 */
class PlacementPolicy {

	/**
	 * Map placement types to allowed render contexts.
	 *
	 * @var array<string,string[]>
	 */
	private $rules = [
		'header'          => [ RenderContext::AUTO_HEADER ],
		'footer'          => [ RenderContext::AUTO_FOOTER ],
		'before_content'  => [ RenderContext::AUTO_BEFORE_CONTENT ],
		'after_content'   => [ RenderContext::AUTO_AFTER_CONTENT ],
		'after_paragraph' => [ RenderContext::AUTO_AFTER_PARAGRAPH ],
		'shortcode'       => [
			RenderContext::SHORTCODE,
			RenderContext::BLOCK,
			RenderContext::WIDGET,
		],
	];

	/**
	 * Whether a placement type is allowed in a context.
	 *
	 * @param string $placement_type Placement type.
	 * @param string $context        Render context.
	 * @return bool
	 */
	public function allows( $placement_type, $context ) {
		$placement_type = sanitize_key( (string) $placement_type );
		$context        = RenderContext::normalize( $context );

		return ! empty( $this->rules[ $placement_type ] ) && in_array( $context, $this->rules[ $placement_type ], true );
	}

	/**
	 * Resolve the placement type for an auto context.
	 *
	 * @param string $context Render context.
	 * @return string|null
	 */
	public function type_for_context( $context ) {
		$context = RenderContext::normalize( $context );

		foreach ( $this->rules as $type => $contexts ) {
			if ( in_array( $context, $contexts, true ) && 1 === count( $contexts ) ) {
				return $type;
			}
		}

		return null;
	}
}
