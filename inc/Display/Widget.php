<?php
/**
 * AdVajra Widget.
 *
 * @package AdVajra\Display
 */

namespace AdVajra\Display;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Widget
 */
class Widget extends \WP_Widget {

	/**
	 * Constructor.
	 */
	public function __construct() {
		parent::__construct(
			'advajra_ad_widget',
			__( 'AdVajra Ad/Placement', 'advajra' ),
			[ 'description' => __( 'Display an AdVajra Ad or Placement in your sidebar.', 'advajra' ) ]
		);
	}

	/**
	 * Render widget output.
	 *
	 * @param array $args     Widget arguments.
	 * @param array $instance Saved values.
	 */
	public function widget( $args, $instance ) {
		$type = ! empty( $instance['type'] ) ? sanitize_text_field( $instance['type'] ) : 'ad';
		$id   = ! empty( $instance['id'] ) ? absint( $instance['id'] ) : 0;

		if ( ! $id ) {
			return;
		}

		echo wp_kses_post( $args['before_widget'] );
		if ( ! empty( $instance['title'] ) ) {
			echo wp_kses_post( $args['before_title'] . apply_filters( 'widget_title', $instance['title'] ) . $args['after_title'] );
		}

		if ( 'ad' === $type ) {
			echo wp_kses_post( \AdVajra\Delivery\AdRenderer::render( $id, \AdVajra\Delivery\RenderContext::WIDGET ) );
		} elseif ( 'placement' === $type ) {
			echo wp_kses_post( \AdVajra\Delivery\PlacementRenderer::render( $id, \AdVajra\Delivery\RenderContext::WIDGET ) );
		}

		echo wp_kses_post( $args['after_widget'] );
	}

	/**
	 * Render widget form.
	 *
	 * @param array $instance Current settings.
	 */
	public function form( $instance ) {
		$title = ! empty( $instance['title'] ) ? $instance['title'] : '';
		$type  = ! empty( $instance['type'] ) ? $instance['type'] : 'ad';
		$id    = ! empty( $instance['id'] ) ? absint( $instance['id'] ) : 0;

		$ads        = \AdVajra\Model\Ad::get_all( [ 'post_status' => 'publish' ] );
		$placements = \AdVajra\Model\Placement::get_embed_eligible();
		?>
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'title' ) ); ?>"><?php esc_html_e( 'Widget Title (Optional):', 'advajra' ); ?></label>
			<input class="widefat" id="<?php echo esc_attr( $this->get_field_id( 'title' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'title' ) ); ?>" type="text" value="<?php echo esc_attr( $title ); ?>">
		</p>
		
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'type' ) ); ?>"><?php esc_html_e( 'Display Type:', 'advajra' ); ?></label>
			<select class="widefat advajra-widget-type-selector" id="<?php echo esc_attr( $this->get_field_id( 'type' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'type' ) ); ?>" onchange="document.getElementById('<?php echo esc_attr( $this->get_field_id( 'id_ad' ) ); ?>').style.display = this.value === 'ad' ? 'block' : 'none'; document.getElementById('<?php echo esc_attr( $this->get_field_id( 'id_placement' ) ); ?>').style.display = this.value === 'placement' ? 'block' : 'none';">
				<option value="ad" <?php selected( $type, 'ad' ); ?>><?php esc_html_e( 'Specific Ad', 'advajra' ); ?></option>
				<option value="placement" <?php selected( $type, 'placement' ); ?>><?php esc_html_e( 'Manual Placement', 'advajra' ); ?></option>
			</select>
		</p>

		<p id="<?php echo esc_attr( $this->get_field_id( 'id_ad' ) ); ?>" style="display: <?php echo 'ad' === $type ? 'block' : 'none'; ?>;">
			<label for="<?php echo esc_attr( $this->get_field_id( 'id' ) ); ?>_ad"><?php esc_html_e( 'Select Ad:', 'advajra' ); ?></label>
			<select class="widefat" id="<?php echo esc_attr( $this->get_field_id( 'id' ) ); ?>_ad" name="<?php echo esc_attr( $this->get_field_name( 'id' ) ); ?>_ad">
				<option value="0"><?php esc_html_e( '-- Select an Ad --', 'advajra' ); ?></option>
				<?php foreach ( $ads as $ad ) : ?>
					<option value="<?php echo esc_attr( $ad->ID ); ?>" <?php selected( 'ad' === $type && $id === $ad->ID ); ?>>
						<?php echo esc_html( $ad->post_title ); ?>
					</option>
				<?php endforeach; ?>
			</select>
		</p>

		<p id="<?php echo esc_attr( $this->get_field_id( 'id_placement' ) ); ?>" style="display: <?php echo 'placement' === $type ? 'block' : 'none'; ?>;">
			<label for="<?php echo esc_attr( $this->get_field_id( 'id' ) ); ?>_placement"><?php esc_html_e( 'Select Manual Placement:', 'advajra' ); ?></label>
			<select class="widefat" id="<?php echo esc_attr( $this->get_field_id( 'id' ) ); ?>_placement" name="<?php echo esc_attr( $this->get_field_name( 'id' ) ); ?>_placement">
				<option value="0"><?php esc_html_e( '-- Select a Manual Placement --', 'advajra' ); ?></option>
				<?php foreach ( $placements as $plc ) : ?>
					<option value="<?php echo esc_attr( $plc['id'] ); ?>" <?php selected( 'placement' === $type && $id === (int) $plc['id'] ); ?>>
						<?php echo esc_html( $plc['name'] ); ?>
					</option>
				<?php endforeach; ?>
			</select>
		</p>
		<?php
	}

	/**
	 * Update widget settings.
	 *
	 * @param array $new_instance New settings.
	 * @param array $old_instance Old settings.
	 * @return array Updated settings.
	 */
	public function update( $new_instance, $old_instance ) {
		$instance          = [];
		$instance['title'] = ( ! empty( $new_instance['title'] ) ) ? sanitize_text_field( $new_instance['title'] ) : '';
		$instance['type']  = ( ! empty( $new_instance['type'] ) ) ? sanitize_text_field( $new_instance['type'] ) : 'ad';

		if ( 'ad' === $instance['type'] ) {
			$instance['id'] = ( ! empty( $new_instance['id_ad'] ) ) ? absint( $new_instance['id_ad'] ) : 0;
		} else {
			$instance['id'] = ( ! empty( $new_instance['id_placement'] ) ) ? absint( $new_instance['id_placement'] ) : 0;
		}

		return $instance;
	}
}
