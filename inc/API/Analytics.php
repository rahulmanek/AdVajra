<?php
/**
 * Analytics REST API Controller.
 * Serves aggregated data for the dashboard.
 *
 * @package AdVajra\API
 */

namespace AdVajra\API;

use AdVajra\Core\AnalyticsAccess;
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
	 * Build analytics access context (trial + retention + lock state).
	 *
	 * @return array
	 */
	private function get_access_context() {
		return AnalyticsAccess::get_access_context();
	}

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
	 * Get Overview command center payload.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_overview( $request ) {
		// Pre-release unification:
		// use one canonical Overview payload on the original route.
		return $this->get_overview_v2( $request );
		// @phpstan-ignore-next-line Legacy overview block kept temporarily during route consolidation.
		$access = $this->get_access_context();

		$ads = get_posts(
			[
				'post_type'      => 'advajra_ad',
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'orderby'        => 'modified',
				'order'          => 'DESC',
			]
		);

		$placements = $wpdb->get_results( "SELECT * FROM {$placements_table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placements table name is internal and trusted.
		$settings   = get_option( 'advajra_settings', [] );

		$total_ads   = count( $ads );
		$active_ads  = count(
			array_filter(
				$ads,
				function ( $ad ) {
					return 'publish' === $ad->post_status;
				}
			)
		);
		$draft_ads   = count(
			array_filter(
				$ads,
				function ( $ad ) {
					return 'draft' === $ad->post_status;
				}
			)
		);
		$latest_ad   = $ads[0] ?? null;
		$total_place = count( $placements );

		$assigned_count            = 0;
		$shortcode_count           = 0;
		$shortcode_assigned        = 0;
		$disabled_high_value_count = 0;
		$latest_placement          = null;

		foreach ( $placements as $placement ) {
			$type_slug   = \AdVajra\Model\Placement::id_to_type( (int) $placement->type );
			$status_slug = \AdVajra\Model\Placement::id_to_status( (int) $placement->status );

			if ( ! empty( $placement->item_id ) ) {
				++$assigned_count;
			}

			if ( 'shortcode' === $type_slug ) {
				++$shortcode_count;
				if ( ! empty( $placement->item_id ) ) {
					++$shortcode_assigned;
				}
			}

			if ( in_array( $type_slug, [ 'before_content', 'after_content', 'header', 'footer' ], true ) && 'disabled' === $status_slug ) {
				++$disabled_high_value_count;
			}

			if ( null === $latest_placement || strtotime( $placement->updated_at ) > strtotime( $latest_placement->updated_at ) ) {
				$latest_placement = $placement;
			}
		}

		$fill_rate = $total_place > 0 ? round( ( $assigned_count / $total_place ) * 100 ) : 0;

		$active_modules = get_option( 'advajra_active_modules', [] );
		$all_modules    = [];
		$module_manager = new \AdVajra\Core\Modules\ModuleManager();
		$module_manager->init();
		foreach ( $module_manager->get_frontend_data() as $module ) {
			$all_modules[ $module['id'] ] = $module;
		}

		$total_impressions = 0;
		$total_clicks      = 0;
		$pulse_ctr         = 0;
		$pulse             = [];

		if ( ! $access['is_locked'] ) {
			$days        = 7;
			$end_date    = current_time( 'Y-m-d' );
			$start_date  = ( new \DateTimeImmutable( $end_date, wp_timezone() ) )->modify( "-{$days} days" )->format( 'Y-m-d' );
			$pulse_query = $wpdb->get_results(
				// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats table name is built from the trusted WordPress prefix.
				$wpdb->prepare(
					"SELECT date, SUM(impressions) as impressions, SUM(clicks) as clicks
					FROM $stats_table
					WHERE date >= %s AND date <= %s
					GROUP BY date
					ORDER BY date ASC",
					$start_date,
					$end_date
				)
				// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			);
			$pulse = $this->fill_dates( $pulse_query, $start_date, $end_date );

			foreach ( $pulse as $point ) {
				$total_impressions += (int) $point['impressions'];
				$total_clicks      += (int) $point['clicks'];
			}

			$pulse_ctr = $total_impressions > 0 ? round( ( $total_clicks / $total_impressions ) * 100, 2 ) : 0;
		}

		$priorities = [
			[
				'id'            => 'unassigned_placements',
				'title'         => 'Unassigned placements',
				'value'         => max( 0, $total_place - $assigned_count ),
				'status'        => ( $total_place - $assigned_count ) > 0 ? 'warning' : 'ok',
				'severity'      => ( $total_place - $assigned_count ) > 0 ? 'medium' : 'low',
				'action_label'  => 'Assign now',
				'action_target' => '/placements',
				'pro'           => false,
			],
			[
				'id'            => 'draft_ads',
				'title'         => 'Draft ads pending publish',
				'value'         => $draft_ads,
				'status'        => $draft_ads > 0 ? 'warning' : 'ok',
				'severity'      => $draft_ads > 0 ? 'medium' : 'low',
				'action_label'  => 'Review drafts',
				'action_target' => '/ads',
				'pro'           => false,
			],
			[
				'id'            => 'disabled_high_value',
				'title'         => 'Disabled high-value placements',
				'value'         => $disabled_high_value_count,
				'status'        => $disabled_high_value_count > 0 ? 'warning' : 'ok',
				'severity'      => $disabled_high_value_count > 0 ? 'high' : 'low',
				'action_label'  => 'Re-enable',
				'action_target' => '/placements',
				'pro'           => false,
			],
			[
				'id'            => 'modules_needing_setup',
				'title'         => 'Modules needing setup',
				'value'         => count( $all_modules ) - count( $active_modules ),
				'status'        => ( count( $all_modules ) - count( $active_modules ) ) > 0 ? 'attention' : 'ok',
				'severity'      => ( count( $all_modules ) - count( $active_modules ) ) > 1 ? 'medium' : 'low',
				'action_label'  => 'Open settings',
				'action_target' => '/settings',
				'pro'           => false,
			],
		];

		$health_checks = [
			[
				'id'            => 'placement_fill',
				'title'         => 'Placement fill quality',
				'value'         => $fill_rate . '%',
				'status'        => $fill_rate >= 75 ? 'healthy' : ( $fill_rate >= 40 ? 'watch' : 'critical' ),
				'severity'      => $fill_rate >= 75 ? 'low' : 'high',
				'action_label'  => 'Improve fill',
				'action_target' => '/placements',
				'pro'           => false,
			],
			[
				'id'            => 'bot_protection',
				'title'         => 'Bot protection',
				'value'         => ! empty( $settings['hide_from_bots'] ) ? 'On' : 'Off',
				'status'        => ! empty( $settings['hide_from_bots'] ) ? 'healthy' : 'watch',
				'severity'      => ! empty( $settings['hide_from_bots'] ) ? 'low' : 'medium',
				'action_label'  => 'Tune setting',
				'action_target' => '/settings',
				'pro'           => false,
			],
			[
				'id'            => 'ip_blocking',
				'title'         => 'IP block list',
				'value'         => count( $settings['blocked_ips'] ?? [] ) . ' blocked',
				'status'        => ! empty( $settings['blocked_ips'] ) ? 'healthy' : 'watch',
				'severity'      => ! empty( $settings['blocked_ips'] ) ? 'low' : 'medium',
				'action_label'  => 'Manage list',
				'action_target' => '/settings/ip_blocker',
				'pro'           => false,
			],
			[
				'id'            => 'shortcode_readiness',
				'title'         => 'Manual shortcode readiness',
				'value'         => "{$shortcode_assigned}/{$shortcode_count} assigned",
				'status'        => $shortcode_count > 0 && $shortcode_assigned === $shortcode_count ? 'healthy' : 'watch',
				'severity'      => $shortcode_count > 0 && $shortcode_assigned === $shortcode_count ? 'low' : 'medium',
				'action_label'  => 'Review manual placements',
				'action_target' => '/placements',
				'pro'           => false,
			],
		];

		$quick_actions = [
			[
				'id'            => 'create_ad',
				'title'         => 'Create ad',
				'description'   => 'Launch a new campaign',
				'action_label'  => 'New ad',
				'action_target' => '/ads/new',
				'pro'           => false,
			],
			[
				'id'            => 'create_placement',
				'title'         => 'Create placement',
				'description'   => 'Add a new delivery slot',
				'action_label'  => 'New placement',
				'action_target' => '/placements/new',
				'pro'           => false,
			],
			[
				'id'            => 'resume_last',
				'title'         => 'Resume last edited ad',
				'description'   => $latest_ad ? $latest_ad->post_title : 'No ad edited yet',
				'action_label'  => $latest_ad ? 'Open ad' : 'Go to ads',
				'action_target' => $latest_ad ? '/ads/' . $latest_ad->ID : '/ads',
				'pro'           => false,
			],
			[
				'id'            => 'jump_settings',
				'title'         => 'Jump to settings',
				'description'   => 'Tune modules and defaults',
				'action_label'  => 'Open settings',
				'action_target' => '/settings',
				'pro'           => false,
			],
		];

		$opportunities = [
			[
				'id'            => 'expand_manual_slots',
				'title'         => 'Expand manual inventory',
				'value'         => $shortcode_count,
				'status'        => $shortcode_count > 0 ? 'active' : 'new',
				'severity'      => $shortcode_count > 0 ? 'low' : 'medium',
				'action_label'  => 'Add manual placement',
				'action_target' => '/placements/new',
				'pro'           => false,
			],
			[
				'id'            => 'activate_group_rotation',
				'title'         => 'Use ad groups for rotation',
				'value'         => in_array( 'ad_groups', $active_modules, true ) ? 'Enabled' : 'Available',
				'status'        => in_array( 'ad_groups', $active_modules, true ) ? 'active' : 'watch',
				'severity'      => 'low',
				'action_label'  => in_array( 'ad_groups', $active_modules, true ) ? 'Manage groups' : 'Enable module',
				'action_target' => in_array( 'ad_groups', $active_modules, true ) ? '/groups' : '/settings',
				'pro'           => false,
			],
			[
				'id'            => 'protection_upgrade',
				'title'         => 'Recover blocked or fraudulent traffic',
				'value'         => 'PRO',
				'status'        => 'pro',
				'severity'      => 'medium',
				'action_label'  => 'Upgrade to PRO',
				'action_target' => 'https://advajra.com/pricing',
				'pro'           => true,
			],
		];

		$overview_data = [
			'health'        => $health_checks,
			'priorities'    => $priorities,
			'quickActions'  => $quick_actions,
			'opportunities' => $opportunities,
			'pulse'         => [
				'impressions' => $total_impressions,
				'clicks'      => $total_clicks,
				'ctr'         => number_format( $pulse_ctr, 2 ),
				'timeline'    => $pulse,
				'locked'      => $access['is_locked'],
				'upgrade_url' => 'https://advajra.com/pricing',
			],
			'meta'          => [
				'totalAds'           => $total_ads,
				'activeAds'          => $active_ads,
				'totalPlacements'    => $total_place,
				'assignedPlacements' => $assigned_count,
				'latestPlacementId'  => $latest_placement ? (int) $latest_placement->id : 0,
			],
			'retention'     => $access['retention'],
			'trial'         => $access['trial'],
			'locked'        => $access['is_locked'],
		];

		return rest_ensure_response( apply_filters( 'advajra_dashboard_overview_payload', $overview_data ) );
	}

	/**
	 * Get Overview V2 payload (ops-first command deck).
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_overview_v2( $request ) {
		global $wpdb;

		$stats_table    = $wpdb->prefix . 'advajra_stats';
		$settings       = get_option( 'advajra_settings', [] );
		$access         = $this->get_access_context();
		$placements     = \AdVajra\Model\Placement::get_all();
		$active_modules = get_option( 'advajra_active_modules', [] );

		$end_date   = current_time( 'Y-m-d' );
		$start_date = ( new \DateTimeImmutable( $end_date, wp_timezone() ) )->modify( '-6 days' )->format( 'Y-m-d' );

		$totals = $wpdb->get_row(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats table name is built from the trusted WordPress prefix.
			$wpdb->prepare(
				"SELECT
					COALESCE(SUM(ad_requests),0) AS ad_requests,
					COALESCE(SUM(matched_requests),0) AS matched_requests,
					COALESCE(SUM(impressions),0) AS impressions,
					COALESCE(SUM(clicks),0) AS clicks,
					COALESCE(SUM(viewable_impressions),0) AS viewable_impressions,
					COALESCE(SUM(revenue_micros),0) AS revenue_micros,
					COALESCE(SUM(load_time_ms_sum),0) AS load_time_ms_sum,
					COALESCE(SUM(load_samples),0) AS load_samples,
					COALESCE(SUM(viewable_time_ms_sum),0) AS viewable_time_ms_sum,
					COALESCE(SUM(viewable_samples),0) AS viewable_samples
				FROM {$stats_table}
				WHERE date >= %s AND date <= %s",
				$start_date,
				$end_date
			),
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ARRAY_A
		);

		$ad_requests          = (int) ( $totals['ad_requests'] ?? 0 );
		$matched_requests     = (int) ( $totals['matched_requests'] ?? 0 );
		$impressions          = (int) ( $totals['impressions'] ?? 0 );
		$clicks               = (int) ( $totals['clicks'] ?? 0 );
		$revenue_micros       = (int) ( $totals['revenue_micros'] ?? 0 );
		$load_time_ms_sum     = (int) ( $totals['load_time_ms_sum'] ?? 0 );
		$load_samples         = (int) ( $totals['load_samples'] ?? 0 );
		$viewable_time_ms_sum = (int) ( $totals['viewable_time_ms_sum'] ?? 0 );
		$viewable_samples     = (int) ( $totals['viewable_samples'] ?? 0 );

		$coverage             = $this->safe_ratio( $matched_requests, $ad_requests, 4 );
		$ctr                  = $this->safe_ratio( $clicks, $impressions, 4 );
		$avg_load_time_ms     = $load_samples > 0 ? round( $load_time_ms_sum / $load_samples, 1 ) : 0;
		$avg_viewable_time_ms = $viewable_samples > 0 ? round( $viewable_time_ms_sum / $viewable_samples, 1 ) : 0;
		$avg_viewable_time_s  = round( $avg_viewable_time_ms / 1000, 2 );

		$revenue_connected = (bool) apply_filters( 'advajra_revenue_connected', ! empty( $settings['revenue_connected'] ) );
		if ( ! $revenue_connected && $revenue_micros > 0 ) {
			$revenue_connected = true;
		}
		$impression_rpm = $revenue_connected && $impressions > 0
			? round( ( ( $revenue_micros / 1000000 ) / $impressions ) * 1000, 2 )
			: null;

		$type_labels = [
			'header'          => 'Header',
			'before_content'  => 'Before Content',
			'after_content'   => 'After Content',
			'after_paragraph' => 'After Paragraph',
			'shortcode'       => 'Manual Supply',
			'footer'          => 'Footer',
		];

		$inventory_rows = [];
		foreach ( $type_labels as $type => $label ) {
			$inventory_rows[ $type ] = [
				'type'     => $type,
				'label'    => $label,
				'total'    => 0,
				'assigned' => 0,
				'disabled' => 0,
				'coverage' => 0,
			];
		}

		$total_placements             = 0;
		$total_assigned               = 0;
		$shortcode_total              = 0;
		$shortcode_assigned           = 0;
		$suppressed_premium_inventory = 0;

		foreach ( $placements as $placement ) {
			$type = ! empty( $placement->type ) && isset( $inventory_rows[ $placement->type ] ) ? $placement->type : 'before_content';
			++$inventory_rows[ $type ]['total'];
			++$total_placements;

			if ( ! empty( $placement->item_id ) ) {
				++$inventory_rows[ $type ]['assigned'];
				++$total_assigned;
			}

			if ( 'disabled' === $placement->status ) {
				++$inventory_rows[ $type ]['disabled'];
			}

			if ( 'shortcode' === $type ) {
				++$shortcode_total;
				if ( ! empty( $placement->item_id ) ) {
					++$shortcode_assigned;
				}
			}

			if ( in_array( $type, [ 'header', 'before_content', 'after_content', 'footer' ], true ) && 'disabled' === $placement->status ) {
				++$suppressed_premium_inventory;
			}
		}

		foreach ( $inventory_rows as $type => $row ) {
			$inventory_rows[ $type ]['coverage'] = $row['total'] > 0 ? round( ( $row['assigned'] / $row['total'] ) * 100, 1 ) : 0;
		}

		$unassigned_placements     = max( 0, $total_placements - $total_assigned );
		$module_needs_attention    = [];
		$tracking_enabled          = ! isset( $settings['analytics_enabled'] ) || false !== $settings['analytics_enabled'];
		$ad_system_enabled         = empty( $settings['disable_all_ads'] );
		$bot_protection_enabled    = ! empty( $settings['hide_from_bots'] );
		$ip_blocker_module_enabled = in_array( 'ip_blocker', $active_modules, true );
		$blocked_ips               = isset( $settings['blocked_ips'] ) && is_array( $settings['blocked_ips'] ) ? $settings['blocked_ips'] : [];
		$blocked_ip_count          = count( $blocked_ips );
		$ad_groups_enabled         = in_array( 'ad_groups', $active_modules, true );

		if ( ! $ad_system_enabled ) {
			$module_needs_attention[] = __( 'Ad System is OFF', 'advajra' );
		}
		if ( ! $tracking_enabled ) {
			$module_needs_attention[] = __( 'Tracking is OFF', 'advajra' );
		}
		if ( ! $bot_protection_enabled ) {
			$module_needs_attention[] = __( 'Bot Protection is OFF', 'advajra' );
		}

		$module_action_target = '/settings';
		$module_action_label  = 'Open Settings';
		if ( ! $tracking_enabled ) {
			$module_action_target = '/settings/analytics';
			$module_action_label  = 'Open Analytics Settings';
		}
		if ( ! $bot_protection_enabled ) {
			$module_action_target = '/settings/protection';
			$module_action_label  = 'Open Protection Settings';
		}

		$risk_queue = [];

		if ( $ad_requests > 0 && $coverage < 0.9 ) {
			$risk_queue[] = [
				'id'            => 'underdelivery_risk',
				'entity_key'    => 'delivery:coverage',
				'title'         => 'Underdelivery Risk',
				'description'   => sprintf( 'Coverage is %s%% over the last 7 days.', number_format_i18n( $coverage * 100, 1 ) ),
				'severity'      => $coverage < 0.6 ? 'critical' : ( $coverage < 0.8 ? 'high' : 'medium' ),
				'impact_score'  => (int) round( ( 1 - $coverage ) * 100 ),
				'action_label'  => 'Review Inventory',
				'action_target' => '/placements',
			];
		}

		if ( $unassigned_placements > 0 ) {
			$risk_queue[] = [
				'id'            => 'unfilled_inventory',
				'entity_key'    => 'inventory:unassigned',
				'title'         => 'Unfilled Inventory',
				'description'   => sprintf( '%d placements have no ad or group assigned.', $unassigned_placements ),
				'severity'      => $unassigned_placements >= 4 ? 'high' : 'medium',
				'impact_score'  => min( 100, $unassigned_placements * 15 ),
				'action_label'  => 'Assign Placements',
				'action_target' => '/placements',
			];
		}

		if ( $suppressed_premium_inventory > 0 ) {
			$risk_queue[] = [
				'id'            => 'suppressed_premium_inventory',
				'entity_key'    => 'inventory:premium_disabled',
				'title'         => 'Disabled High-Value Placements',
				'description'   => sprintf( '%d high-visibility placements are disabled.', $suppressed_premium_inventory ),
				'severity'      => $suppressed_premium_inventory >= 2 ? 'high' : 'medium',
				'impact_score'  => min( 100, $suppressed_premium_inventory * 20 ),
				'action_label'  => 'Re-enable Placements',
				'action_target' => '/placements',
			];
		}

		if ( ! empty( $module_needs_attention ) ) {
			$risk_queue[] = [
				'id'            => 'module_misconfig',
				'entity_key'    => 'system:module_config',
				'title'         => 'Module Misconfiguration',
				'description'   => implode( ' · ', $module_needs_attention ),
				'severity'      => 'medium',
				'impact_score'  => 55,
				'action_label'  => $module_action_label,
				'action_target' => $module_action_target,
			];
		}

		if ( $shortcode_total > 0 && $shortcode_assigned < $shortcode_total ) {
			$risk_queue[] = [
				'id'            => 'manual_supply_readiness',
				'entity_key'    => 'inventory:manual_supply',
				'title'         => 'Manual Placement Setup',
				'description'   => sprintf( '%d of %d manual slots are assigned.', $shortcode_assigned, $shortcode_total ),
				'severity'      => 'medium',
				'impact_score'  => 40,
				'action_label'  => 'Fix Manual Placements',
				'action_target' => '/placements',
			];
		}

		if ( ! $bot_protection_enabled ) {
			$risk_queue[] = [
				'id'            => 'policy_risk',
				'entity_key'    => 'policy:traffic_quality',
				'title'         => 'Protection Setup Needed',
				'description'   => 'Bot Protection is currently off and should be enabled to reduce invalid traffic.',
				'severity'      => 'medium',
				'impact_score'  => 35,
				'action_label'  => 'Enable Bot Protection',
				'action_target' => '/settings/protection',
			];
		}

		usort(
			$risk_queue,
			function ( $a, $b ) {
				$severity_rank = [
					'critical' => 0,
					'high'     => 1,
					'medium'   => 2,
					'low'      => 3,
				];
				$a_rank        = $severity_rank[ $a['severity'] ] ?? 9;
				$b_rank        = $severity_rank[ $b['severity'] ] ?? 9;

				if ( $a_rank === $b_rank ) {
					return (int) $b['impact_score'] <=> (int) $a['impact_score'];
				}

				return $a_rank <=> $b_rank;
			}
		);

		$risk_queue = $this->dedupe_entities( array_slice( $risk_queue, 0, 5 ) );

		$optimization_queue = [];
		$daily_rows         = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats table name is built from the trusted WordPress prefix.
			$wpdb->prepare(
				"SELECT date, SUM(impressions) AS impressions
				FROM {$stats_table}
				WHERE date >= %s AND date <= %s
				GROUP BY date
				ORDER BY date DESC
				LIMIT 2",
				$start_date,
				$end_date
			),
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ARRAY_A
		);

		if ( count( $daily_rows ) >= 2 ) {
			$latest = (int) $daily_rows[0]['impressions'];
			$prior  = (int) $daily_rows[1]['impressions'];

			if ( $prior > 0 && $latest < $prior ) {
				$drop_pct             = round( ( ( $prior - $latest ) / $prior ) * 100, 1 );
				$optimization_queue[] = [
					'id'            => 'top_movers_downtrend',
					'entity_key'    => 'performance:impressions',
					'title'         => 'Top Movers Downtrend',
					'description'   => sprintf( 'Impressions dropped %s%% day-over-day.', number_format_i18n( $drop_pct, 1 ) ),
					'upside_score'  => min( 100, (int) round( $drop_pct ) + 20 ),
					'action_label'  => 'Open Analytics',
					'action_target' => '/analytics',
				];
			}
		}

		$low_ctr_ads = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats and posts table names are internal and trusted.
			$wpdb->prepare(
				"SELECT s.ad_id, COALESCE(p.post_title, '') AS title, SUM(s.impressions) AS impressions, SUM(s.clicks) AS clicks
				FROM {$stats_table} s
				LEFT JOIN {$wpdb->posts} p ON s.ad_id = p.ID
				WHERE s.date >= %s AND s.date <= %s
				GROUP BY s.ad_id
				HAVING impressions >= 100
				ORDER BY impressions DESC
				LIMIT 20",
				$start_date,
				$end_date
			),
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ARRAY_A
		);

		$low_ctr_count = 0;
		foreach ( $low_ctr_ads as $ad_row ) {
			$ad_impressions = (int) $ad_row['impressions'];
			$ad_clicks      = (int) $ad_row['clicks'];
			$ad_ctr         = $this->safe_ratio( $ad_clicks, $ad_impressions, 4 );
			if ( $ad_impressions >= 250 && $ad_ctr < 0.01 ) {
				++$low_ctr_count;
			}
		}
		if ( $low_ctr_count > 0 ) {
			$optimization_queue[] = [
				'id'            => 'low_ctr_high_impression_ads',
				'entity_key'    => 'ads:low_ctr',
				'title'         => 'Low-CTR High-Impression Ads',
				'description'   => sprintf( '%d ads are underperforming on CTR with high volume.', $low_ctr_count ),
				'upside_score'  => min( 100, $low_ctr_count * 18 ),
				'action_label'  => 'Tune Ad Creatives',
				'action_target' => '/ads',
			];
		}

		$ad_latency_rows = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats table name is built from the trusted WordPress prefix.
			$wpdb->prepare(
				"SELECT ad_id, SUM(load_time_ms_sum) AS load_sum, SUM(load_samples) AS samples
				FROM {$stats_table}
				WHERE date >= %s AND date <= %s
				GROUP BY ad_id",
				$start_date,
				$end_date
			),
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ARRAY_A
		);

		$latency_by_ad = [];
		foreach ( $ad_latency_rows as $latency_row ) {
			$samples = (int) $latency_row['samples'];
			if ( $samples <= 0 ) {
				continue;
			}
			$latency_by_ad[ (int) $latency_row['ad_id'] ] = (int) round( (int) $latency_row['load_sum'] / $samples );
		}

		$slow_placements = 0;
		foreach ( $placements as $placement ) {
			if ( 'ad' !== ( $placement->item_type ?? 'ad' ) || empty( $placement->item_id ) ) {
				continue;
			}

			$placement_ad_id = (int) $placement->item_id;
			if ( ! isset( $latency_by_ad[ $placement_ad_id ] ) ) {
				continue;
			}

			if ( $latency_by_ad[ $placement_ad_id ] > 1200 ) {
				++$slow_placements;
			}
		}

		if ( $slow_placements > 0 ) {
			$optimization_queue[] = [
				'id'            => 'high_latency_placements',
				'entity_key'    => 'placements:latency',
				'title'         => 'High-Latency Placements',
				'description'   => sprintf( '%d placements are loading slower than 1.2s.', $slow_placements ),
				'upside_score'  => min( 100, $slow_placements * 16 ),
				'action_label'  => 'Review Placements',
				'action_target' => '/placements',
			];
		}

		$risk_entity_keys = array_values(
			array_filter(
				array_map(
					function ( $item ) {
						return $item['entity_key'] ?? '';
					},
					$risk_queue
				)
			)
		);

		$optimization_queue = array_values(
			array_filter(
				$this->dedupe_entities( $optimization_queue ),
				function ( $item ) use ( $risk_entity_keys ) {
					return empty( $item['entity_key'] ) || ! in_array( $item['entity_key'], $risk_entity_keys, true );
				}
			)
		);

		usort(
			$optimization_queue,
			function ( $a, $b ) {
				return (int) $b['upside_score'] <=> (int) $a['upside_score'];
			}
		);

		$switchboard = [
			[
				'id'            => 'ad_system',
				'label'         => 'Ad System',
				'description'   => 'Master on/off for ad rendering.',
				'enabled'       => (bool) $ad_system_enabled,
				'editable'      => true,
				'action_target' => '/settings',
				'action_type'   => 'setting',
				'action_key'    => 'disable_all_ads',
			],
			[
				'id'            => 'bot_protection',
				'label'         => 'Bot Protection',
				'description'   => 'Blocks crawler and bot traffic from ad delivery.',
				'enabled'       => (bool) $bot_protection_enabled,
				'editable'      => true,
				'action_target' => '/settings/protection',
				'action_type'   => 'setting',
				'action_key'    => 'hide_from_bots',
			],
			[
				'id'            => 'ip_blocker',
				'label'         => 'IP Blocker',
				'description'   => $blocked_ip_count > 0
					? sprintf( '%d blocked IPs configured.', $blocked_ip_count )
					: 'Enable module and add blocked IPs.',
				'enabled'       => (bool) $ip_blocker_module_enabled,
				'editable'      => true,
				'action_target' => '/settings/ip_blocker',
				'action_type'   => 'module',
				'action_key'    => 'ip_blocker',
			],
			[
				'id'            => 'ad_groups',
				'label'         => 'Ad Groups & Rotation',
				'description'   => 'Rotates ads in shared slots for testing.',
				'enabled'       => (bool) $ad_groups_enabled,
				'editable'      => true,
				'action_target' => '/settings',
				'action_type'   => 'module',
				'action_key'    => 'ad_groups',
			],
			[
				'id'            => 'tracking',
				'label'         => 'Tracking (Impressions + Clicks)',
				'description'   => 'Turns impression/click tracking on or off globally.',
				'enabled'       => (bool) $tracking_enabled,
				'editable'      => true,
				'action_target' => '/settings/analytics',
				'action_type'   => 'setting',
				'action_key'    => 'analytics_enabled',
			],
		];

		$activity_rows = \AdVajra\Utils\AuditLog::get_recent( 8 );
		$activity_feed = [];

		foreach ( $activity_rows as $activity_row ) {
			$next_step       = $this->resolve_activity_next_step( $activity_row['action'] ?? '' );
			$created_ts      = ! empty( $activity_row['created_at'] ) ? strtotime( (string) $activity_row['created_at'] ) : 0;
			$activity_feed[] = [
				'id'         => (int) ( $activity_row['id'] ?? 0 ),
				'actor'      => $activity_row['actor_name'] ?? __( 'System', 'advajra' ),
				'summary'    => $activity_row['summary'] ?? '',
				'created_at' => $activity_row['created_at'] ?? '',
				'time_ago'   => $created_ts > 0 ? human_time_diff( $created_ts, current_datetime()->getTimestamp() ) . ' ago' : '',
				'next_step'  => $next_step,
			];
		}

		if ( empty( $activity_feed ) ) {
			$activity_feed[] = [
				'id'         => 0,
				'actor'      => __( 'System', 'advajra' ),
				'summary'    => __( 'No recent team activity yet.', 'advajra' ),
				'created_at' => current_time( 'mysql' ),
				'time_ago'   => __( 'now', 'advajra' ),
				'next_step'  => [
					'label'  => 'Create Ad',
					'target' => '/ads/new',
				],
			];
		}

		$sync_interval    = isset( $settings['sync_interval'] ) ? max( 1, absint( $settings['sync_interval'] ) ) : 5;
		$last_sync_raw    = get_option( 'advajra_last_tracking_sync', '' );
		$last_sync_ts     = ! empty( $last_sync_raw ) ? (int) mysql2date( 'U', $last_sync_raw, false ) : 0;
		$sync_age_seconds = $last_sync_ts > 0 ? max( 0, current_datetime()->getTimestamp() - $last_sync_ts ) : null;
		$tracking_status  = ! $tracking_enabled
			? 'disabled'
			: ( null === $sync_age_seconds ? 'pending' : ( $sync_age_seconds <= ( $sync_interval * 120 ) ? 'healthy' : 'degraded' ) );
		$api_status       = $tracking_status === 'degraded' ? 'degraded' : 'healthy';

		$state = [
			'last_sync'         => [
				'at'          => $last_sync_raw ?: null,
				'age_seconds' => $sync_age_seconds,
				'label'       => null === $sync_age_seconds ? 'Never synced' : human_time_diff( $last_sync_ts, current_datetime()->getTimestamp() ) . ' ago',
				'help'        => 'How long ago tracking data was saved to database.',
			],
			'tracking_pipeline' => [
				'status'  => $tracking_status,
				'message' => $tracking_status === 'healthy'
					? 'Tracking is running normally'
					: ( $tracking_status === 'disabled' ? 'Tracking is off from settings' : 'Tracking sync is delayed' ),
				'help'    => 'Collects impression/click events and syncs them on the selected interval.',
			],
			'license'           => [
				'tier'                 => $access['is_pro'] ? 'pro' : ( $access['trial']['expired'] ? 'free_locked' : 'trial' ),
				'locked'               => (bool) $access['is_locked'],
				'trial_days_remaining' => (int) $access['trial']['days_remaining'],
				'help'                 => 'Plan status used for analytics and advanced features.',
			],
			'api_degradation'   => [
				'status'  => $api_status,
				'message' => 'healthy' === $api_status ? 'API status normal' : 'API delayed due to tracking sync lag',
				'help'    => 'Backend health signal for dashboard data freshness.',
			],
		];

		$advanced_context      = ! empty( $risk_queue ) ? $risk_queue[0]['title'] : ( ! empty( $optimization_queue ) ? $optimization_queue[0]['title'] : 'No critical blockers' );
		$advanced_optimization = [
			'status'      => $access['is_pro'] ? 'available' : 'locked',
			'title'       => 'Advanced Optimization',
			'description' => $access['is_pro']
				? sprintf( 'Priority context: %s', $advanced_context )
				: sprintf( 'Advanced automation available for: %s', $advanced_context ),
			'items'       => $access['is_pro']
				? [
					[
						'id'            => 'pro_forecast',
						'title'         => 'Forecast underdelivery windows',
						'description'   => 'Auto-prioritize placements before traffic drops.',
						'action_label'  => 'Open Analytics',
						'action_target' => '/analytics',
					],
				]
				: [],
			'cta'         => $access['is_pro'] ? null : [
				'label'  => 'Upgrade to PRO',
				'target' => 'https://advajra.com/pricing',
			],
		];

		$payload = [
			'state'                 => $state,
			'kpis'                  => [
				'ad_requests'       => [
					'label'   => 'Ad Requests',
					'value'   => $ad_requests,
					'display' => number_format_i18n( $ad_requests ),
					'help'    => 'Total times ad slots asked for an ad.',
				],
				'coverage'          => [
					'label'   => 'Coverage',
					'value'   => round( $coverage * 100, 2 ),
					'display' => number_format_i18n( $coverage * 100, 2 ) . '%',
					'help'    => 'Matched requests divided by total ad requests.',
				],
				'impressions'       => [
					'label'   => 'Impressions',
					'value'   => $impressions,
					'display' => number_format_i18n( $impressions ),
					'help'    => 'Total tracked ad impressions.',
				],
				'ctr'               => [
					'label'   => 'CTR',
					'value'   => round( $ctr * 100, 2 ),
					'display' => number_format_i18n( $ctr * 100, 2 ) . '%',
					'help'    => 'Clicks divided by impressions.',
				],
				'impression_rpm'    => [
					'label'     => 'Impression RPM',
					'value'     => $impression_rpm,
					'display'   => null === $impression_rpm ? 'Not connected' : '$' . number_format_i18n( $impression_rpm, 2 ),
					'connected' => (bool) $revenue_connected,
					'cta'       => null === $impression_rpm ? '/settings' : null,
					'help'      => 'Revenue per 1,000 impressions. Requires revenue connector.',
				],
				'avg_viewable_time' => [
					'label'   => 'Avg Viewable Time',
					'value'   => $avg_viewable_time_s,
					'display' => number_format_i18n( $avg_viewable_time_s, 2 ) . 's',
					'help'    => 'Average time an ad stays viewable on screen.',
				],
				'avg_load_time'     => [
					'label'   => 'Avg Load Time',
					'value'   => $avg_load_time_ms,
					'display' => number_format_i18n( $avg_load_time_ms, 1 ) . 'ms',
				],
			],
			'risk_queue'            => $risk_queue,
			'inventory_health'      => [
				'summary' => [
					'total'    => $total_placements,
					'assigned' => $total_assigned,
					'coverage' => $total_placements > 0 ? round( ( $total_assigned / $total_placements ) * 100, 1 ) : 0,
				],
				'rows'    => array_values( $inventory_rows ),
			],
			'switchboard'           => $switchboard,
			'optimization_queue'    => $optimization_queue,
			'activity_feed'         => $activity_feed,
			'advanced_optimization' => $advanced_optimization,
		];

		$payload    = apply_filters( 'advajra_dashboard_overview_v2_payload', $payload );
		$validation = $this->validate_overview_v2_payload( $payload );

		if ( is_wp_error( $validation ) ) {
			return new WP_REST_Response(
				[
					'code'    => 'invalid_overview_v2_payload',
					'message' => $validation->get_error_message(),
				],
				500
			);
		}

		return rest_ensure_response( $payload );
	}

	/**
	 * Safe ratio helper.
	 *
	 * @param int|float $numerator   Numerator.
	 * @param int|float $denominator Denominator.
	 * @param int       $precision   Precision.
	 * @return float
	 */
	private function safe_ratio( $numerator, $denominator, $precision = 4 ) {
		if ( empty( $denominator ) ) {
			return 0.0;
		}
		return round( (float) $numerator / (float) $denominator, $precision );
	}

	/**
	 * Remove duplicate items by entity key.
	 *
	 * @param array $items Input items.
	 * @return array
	 */
	private function dedupe_entities( $items ) {
		$seen   = [];
		$unique = [];

		foreach ( $items as $item ) {
			$key = ! empty( $item['entity_key'] ) ? $item['entity_key'] : ( $item['id'] ?? md5( wp_json_encode( $item ) ) );
			if ( isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = true;
			$unique[]     = $item;
		}

		return $unique;
	}

	/**
	 * Resolve next step mapping for activity actions.
	 *
	 * @param string $action Action slug.
	 * @return array<string,string>
	 */
	private function resolve_activity_next_step( $action ) {
		if ( false !== strpos( $action, 'placement_' ) ) {
			return [
				'label'  => 'Open Placements',
				'target' => '/placements',
			];
		}
		if ( false !== strpos( $action, 'ad_' ) ) {
			return [
				'label'  => 'Open Ads',
				'target' => '/ads',
			];
		}
		if ( false !== strpos( $action, 'group_' ) ) {
			return [
				'label'  => 'Open Groups',
				'target' => '/groups',
			];
		}
		if ( false !== strpos( $action, 'module_' ) || false !== strpos( $action, 'settings_' ) ) {
			return [
				'label'  => 'Open Settings',
				'target' => '/settings',
			];
		}

		return [
			'label'  => 'Open Overview',
			'target' => '/dashboard',
		];
	}

	/**
	 * Validate overview-v2 payload shape (strict contract).
	 *
	 * @param array $payload Payload.
	 * @return true|\WP_Error
	 */
	private function validate_overview_v2_payload( $payload ) {
		$required_sections = [
			'state',
			'kpis',
			'risk_queue',
			'inventory_health',
			'switchboard',
			'optimization_queue',
			'activity_feed',
			'advanced_optimization',
		];

		foreach ( $required_sections as $section ) {
			if ( ! array_key_exists( $section, $payload ) ) {
				return new \WP_Error( 'missing_section', sprintf( 'Missing section: %s', $section ) );
			}
		}

		if ( ! is_array( $payload['state'] ) || ! is_array( $payload['kpis'] ) ) {
			return new \WP_Error( 'invalid_section_type', 'State and KPIs must be objects.' );
		}

		if ( ! is_array( $payload['risk_queue'] ) || ! is_array( $payload['optimization_queue'] ) || ! is_array( $payload['switchboard'] ) ) {
			return new \WP_Error( 'invalid_queue_type', 'Queue and switchboard sections must be arrays.' );
		}

		$required_kpis = [ 'ad_requests', 'coverage', 'impressions', 'ctr', 'impression_rpm', 'avg_viewable_time' ];
		foreach ( $required_kpis as $kpi_key ) {
			if ( ! isset( $payload['kpis'][ $kpi_key ] ) || ! is_array( $payload['kpis'][ $kpi_key ] ) ) {
				return new \WP_Error( 'missing_kpi', sprintf( 'Missing KPI: %s', $kpi_key ) );
			}
		}

		return true;
	}

	/**
	 * Get Summary for Dashboard.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_summary( $request ) {
		$access = $this->get_access_context();
		if ( $access['is_locked'] ) {
			return new WP_REST_Response(
				[
					'total_impressions' => 0,
					'total_clicks'      => 0,
					'ctr'               => '0.00',
					'daily_data'        => [],
					'locked'            => true,
					'retention'         => $access['retention'],
					'trial'             => $access['trial'],
					'upgrade_url'       => 'https://advajra.com/pricing',
				],
				200
			);
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'advajra_stats';

		$end_date   = current_time( 'Y-m-d' );
		$start_date = ( new \DateTimeImmutable( $end_date, wp_timezone() ) )->modify( '-6 days' )->format( 'Y-m-d' );

		$results = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats table name is built from the trusted WordPress prefix.
			$wpdb->prepare(
				"SELECT date, SUM(impressions) as impressions, SUM(clicks) as clicks
             FROM $table_name
             WHERE date >= %s AND date <= %s
             GROUP BY date
             ORDER BY date ASC",
				$start_date,
				$end_date
			)
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		$daily_data = $this->fill_dates( $results, $start_date, $end_date );

		$total_impressions = 0;
		$total_clicks      = 0;
		foreach ( $daily_data as $day ) {
			$total_impressions += $day['impressions'];
			$total_clicks      += $day['clicks'];
		}
		$ctr = $total_impressions > 0 ? round( ( $total_clicks / $total_impressions ) * 100, 2 ) : 0;

		return new WP_REST_Response(
			[
				'total_impressions' => $total_impressions,
				'total_clicks'      => $total_clicks,
				'ctr'               => number_format( $ctr, 2 ),
				'daily_data'        => $daily_data,
				'locked'            => false,
			],
			200
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
	 * Get Trends for multiple ads.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|\WP_Error
	 */
	public function get_trends( $request ) {
		$ad_ids = $request->get_param( 'ad_ids' );
		if ( empty( $ad_ids ) || ! is_array( $ad_ids ) ) {
			return new \WP_Error( 'invalid_ids', 'Ad IDs array is required.', [ 'status' => 400 ] );
		}

		$ad_ids = array_map( 'intval', $ad_ids );
		global $wpdb;
		$table_name = $wpdb->prefix . 'advajra_stats';

		$end_date   = current_time( 'Y-m-d' );
		$start_date = ( new \DateTimeImmutable( $end_date, wp_timezone() ) )->modify( '-6 days' )->format( 'Y-m-d' );

		$placeholders = implode( ',', array_fill( 0, count( $ad_ids ), '%d' ) );
		$args         = array_merge( [ $start_date, $end_date ], $ad_ids );

		$results = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- Stats table name is built from the trusted WordPress prefix; ad ID placeholders remain prepared.
			$wpdb->prepare(
				"SELECT ad_id, date, SUM(impressions) as impressions
				 FROM $table_name
				 WHERE date >= %s AND date <= %s
				 AND ad_id IN ($placeholders)
				 GROUP BY ad_id, date
				 ORDER BY date ASC",
				...$args
			)
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
		);

		$grouped = [];
		foreach ( $ad_ids as $id ) {
			$grouped[ $id ] = [];
		}

		foreach ( $results as $row ) {
			$grouped[ $row->ad_id ][ $row->date ] = (int) $row->impressions;
		}

		$trends = [];
		foreach ( $grouped as $id => $dates_data ) {
			$ad_trend = [];
			$current  = strtotime( $start_date );
			$end_ts   = strtotime( $end_date );
			while ( $current <= $end_ts ) {
				$d          = gmdate( 'Y-m-d', $current );
				$ad_trend[] = isset( $dates_data[ $d ] ) ? $dates_data[ $d ] : 0;
				$current    = strtotime( '+1 day', $current );
			}
			$trends[ $id ] = $ad_trend;
		}

		return new \WP_REST_Response( $trends, 200 );
	}

	/**
	 * Get Stats.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_stats( $request ) {
		$access          = $this->get_access_context();
		$allowed_presets = AnalyticsAccess::get_allowed_presets();
		$preset_key      = sanitize_key( $request->get_param( 'preset' ) ?: 'last_7_days' );
		$resolved_preset = AnalyticsAccess::resolve_preset( $preset_key );

		if ( $access['is_locked'] ) {
			return new WP_REST_Response(
				[
					'locked'             => true,
					'upgrade_url'        => 'https://advajra.com/pricing',
					'selected_preset'    => $resolved_preset['key'],
					'presets'            => $allowed_presets,
					'comparison_enabled' => false,
					'summary'            => [
						'impressions' => 0,
						'clicks'      => 0,
						'ctr'         => 0,
						'growth'      => [
							'impressions' => 0,
							'clicks'      => 0,
							'ctr'         => 0,
							'ctr_unit'    => 'points',
						],
					],
					'timeline'           => [],
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
					'retention'          => $access['retention'],
					'trial'              => $access['trial'],
				],
				200
			);
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'advajra_stats';

		$start_date = $resolved_preset['start'];
		$end_date   = $resolved_preset['end'];
		$compare    = ! empty( $resolved_preset['compare'] );
		$dimension  = sanitize_text_field( $request->get_param( 'dimension' ) ?: '' );

		$timeline_results = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats table name is built from the trusted WordPress prefix.
			$wpdb->prepare(
				"SELECT date, SUM(impressions) as impressions, SUM(clicks) as clicks
				FROM {$table_name}
				WHERE date >= %s AND date <= %s
				GROUP BY date
				ORDER BY date ASC",
				$start_date,
				$end_date
			)
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		$timeline = $this->fill_dates( $timeline_results, $start_date, $end_date );

		$total_imps   = 0;
		$total_clicks = 0;
		foreach ( $timeline as $day ) {
			$total_imps   += $day['impressions'];
			$total_clicks += $day['clicks'];
		}
		$ctr = $total_imps > 0 ? round( ( $total_clicks / $total_imps ) * 100, 2 ) : 0;

		$top_ads = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats and posts table names are internal and trusted.
			$wpdb->prepare(
				"SELECT s.ad_id, p.post_title as title, SUM(s.impressions) as impressions, SUM(s.clicks) as clicks
				FROM {$table_name} s
				LEFT JOIN {$wpdb->posts} p ON s.ad_id = p.ID
				WHERE s.date >= %s AND s.date <= %s
				GROUP BY s.ad_id
				ORDER BY impressions DESC
				LIMIT 5",
				$start_date,
				$end_date
			)
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		$formatted_top_ads = array_map(
			function ( $ad ) {
				$ad->ctr   = $ad->impressions > 0 ? round( ( $ad->clicks / $ad->impressions ) * 100, 2 ) : 0;
				$ad->title = $ad->title ?: '(Deleted Ad #' . $ad->ad_id . ')';
				return $ad;
			},
			$top_ads
		);

		$breakdowns = [
			'by_ad'        => [],
			'by_placement' => [],
			'top_movers'   => [
				'by_ad'        => [],
				'by_placement' => [],
			],
		];

		if ( 'ad' === $dimension || '' === $dimension ) {
			$breakdowns['by_ad'] = $this->get_ad_breakdown( $start_date, $end_date );
		}

		if ( 'placement' === $dimension || '' === $dimension ) {
			$breakdowns['by_placement'] = $this->get_placement_breakdown( $start_date, $end_date );
		}

		$start_ts   = strtotime( $start_date );
		$end_ts     = strtotime( $end_date );
		$span_days  = max( 1, (int) floor( ( $end_ts - $start_ts ) / DAY_IN_SECONDS ) + 1 );
		$prev_end   = ! empty( $resolved_preset['prev_end'] )
			? $resolved_preset['prev_end']
			: gmdate( 'Y-m-d', strtotime( '-1 day', $start_ts ) );
		$prev_start = ! empty( $resolved_preset['prev_start'] )
			? $resolved_preset['prev_start']
			: gmdate( 'Y-m-d', strtotime( '-' . ( $span_days - 1 ) . ' days', strtotime( $prev_end ) ) );

		if ( $compare ) {
			$breakdowns['top_movers'] = $this->get_top_movers(
				$start_date,
				$end_date,
				$prev_start,
				$prev_end
			);
		}

		$period_map = [
			'current'  => [
				'impressions' => $total_imps,
				'clicks'      => $total_clicks,
			],
			'previous' => [
				'impressions' => 0,
				'clicks'      => 0,
			],
		];

		if ( $compare ) {
			$period_row = $wpdb->get_results(
				// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats table name is built from the trusted WordPress prefix.
				$wpdb->prepare(
					"SELECT 'current' as period, COALESCE(SUM(impressions),0) as impressions, COALESCE(SUM(clicks),0) as clicks
					FROM {$table_name} WHERE date >= %s AND date <= %s
					UNION ALL
					SELECT 'previous' as period, COALESCE(SUM(impressions),0) as impressions, COALESCE(SUM(clicks),0) as clicks
					FROM {$table_name} WHERE date >= %s AND date <= %s",
					$start_date,
					$end_date,
					$prev_start,
					$prev_end
				),
				// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				ARRAY_A
			);

			foreach ( $period_row as $row ) {
				$period_map[ $row['period'] ] = $row;
			}
		}

		$prev_imps     = (int) ( $period_map['previous']['impressions'] ?? 0 );
		$prev_clicks   = (int) ( $period_map['previous']['clicks'] ?? 0 );
		$prev_ctr      = $prev_imps > 0 ? round( ( $prev_clicks / $prev_imps ) * 100, 2 ) : 0;
		$has_prev_data = $compare && ( $prev_imps > 0 || $prev_clicks > 0 );
		$growth_imps   = $has_prev_data ? round( ( ( $total_imps - $prev_imps ) / max( 1, $prev_imps ) ) * 100, 1 ) : null;
		$growth_clicks = $has_prev_data ? round( ( ( $total_clicks - $prev_clicks ) / max( 1, $prev_clicks ) ) * 100, 1 ) : null;
		$growth_ctr    = $has_prev_data ? round( $ctr - $prev_ctr, 2 ) : null;

		$comparison_panel = null;
		if ( $compare ) {
			$curr_imps   = (int) ( $period_map['current']['impressions'] ?? 0 );
			$curr_clicks = (int) ( $period_map['current']['clicks'] ?? 0 );
			$curr_ctr    = $curr_imps > 0 ? round( ( $curr_clicks / $curr_imps ) * 100, 2 ) : 0;

			$prev_timeline_raw = $wpdb->get_results(
				// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats table name is built from the trusted WordPress prefix.
				$wpdb->prepare(
					"SELECT date, SUM(impressions) as impressions, SUM(clicks) as clicks
					FROM {$table_name}
					WHERE date >= %s AND date <= %s
					GROUP BY date
					ORDER BY date ASC",
					$prev_start,
					$prev_end
				)
				// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			);

			$comparison_panel = [
				'current'           => [
					'start'       => $start_date,
					'end'         => $end_date,
					'impressions' => $curr_imps,
					'clicks'      => $curr_clicks,
					'ctr'         => $curr_ctr,
				],
				'previous'          => [
					'start'       => $prev_start,
					'end'         => $prev_end,
					'impressions' => $prev_imps,
					'clicks'      => $prev_clicks,
					'ctr'         => $prev_ctr,
				],
				'previous_timeline' => $this->fill_dates( $prev_timeline_raw, $prev_start, $prev_end ),
			];
		}

		return new WP_REST_Response(
			[
				'locked'             => false,
				'selected_preset'    => $resolved_preset['key'],
				'presets'            => $allowed_presets,
				'comparison_enabled' => $compare,
				'summary'            => [
					'impressions' => $total_imps,
					'clicks'      => $total_clicks,
					'ctr'         => $ctr,
					'growth'      => [
						'impressions' => $growth_imps,
						'clicks'      => $growth_clicks,
						'ctr'         => $growth_ctr,
						'ctr_unit'    => 'points',
					],
				],
				'timeline'           => $timeline,
				'top_ads'            => $formatted_top_ads,
				'breakdowns'         => $breakdowns,
				'comparison'         => $comparison_panel,
				'retention'          => $access['retention'],
				'trial'              => $access['trial'],
			],
			200
		);
	}

	/**
	 * Build ad-level breakdown.
	 */
	private function get_ad_breakdown( $start_date, $end_date ) {
		global $wpdb;
		$table_name = $wpdb->prefix . 'advajra_stats';

		$results = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats and posts table names are internal and trusted.
			$wpdb->prepare(
				"SELECT s.ad_id, p.post_title as title, SUM(s.impressions) as impressions, SUM(s.clicks) as clicks
				FROM $table_name s
				LEFT JOIN {$wpdb->posts} p ON s.ad_id = p.ID
				WHERE s.date >= %s AND s.date <= %s
				GROUP BY s.ad_id
				ORDER BY impressions DESC
				LIMIT 12",
				$start_date,
				$end_date
			)
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		return array_map(
			function ( $row ) {
				$impressions = (int) $row->impressions;
				$clicks      = (int) $row->clicks;
				return [
					'ad_id'       => (int) $row->ad_id,
					'title'       => $row->title ?: '(Deleted Ad #' . $row->ad_id . ')',
					'impressions' => $impressions,
					'clicks'      => $clicks,
					'ctr'         => $impressions > 0 ? round( ( $clicks / $impressions ) * 100, 2 ) : 0,
				];
			},
			$results
		);
	}

	/**
	 * Build placement-level estimated breakdown.
	 * Stats are estimated from currently assigned ads/groups.
	 */
	private function get_placement_breakdown( $start_date, $end_date ) {
		global $wpdb;
		$table_name       = $wpdb->prefix . 'advajra_stats';
		$placements_table = $wpdb->prefix . 'advajra_placements';

		$placement_rows = $wpdb->get_results( "SELECT id, name, item_type, item_id, status FROM {$placements_table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placements table name is internal and trusted.
		$placement_data = [];

		foreach ( $placement_rows as $row ) {
			$placement_data[ (int) $row->id ] = [
				'placement_id' => (int) $row->id,
				'name'         => $row->name,
				'status'       => \AdVajra\Model\Placement::id_to_status( (int) $row->status ),
				'impressions'  => 0,
				'clicks'       => 0,
				'ctr'          => 0,
				'estimated'    => true,
			];
		}

		if ( empty( $placement_rows ) ) {
			return [];
		}

		$ad_ids = [];
		foreach ( $placement_rows as $row ) {
			if ( (int) $row->item_type === \AdVajra\Model\Placement::ITEM_AD && ! empty( $row->item_id ) ) {
				$ad_ids[] = (int) $row->item_id;
			}
		}
		$ad_ids = array_values( array_unique( $ad_ids ) );

		if ( empty( $ad_ids ) ) {
			return array_values( $placement_data );
		}

		$placeholders = implode( ',', array_fill( 0, count( $ad_ids ), '%d' ) );
		$args         = array_merge( [ $start_date, $end_date ], $ad_ids );

		$stats_rows = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- Stats table name is built from the trusted WordPress prefix; ad ID placeholders remain prepared.
			$wpdb->prepare(
				"SELECT ad_id, SUM(impressions) as impressions, SUM(clicks) as clicks
				FROM {$table_name}
				WHERE date >= %s AND date <= %s AND ad_id IN ({$placeholders})
				GROUP BY ad_id",
				...$args
			)
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
		);

		$ad_stats_map = [];
		foreach ( $stats_rows as $stats_row ) {
			$ad_stats_map[ (int) $stats_row->ad_id ] = [
				'impressions' => (int) $stats_row->impressions,
				'clicks'      => (int) $stats_row->clicks,
			];
		}

		foreach ( $placement_rows as $placement ) {
			$placement_id = (int) $placement->id;
			$ad_id        = (int) $placement->item_id;

			if ( (int) $placement->item_type !== \AdVajra\Model\Placement::ITEM_AD || ! isset( $ad_stats_map[ $ad_id ] ) ) {
				continue;
			}

			$placement_data[ $placement_id ]['impressions'] = $ad_stats_map[ $ad_id ]['impressions'];
			$placement_data[ $placement_id ]['clicks']      = $ad_stats_map[ $ad_id ]['clicks'];
			$placement_data[ $placement_id ]['ctr']         = $ad_stats_map[ $ad_id ]['impressions'] > 0
				? round( ( $ad_stats_map[ $ad_id ]['clicks'] / $ad_stats_map[ $ad_id ]['impressions'] ) * 100, 2 )
				: 0;
		}

		usort(
			$placement_data,
			function ( $a, $b ) {
				return $b['impressions'] <=> $a['impressions'];
			}
		);

		return $placement_data;
	}

	/**
	 * Build top movers list from timeline.
	 */
	private function get_top_movers( $start_date, $end_date, $prev_start, $prev_end ) {
		return [
			'by_ad'        => $this->get_ad_movers( $start_date, $end_date, $prev_start, $prev_end ),
			'by_placement' => $this->get_placement_movers( $start_date, $end_date, $prev_start, $prev_end ),
		];
	}

	/**
	 * Build ad-level movers based on current vs previous-period impressions.
	 *
	 * @param string $start_date Current start date.
	 * @param string $end_date Current end date.
	 * @param string $prev_start Previous start date.
	 * @param string $prev_end Previous end date.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_ad_movers( $start_date, $end_date, $prev_start, $prev_end ) {
		global $wpdb;
		$table_name = $wpdb->prefix . 'advajra_stats';

		$rows = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Stats and posts table names are internal and trusted.
			$wpdb->prepare(
				"SELECT
					s.ad_id,
					COALESCE(p.post_title, '') AS title,
					SUM(CASE WHEN s.date >= %s AND s.date <= %s THEN s.impressions ELSE 0 END) AS current_impressions,
					SUM(CASE WHEN s.date >= %s AND s.date <= %s THEN s.clicks ELSE 0 END) AS current_clicks,
					SUM(CASE WHEN s.date >= %s AND s.date <= %s THEN s.impressions ELSE 0 END) AS previous_impressions,
					SUM(CASE WHEN s.date >= %s AND s.date <= %s THEN s.clicks ELSE 0 END) AS previous_clicks
				FROM {$table_name} s
				LEFT JOIN {$wpdb->posts} p ON s.ad_id = p.ID
				WHERE s.date >= %s AND s.date <= %s
				GROUP BY s.ad_id
				HAVING current_impressions > 0 OR previous_impressions > 0 OR current_clicks > 0 OR previous_clicks > 0",
				$start_date,
				$end_date,
				$start_date,
				$end_date,
				$prev_start,
				$prev_end,
				$prev_start,
				$prev_end,
				$prev_start,
				$end_date
			),
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ARRAY_A
		);

		$movers = [];
		foreach ( $rows as $row ) {
			$mover = $this->build_mover_payload(
				[
					'id'                   => 'ad-' . (int) $row['ad_id'],
					'entity_type'          => 'ad',
					'entity_id'            => (int) $row['ad_id'],
					'title'                => $row['title'] ?: '(Deleted Ad #' . (int) $row['ad_id'] . ')',
					'current_impressions'  => (int) $row['current_impressions'],
					'current_clicks'       => (int) $row['current_clicks'],
					'previous_impressions' => (int) $row['previous_impressions'],
					'previous_clicks'      => (int) $row['previous_clicks'],
				]
			);

			if ( null !== $mover ) {
				$movers[] = $mover;
			}
		}

		usort(
			$movers,
			function ( $a, $b ) {
				$a_score = $a['_sort_score'] ?? 0;
				$b_score = $b['_sort_score'] ?? 0;
				if ( $a_score === $b_score ) {
					return ( $b['current'] ?? 0 ) <=> ( $a['current'] ?? 0 );
				}
				return $b_score <=> $a_score;
			}
		);

		return array_map(
			function ( $mover ) {
				unset( $mover['_sort_score'] );
				return $mover;
			},
			array_slice( $movers, 0, 6 )
		);
	}

	/**
	 * Build placement-level movers using estimated stats from currently assigned ads.
	 *
	 * @param string $start_date Current start date.
	 * @param string $end_date Current end date.
	 * @param string $prev_start Previous start date.
	 * @param string $prev_end Previous end date.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_placement_movers( $start_date, $end_date, $prev_start, $prev_end ) {
		global $wpdb;
		$table_name       = $wpdb->prefix . 'advajra_stats';
		$placements_table = $wpdb->prefix . 'advajra_placements';

		$placement_rows = $wpdb->get_results(
			"SELECT id, name, item_type, item_id, status FROM {$placements_table}", // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placements table name is internal and trusted.
			ARRAY_A
		);

		if ( empty( $placement_rows ) ) {
			return [];
		}

		$ad_ids = [];
		foreach ( $placement_rows as $row ) {
			if ( (int) $row['item_type'] === \AdVajra\Model\Placement::ITEM_AD && ! empty( $row['item_id'] ) ) {
				$ad_ids[] = (int) $row['item_id'];
			}
		}

		$ad_ids = array_values( array_unique( $ad_ids ) );
		if ( empty( $ad_ids ) ) {
			return [];
		}

		$placeholders = implode( ',', array_fill( 0, count( $ad_ids ), '%d' ) );
		$args         = array_merge(
			[
				$start_date,
				$end_date,
				$start_date,
				$end_date,
				$prev_start,
				$prev_end,
				$prev_start,
				$prev_end,
				$prev_start,
				$end_date,
			],
			$ad_ids
		);

		$stats_rows = $wpdb->get_results(
			// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- Stats table name is built from the trusted WordPress prefix; ad ID placeholders remain prepared.
			$wpdb->prepare(
				"SELECT
					ad_id,
					SUM(CASE WHEN date >= %s AND date <= %s THEN impressions ELSE 0 END) AS current_impressions,
					SUM(CASE WHEN date >= %s AND date <= %s THEN clicks ELSE 0 END) AS current_clicks,
					SUM(CASE WHEN date >= %s AND date <= %s THEN impressions ELSE 0 END) AS previous_impressions,
					SUM(CASE WHEN date >= %s AND date <= %s THEN clicks ELSE 0 END) AS previous_clicks
				FROM {$table_name}
				WHERE date >= %s AND date <= %s
					AND ad_id IN ({$placeholders})
				GROUP BY ad_id",
				...$args
			),
			// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
			ARRAY_A
		);

		$stats_by_ad = [];
		foreach ( $stats_rows as $stats_row ) {
			$stats_by_ad[ (int) $stats_row['ad_id'] ] = [
				'current_impressions'  => (int) $stats_row['current_impressions'],
				'current_clicks'       => (int) $stats_row['current_clicks'],
				'previous_impressions' => (int) $stats_row['previous_impressions'],
				'previous_clicks'      => (int) $stats_row['previous_clicks'],
			];
		}

		$movers = [];
		foreach ( $placement_rows as $row ) {
			$ad_id = (int) $row['item_id'];
			if ( (int) $row['item_type'] !== \AdVajra\Model\Placement::ITEM_AD || ! isset( $stats_by_ad[ $ad_id ] ) ) {
				continue;
			}

			$mover = $this->build_mover_payload(
				[
					'id'                   => 'placement-' . (int) $row['id'],
					'entity_type'          => 'placement',
					'entity_id'            => (int) $row['id'],
					'title'                => $row['name'],
					'status'               => \AdVajra\Model\Placement::id_to_status( (int) $row['status'] ),
					'estimated'            => true,
					'current_impressions'  => $stats_by_ad[ $ad_id ]['current_impressions'],
					'current_clicks'       => $stats_by_ad[ $ad_id ]['current_clicks'],
					'previous_impressions' => $stats_by_ad[ $ad_id ]['previous_impressions'],
					'previous_clicks'      => $stats_by_ad[ $ad_id ]['previous_clicks'],
				]
			);

			if ( null !== $mover ) {
				$movers[] = $mover;
			}
		}

		usort(
			$movers,
			function ( $a, $b ) {
				$a_score = $a['_sort_score'] ?? 0;
				$b_score = $b['_sort_score'] ?? 0;
				if ( $a_score === $b_score ) {
					return ( $b['current'] ?? 0 ) <=> ( $a['current'] ?? 0 );
				}
				return $b_score <=> $a_score;
			}
		);

		return array_map(
			function ( $mover ) {
				unset( $mover['_sort_score'] );
				return $mover;
			},
			array_slice( $movers, 0, 6 )
		);
	}

	/**
	 * Normalize a mover payload for the analytics UI.
	 *
	 * @param array<string,mixed> $entity Entity metrics.
	 * @return array<string,mixed>|null
	 */
	private function build_mover_payload( $entity ) {
		$current_impressions  = (int) ( $entity['current_impressions'] ?? 0 );
		$current_clicks       = (int) ( $entity['current_clicks'] ?? 0 );
		$previous_impressions = (int) ( $entity['previous_impressions'] ?? 0 );
		$previous_clicks      = (int) ( $entity['previous_clicks'] ?? 0 );

		if ( 0 === $current_impressions && 0 === $previous_impressions && 0 === $current_clicks && 0 === $previous_clicks ) {
			return null;
		}

		$delta        = $current_impressions - $previous_impressions;
		$change       = $previous_impressions > 0
			? round( ( $delta / $previous_impressions ) * 100, 1 )
			: null;
		$current_ctr  = $current_impressions > 0 ? round( ( $current_clicks / $current_impressions ) * 100, 2 ) : 0;
		$previous_ctr = $previous_impressions > 0 ? round( ( $previous_clicks / $previous_impressions ) * 100, 2 ) : 0;
		$ctr_delta    = round( $current_ctr - $previous_ctr, 2 );
		$direction    = $delta > 0 ? 'up' : ( $delta < 0 ? 'down' : 'flat' );

		return [
			'id'               => $entity['id'],
			'entity_type'      => $entity['entity_type'],
			'entity_id'        => (int) $entity['entity_id'],
			'title'            => $entity['title'],
			'metric'           => 'impressions',
			'metric_label'     => 'Impressions',
			'previous'         => $previous_impressions,
			'current'          => $current_impressions,
			'delta'            => $delta,
			'change'           => $change,
			'direction'        => $direction,
			'current_clicks'   => $current_clicks,
			'previous_clicks'  => $previous_clicks,
			'current_ctr'      => $current_ctr,
			'previous_ctr'     => $previous_ctr,
			'ctr_delta_points' => $ctr_delta,
			'status'           => $entity['status'] ?? '',
			'estimated'        => ! empty( $entity['estimated'] ),
			'_sort_score'      => abs( $delta ),
		];
	}

	/**
	 * Helper: Fill missing dates.
	 */
	private function fill_dates( $results, $start, $end ) {
		$map = [];
		foreach ( $results as $row ) {
			$map[ $row->date ] = $row;
		}

		$filled  = [];
		$current = strtotime( $start );
		$end_ts  = strtotime( $end );

		while ( $current <= $end_ts ) {
			$date = gmdate( 'Y-m-d', $current );
			if ( isset( $map[ $date ] ) ) {
				$filled[] = [
					'date'        => $date,
					'impressions' => (int) $map[ $date ]->impressions,
					'clicks'      => (int) $map[ $date ]->clicks,
				];
			} else {
				$filled[] = [
					'date'        => $date,
					'impressions' => 0,
					'clicks'      => 0,
				];
			}
			$current = strtotime( '+1 day', $current );
		}
		return $filled;
	}
}
