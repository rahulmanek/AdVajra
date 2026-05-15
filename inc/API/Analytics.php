<?php
/**
 * Analytics REST API Controller.
 * Serves static "Demo / Teaser" data for the free plugin dashboard.
 * The PRO plugin overrides these routes with actual tracking data.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

use WP_REST_Server;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Analytics
 */
class Analytics extends Controller {

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/dashboard/overview',
			[
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_overview' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/analytics',
			[
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_stats' ],
					'permission_callback' => [ $this, 'permissions_check' ],
					'args'                => [
						'preset'    => [ 'required' => false ],
						'start'     => [ 'required' => false ],
						'end'       => [ 'required' => false ],
						'dimension' => [ 'required' => false ],
						'compare'   => [ 'required' => false ],
					],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/analytics/summary',
			[
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_summary' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/analytics/trends',
			[
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'get_trends' ],
					'permission_callback' => [ $this, 'permissions_check' ],
				],
			]
		);
	}

	/**
	 * Check permissions.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return bool
	 */
	public function permissions_check( $request ) {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Get Overview payload (Demo Mode).
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_overview( $request ) {
		// Provide a static, highly optimistic payload to tease PRO features.
		$payload = [
			'state' => [
				'time_range' => 'last_7_days',
				'compare'    => true,
				'is_preview' => true,
			],
			'kpis' => [
				'ad_requests' => [
					'value' => 142500,
					'delta' => 12.5,
					'trend' => 'up',
				],
				'coverage' => [
					'value' => 0.98,
					'delta' => 0.02,
					'trend' => 'up',
				],
				'impressions' => [
					'value' => 139650,
					'delta' => 15.2,
					'trend' => 'up',
				],
				'ctr' => [
					'value' => 0.028, // 2.8%
					'delta' => 0.004,
					'trend' => 'up',
				],
				'impression_rpm' => [
					'value' => 2.45,
					'delta' => 0.15,
					'trend' => 'up',
				],
				'avg_viewable_time' => [
					'value' => 18.5,
					'delta' => 1.2,
					'trend' => 'up',
				],
			],
			'inventory_health' => [
				'summary' => 'Healthy',
				'score'   => 98,
				'rows'    => [
					[ 'type' => 'before_content', 'label' => 'Before Content', 'total' => 1, 'assigned' => 1, 'disabled' => 0, 'coverage' => 100 ],
				],
			],
			'switchboard' => [
				[ 'id' => 'pro_upsell_1', 'title' => 'Unlock Advanced Tracking', 'action_label' => 'Upgrade to PRO', 'action_target' => 'https://advajra.com/pricing?utm_source=advajra-plugin&utm_medium=plugin-upsell&utm_campaign=pricing&utm_content=overview-state-cta', 'primary' => true ],
			],
			'risk_queue' => [],
			'optimization_queue' => [],
			'activity_feed' => [],
			'advanced_optimization' => [],
		];

		return rest_ensure_response( $payload );
	}

	/**
	 * Get Summary for Dashboard (Demo Mode).
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_summary( $request ) {
		return new WP_REST_Response(
			[
				'total_impressions' => 125430,
				'total_clicks'      => 3512,
				'ctr'               => '2.80',
				'daily_data'        => $this->generate_demo_sparkline(),
				'is_preview'        => true,
			],
			200
		);
	}

	/**
	 * Get Stats (Demo Mode).
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_stats( $request ) {
		return new WP_REST_Response(
			[
				'is_preview'         => true,
				'selected_preset'    => 'last_7_days',
				'presets'            => [
					[ 'key' => 'last_7_days', 'label' => 'Last 7 Days' ],
				],
				'comparison_enabled' => true,
				'summary'            => [
					'impressions' => 125430,
					'clicks'      => 3512,
					'ctr'         => 2.80,
					'growth'      => [
						'impressions' => 15.2,
						'clicks'      => 22.4,
						'ctr'         => 0.45,
						'ctr_unit'    => 'points',
					],
				],
				'timeline'           => $this->generate_demo_sparkline(),
				'top_ads'            => [],
				'breakdowns'         => [
					'by_ad'        => [],
					'by_placement' => [],
					'top_movers'   => [
						'by_ad'        => [],
						'by_placement' => [],
					],
				],
				'comparison'         => null,
			],
			200
		);
	}

	/**
	 * Get Trends for multiple ads (Demo Mode).
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_trends( $request ) {
		return new WP_REST_Response( [], 200 );
	}

	/**
	 * Generate a beautiful fake sparkline for the demo UI.
	 *
	 * @return array
	 */
	private function generate_demo_sparkline() {
		$data = [];
		$base_impressions = 15000;
		$base_clicks = 400;
		
		for ( $i = 6; $i >= 0; $i-- ) {
			$date = gmdate( 'Y-m-d', strtotime( "-{$i} days" ) );
			// Create an upward trend with some random variance
			$trend_multiplier = 1 + ( ( 6 - $i ) * 0.05 ); 
			$variance = wp_rand( 90, 110 ) / 100;
			
			$data[] = [
				'date'        => $date,
				'impressions' => (int) ( $base_impressions * $trend_multiplier * $variance ),
				'clicks'      => (int) ( $base_clicks * $trend_multiplier * $variance ),
			];
		}
		
		return $data;
	}
}
