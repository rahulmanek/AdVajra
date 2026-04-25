<?php
/**
 * Ads REST Controller.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Ads
 */
class Ads extends Controller {

	/**
	 * REST Resource base.
	 *
	 * @var string
	 */
	protected $rest_base = 'ads';

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_items' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'create_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
				[
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => [ $this, 'update_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
				[
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'delete_item' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);
	}

	/**
	 * Get Items.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$args = [
			'post_type'      => 'advajra_ad',
			'posts_per_page' => -1,
			'post_status'    => 'any',
			'orderby'        => 'date',
			'order'          => 'DESC',
		];

		if ( $request->get_param( 'search' ) ) {
			$args['s'] = $request->get_param( 'search' );
		}

		$query = new \WP_Query( $args );
		$data  = [];

		foreach ( $query->posts as $post ) {
			$response = $this->prepare_item_for_response( $post, $request );
			$data[]   = $this->prepare_response_for_collection( $response );
		}

		return rest_ensure_response( $data );
	}

	/**
	 * Get Single Item.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_item( $request ) {
		$id   = $request->get_param( 'id' );
		$post = get_post( $id );

		if ( ! $post || ! in_array( $post->post_type, [ 'advajra_ad', 'advanced_ads' ], true ) ) {
			return new \WP_Error( 'rest_post_invalid_id', __( 'Invalid post ID.', 'advajra' ), [ 'status' => 404 ] );
		}

		return rest_ensure_response( $this->prepare_item_for_response( $post, $request ) );
	}

	/**
	 * Prepare item for response.
	 *
	 * @param \WP_Post         $item    Post object.
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function prepare_item_for_response( $item, $request ) {
		$type = get_post_meta( $item->ID, '_advajra_type', true );
		if ( ! $type && $item->post_type === 'advanced_ads' ) {
			$type = get_post_meta( $item->ID, 'advanced_ads_ad_type', true );
		}
		$type = \AdVajra\Core\AdTypes::normalize( $type );

		$image = get_post_meta( $item->ID, '_advajra_image', true );
		$stats = $this->get_ad_stats( $item->ID );

		$targeting = get_post_meta( $item->ID, '_advajra_targeting', true );
		if ( ! $targeting ) {
			$targeting = [
				'relation' => 'AND',
				'rules'    => [],
			];
		}

		$url          = get_post_meta( $item->ID, '_advajra_url', true );
		$open_new_tab = get_post_meta( $item->ID, '_advajra_open_new_tab', true );
		$alt_text     = get_post_meta( $item->ID, '_advajra_alt_text', true );
		$dimensions   = get_post_meta( $item->ID, '_advajra_dimensions', true );
		if ( ! $dimensions ) {
			$dimensions = [
				'width'  => '',
				'height' => '',
			];
		}

		$target = get_post_meta( $item->ID, '_advajra_target', true );
		if ( ! $target ) {
			$target = 'default';
		}

		$nofollow = get_post_meta( $item->ID, '_advajra_nofollow', true );
		if ( ! $nofollow ) {
			$nofollow = 'default';
		}
		$sponsored = get_post_meta( $item->ID, '_advajra_sponsored', true );
		if ( ! $sponsored ) {
			$sponsored = 'default';
		}
		$tracking = get_post_meta( $item->ID, '_advajra_tracking', true );
		if ( ! $tracking ) {
			$tracking = 'default';
		}

		$layout = get_post_meta( $item->ID, '_advajra_layout', true );
		if ( ! $layout ) {
			$layout = [
				'mode'    => 'default',
				'float'   => 'none',
				'align'   => 'center',
				'margin'  => [
					'top'    => '',
					'right'  => '',
					'bottom' => '',
					'left'   => '',
				],
				'padding' => [
					'top'    => '',
					'right'  => '',
					'bottom' => '',
					'left'   => '',
				],
			];
		}

		$start_date = get_post_meta( $item->ID, '_advajra_start_date', true );
		$end_date   = get_post_meta( $item->ID, '_advajra_end_date', true );

		$data = [
			'id'           => $item->ID,
			'title'        => [
				'raw'      => $item->post_title,
				'rendered' => get_the_title( $item ),
			],
			'status'       => $item->post_status,
			'type'         => $type,
			'content'      => $item->post_content,
			'image'        => $image ? $image : '',
			'url'          => $url,
			'target'       => $target,
			'open_new_tab' => $open_new_tab,
			'alt_text'     => $alt_text,
			'dimensions'   => $dimensions,
			'layout'       => $layout,
			'nofollow'     => $nofollow,
			'sponsored'    => $sponsored,
			'tracking'     => $tracking,
			'start_date'   => $start_date,
			'end_date'     => $end_date,
			'targeting'    => $targeting,
			'impressions'  => $stats['impressions'],
			'clicks'       => $stats['clicks'],
			'ctr'          => $stats['ctr'],
			'date'         => $item->post_date,
			'modified'     => $item->post_modified,
		];

		return rest_ensure_response( apply_filters( 'advajra_ad_response_data', $data, $item ) );
	}

	/**
	 * Get lifetime stats for an ad from advajra_stats table.
	 *
	 * @param int $ad_id Ad ID.
	 * @return array [ 'impressions' => int, 'clicks' => int, 'ctr' => float ]
	 */
	private function get_ad_stats( $ad_id ) {
		global $wpdb;
		$table_name = $wpdb->prefix . 'advajra_stats';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Ad stats are read from the plugin's aggregate custom table.
		$result = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					COALESCE(SUM(impressions), 0) as impressions,
					COALESCE(SUM(clicks), 0) as clicks
				FROM %i
				WHERE ad_id = %d",
				$table_name,
				$ad_id
			)
		);

		$impressions = (int) ( $result->impressions ?? 0 );
		$clicks      = (int) ( $result->clicks ?? 0 );
		$ctr         = $impressions > 0 ? round( ( $clicks / $impressions ) * 100, 2 ) : 0;

		return [
			'impressions' => $impressions,
			'clicks'      => $clicks,
			'ctr'         => $ctr,
		];
	}

	/**
	 * Create item.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_item( $request ) {
		$title     = $request->get_param( 'title' );
		$content   = $request->get_param( 'content' );
		$status    = $request->get_param( 'status' );
		$type      = $request->get_param( 'type' );
		$image     = $request->get_param( 'image' );
		$targeting = $request->get_param( 'targeting' );

		// Settings
		$url          = $request->get_param( 'url' );
		$target       = $request->get_param( 'target' );
		$open_new_tab = $request->get_param( 'open_new_tab' );
		$alt_text     = $request->get_param( 'alt_text' );
		$nofollow     = $request->get_param( 'nofollow' );
		$sponsored    = $request->get_param( 'sponsored' );
		$tracking     = $request->get_param( 'tracking' );
		$dimensions   = $request->get_param( 'dimensions' );
		$layout       = $request->get_param( 'layout' );
		$start_date   = $request->get_param( 'start_date' );
		$end_date     = $request->get_param( 'end_date' );

		if ( empty( $title ) ) {
			$title = 'Untitled Ad';
		}

		// Server-side validation: ensure submitted type is known.
		if ( $type ) {
			$type = sanitize_text_field( $type );
			if ( class_exists( '\\AdVajra\\Core\\AdTypes' ) ) {
				$available = array_keys( \AdVajra\Core\AdTypes::get_types() );
				if ( ! in_array( $type, $available, true ) ) {
					return new \WP_Error( 'invalid_ad_type', __( 'Invalid ad type.', 'advajra' ), [ 'status' => 400 ] );
				}
			}
		}

		$id = wp_insert_post(
			[
				'post_title'   => $title,
				'post_content' => $content,
				'post_type'    => 'advajra_ad',
				'post_status'  => $status ? $status : 'draft',
				'post_date'    => $start_date ? $start_date : current_time( 'mysql' ),
			]
		);

		if ( $type ) {
			update_post_meta( $id, '_advajra_type', sanitize_text_field( $type ) );
		}
		if ( $image ) {
			update_post_meta( $id, '_advajra_image', $image );
		}
		if ( $targeting ) {
			update_post_meta( $id, '_advajra_targeting', $targeting );
		}

		update_post_meta( $id, '_advajra_url', $url );
		if ( $target ) {
			update_post_meta( $id, '_advajra_target', sanitize_text_field( $target ) );
		}
		update_post_meta( $id, '_advajra_open_new_tab', $open_new_tab );
		update_post_meta( $id, '_advajra_alt_text', $alt_text );
		if ( $nofollow ) {
			update_post_meta( $id, '_advajra_nofollow', sanitize_text_field( $nofollow ) );
		}
		if ( $sponsored ) {
			update_post_meta( $id, '_advajra_sponsored', sanitize_text_field( $sponsored ) );
		}
		if ( $tracking ) {
			update_post_meta( $id, '_advajra_tracking', sanitize_text_field( $tracking ) );
		}
		if ( is_array( $dimensions ) ) {
			update_post_meta( $id, '_advajra_dimensions', $dimensions );
		}
		if ( is_array( $layout ) ) {
			$mode = $layout['mode'] ?? 'default';
			if ( 'default' === $mode ) {
				unset( $layout['align'] );
			}
			unset( $layout['float'] );
			update_post_meta( $id, '_advajra_layout', $layout );
		}
		if ( $start_date ) {
			update_post_meta( $id, '_advajra_start_date', $start_date );
		}
		if ( $end_date ) {
			update_post_meta( $id, '_advajra_end_date', $end_date );
			$this->schedule_ad_expiration( $id, $end_date );
		}
		do_action( 'advajra_ad_saved', $id, $request );
		\AdVajra\Utils\AuditLog::log(
			'ad_created',
			'ad',
			$id,
			sprintf(
				/* translators: %s: ad title */
				__( 'Created ad: %s', 'advajra' ),
				get_the_title( $id )
			),
			[
				'status' => get_post_status( $id ),
			]
		);

		return rest_ensure_response( $this->prepare_item_for_response( get_post( $id ), $request ) );
	}

	/**
	 * Update item.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( $request ) {
		$id   = $request->get_param( 'id' );
		$post = get_post( $id );
		if ( ! $post ) {
			return new \WP_Error( 'invalid_id', 'Ad not found', [ 'status' => 404 ] );
		}

		$title     = $request->get_param( 'title' );
		$content   = $request->get_param( 'content' );
		$status    = $request->get_param( 'status' );
		$type      = $request->get_param( 'type' );
		$image     = $request->get_param( 'image' );
		$targeting = $request->get_param( 'targeting' );

		// Settings
		$url          = $request->get_param( 'url' );
		$target       = $request->get_param( 'target' );
		$open_new_tab = $request->get_param( 'open_new_tab' );
		$alt_text     = $request->get_param( 'alt_text' );
		$nofollow     = $request->get_param( 'nofollow' );
		$sponsored    = $request->get_param( 'sponsored' );
		$tracking     = $request->get_param( 'tracking' );
		$dimensions   = $request->get_param( 'dimensions' );
		$layout       = $request->get_param( 'layout' );
		$start_date   = $request->get_param( 'start_date' );
		$end_date     = $request->get_param( 'end_date' );

		$update_args = [ 'ID' => $id ];
		if ( null !== $title ) {
			$update_args['post_title'] = $title;
		}
		if ( null !== $content ) {
			$update_args['post_content'] = $content;
		}
		if ( null !== $status ) {
			$update_args['post_status'] = $status;
		}
		if ( null !== $start_date ) {
			$update_args['post_date'] = $start_date;
		}

		wp_update_post( $update_args );

		if ( null !== $type ) {
			// Server-side validation + sanitization for ad type
			$type = sanitize_text_field( $type );
			if ( class_exists( '\\AdVajra\\Core\\AdTypes' ) ) {
				$available = array_keys( \AdVajra\Core\AdTypes::get_types() );
				if ( ! in_array( $type, $available, true ) ) {
					return new \WP_Error( 'invalid_ad_type', __( 'Invalid ad type.', 'advajra' ), [ 'status' => 400 ] );
				}
			}
			update_post_meta( $id, '_advajra_type', $type );
		}
		if ( null !== $image ) {
			update_post_meta( $id, '_advajra_image', $image );
		}
		if ( null !== $targeting ) {
			update_post_meta( $id, '_advajra_targeting', $targeting );
		}

		if ( null !== $url ) {
			update_post_meta( $id, '_advajra_url', $url );
		}
		if ( null !== $target ) {
			update_post_meta( $id, '_advajra_target', sanitize_text_field( $target ) );
		}
		if ( null !== $open_new_tab ) {
			update_post_meta( $id, '_advajra_open_new_tab', $open_new_tab );
		}
		if ( null !== $alt_text ) {
			update_post_meta( $id, '_advajra_alt_text', $alt_text );
		}
		if ( null !== $nofollow ) {
			update_post_meta( $id, '_advajra_nofollow', sanitize_text_field( $nofollow ) );
		}
		if ( null !== $sponsored ) {
			update_post_meta( $id, '_advajra_sponsored', sanitize_text_field( $sponsored ) );
		}
		if ( null !== $tracking ) {
			update_post_meta( $id, '_advajra_tracking', sanitize_text_field( $tracking ) );
		}
		if ( null !== $dimensions && is_array( $dimensions ) ) {
			update_post_meta( $id, '_advajra_dimensions', $dimensions );
		}
		if ( null !== $layout && is_array( $layout ) ) {
			$mode = $layout['mode'] ?? 'default';
			if ( 'default' === $mode ) {
				unset( $layout['align'] );
			}
			unset( $layout['float'] );
			update_post_meta( $id, '_advajra_layout', $layout );
		}
		if ( null !== $start_date ) {
			update_post_meta( $id, '_advajra_start_date', $start_date );
		}
		if ( null !== $end_date ) {
			update_post_meta( $id, '_advajra_end_date', $end_date );
			$this->schedule_ad_expiration( $id, $end_date );
		}
		do_action( 'advajra_ad_saved', $id, $request );
		\AdVajra\Utils\AuditLog::log(
			'ad_updated',
			'ad',
			$id,
			sprintf(
				/* translators: %s: ad title */
				__( 'Updated ad: %s', 'advajra' ),
				get_the_title( $id )
			),
			[
				'status' => get_post_status( $id ),
			]
		);

		return rest_ensure_response( $this->prepare_item_for_response( get_post( $id ), $request ) );
	}

	/**
	 * Delete Item
	 */
	public function delete_item( $request ) {
		$id    = $request->get_param( 'id' );
		$title = get_the_title( $id );

		wp_trash_post( $id );
		\AdVajra\Utils\AuditLog::log(
			'ad_deleted',
			'ad',
			$id,
			sprintf(
				/* translators: %s: ad title */
				__( 'Deleted ad: %s', 'advajra' ),
				$title ? $title : '#' . absint( $id )
			)
		);
		return new \WP_REST_Response( [ 'deleted' => true ], 200 );
	}
	/**
	 * Helper: Schedule ad expiration handling timezone.
	 *
	 * @param int    $ad_id    Ad ID.
	 * @param string $end_date End date string (Local Time).
	 */
	private function schedule_ad_expiration( $ad_id, $end_date ) {
		$tz_string = get_option( 'timezone_string' );

		if ( ! $tz_string ) {
			$offset    = get_option( 'gmt_offset' );
			$tz_string = timezone_name_from_abbr( '', (int) ( $offset * 3600 ), 0 );
		}

		if ( ! $tz_string ) {
			$tz_string = 'UTC';
		}

		try {
			$date_obj  = new \DateTime( $end_date, new \DateTimeZone( $tz_string ) );
			$timestamp = (int) $date_obj->format( 'U' );
			\AdVajra\Core\Cron::schedule_expiration( $ad_id, $timestamp );
		} catch ( \Exception $e ) {
			\AdVajra\Core\Cron::schedule_expiration( $ad_id, strtotime( $end_date ) );
		}
	}
}
