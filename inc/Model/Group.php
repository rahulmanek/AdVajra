<?php
/**
 * Group Model — Weighted Ad Pool.
 *
 * A Group is a container of ads that share a single placement slot.
 * It determines WHICH ad gets rendered on each page load using one
 * of three rotation strategies: random, weighted, or ordered.
 *
 * Data model (post meta on `advajra_group` CPT):
 *   _advajra_group_ads      → [ { "id": 5, "weight": 10 }, ... ]
 *   _advajra_group_rotation → "random" | "weighted" | "ordered"
 *
 * Performance notes:
 *   - get_ads_for_display() is the hot path (called on every page render).
 *   - All data is read from WP post meta cache (primed by get_post).
 *   - Dead ads are filtered from the pool BEFORE selection (no blank slots).
 *   - Ordered rotation uses a single option row with shutdown flush.
 *   - Request-level cache prevents redundant resolution.
 *
 * Extensibility:
 *   - `advajra_group_pool`     → filter the pool before selection.
 *   - `advajra_group_strategy` → add/override rotation strategies.
 *   - `advajra_group_selected` → transform the final selected ad ID.
 *   - `advajra_group_response` → extend REST response with PRO fields.
 *
 * @package AdVajra\Model
 */

namespace AdVajra\Model;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Group
 */
class Group {

	/**
	 * Post Type.
	 *
	 * @var string
	 */
	const POST_TYPE = 'advajra_group';

	/**
	 * Meta key for the weighted ads array.
	 *
	 * @var string
	 */
	const META_ADS = '_advajra_group_ads';

	/**
	 * Meta key for the rotation mode.
	 *
	 * @var string
	 */
	const META_ROTATION = '_advajra_group_rotation';

	/**
	 * Option key for ordered rotation counters.
	 *
	 * Stores all group counters in a single option row:
	 *   { "42": 2, "78": 0 }
	 *
	 * @var string
	 */
	const COUNTERS_OPTION = '_advajra_group_counters';

	/**
	 * Allowed rotation modes.
	 *
	 * @var string[]
	 */
	const ROTATION_MODES = [ 'random', 'weighted', 'ordered' ];

	/**
	 * Default weight for ads added without explicit weight.
	 *
	 * @var int
	 */
	const DEFAULT_WEIGHT = 10;

	/**
	 * In-memory buffer for dirty ordered-rotation counters.
	 *
	 * @var array<int,int>|null
	 */
	private static $dirty_counters = null;

	/**
	 * Whether the shutdown flush hook has been registered.
	 *
	 * @var bool
	 */
	private static $shutdown_registered = false;

	/**
	 * Request-level resolution cache.
	 *
	 * Prevents redundant computation if the same group is resolved
	 * multiple times in a single request (e.g., shortcode + placement).
	 *
	 * @var array<int,int[]>
	 */
	private static $resolved = [];

	// ─── CRUD Operations ───────────────────────────────────────

	/**
	 * Create a new Group.
	 *
	 * @param array $args {
	 *   @type string $title    Group title.
	 *   @type array  $ads      Weighted ads array [ { id, weight }, ... ].
	 *   @type string $rotation Rotation mode.
	 * }
	 * @return int|\WP_Error Post ID on success.
	 */
	public static function create( array $args ) {
		$post_id = wp_insert_post(
			[
				'post_type'   => self::POST_TYPE,
				'post_title'  => sanitize_text_field( $args['title'] ?? 'Untitled Group' ),
				'post_status' => 'publish',
			],
			true
		);

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		self::save_meta( $post_id, $args );

		return $post_id;
	}

	/**
	 * Update a Group.
	 *
	 * @param int   $group_id Group ID.
	 * @param array $args     Fields to update.
	 * @return true|\WP_Error
	 */
	public static function update( int $group_id, array $args ) {
		$post = get_post( $group_id );

		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return new \WP_Error( 'not_found', __( 'Group not found.', 'advajra' ), [ 'status' => 404 ] );
		}

		// Update title only if explicitly provided (null = no change).
		if ( isset( $args['title'] ) && is_string( $args['title'] ) && '' !== $args['title'] ) {
			wp_update_post(
				[
					'ID'         => $group_id,
					'post_title' => sanitize_text_field( $args['title'] ),
				]
			);
		}

		// If the ads pool changed, reset the ordered counter for this group
		// to prevent index-out-of-bounds on the next render.
		if ( isset( $args['ads'] ) && is_array( $args['ads'] ) ) {
			self::reset_counter( $group_id );
		}

		self::save_meta( $group_id, $args );

		// Bust resolution cache for this group.
		unset( self::$resolved[ $group_id ] );

		return true;
	}

	/**
	 * Delete a Group.
	 *
	 * @param int $group_id Group ID.
	 * @return true|\WP_Error
	 */
	public static function delete( int $group_id ) {
		$post = get_post( $group_id );

		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return new \WP_Error( 'not_found', __( 'Group not found.', 'advajra' ), [ 'status' => 404 ] );
		}

		// Clean counter before deleting.
		self::remove_counter( $group_id );

		wp_delete_post( $group_id, true );

		return true;
	}

	// ─── Meta Persistence ──────────────────────────────────────

	/**
	 * Save group meta data.
	 *
	 * @param int   $group_id Group ID.
	 * @param array $args     Data array.
	 */
	private static function save_meta( int $group_id, array $args ): void {
		if ( isset( $args['ads'] ) && is_array( $args['ads'] ) ) {
			$sanitized = [];
			foreach ( $args['ads'] as $entry ) {
				if ( is_array( $entry ) && ! empty( $entry['id'] ) ) {
					$sanitized[] = [
						'id'     => absint( $entry['id'] ),
						'weight' => max( 1, min( 100, (int) ( $entry['weight'] ?? self::DEFAULT_WEIGHT ) ) ),
					];
				}
			}
			update_post_meta( $group_id, self::META_ADS, $sanitized );
		}

		if ( isset( $args['rotation'] ) ) {
			$rotation = in_array( $args['rotation'], self::ROTATION_MODES, true )
				? $args['rotation']
				: 'random';
			update_post_meta( $group_id, self::META_ROTATION, $rotation );
		}
	}

	// ─── Response Preparation ──────────────────────────────────

	/**
	 * Prepare for REST response.
	 *
	 * @param \WP_Post $post Post object.
	 * @return array
	 */
	public static function prepare_for_response( $post ) {
		$ads      = get_post_meta( $post->ID, self::META_ADS, true );
		$rotation = get_post_meta( $post->ID, self::META_ROTATION, true );

		$response = [
			'id'       => $post->ID,
			'title'    => $post->post_title,
			'ads'      => is_array( $ads ) ? $ads : [],
			'rotation' => in_array( $rotation, self::ROTATION_MODES, true ) ? $rotation : 'random',
		];

		/**
		 * Filter group REST response.
		 *
		 * Allows PRO to append extra fields (e.g., refresh_interval,
		 * schedule_rules, ab_test_config, group_analytics).
		 *
		 * @param array    $response Response array.
		 * @param \WP_Post $post     Group post object.
		 */
		return apply_filters( 'advajra_group_response', $response, $post );
	}

	// ─── Delivery (Hot Path) ───────────────────────────────────

	/**
	 * Get ad IDs for display from a group.
	 *
	 * This is the HOT PATH — called on every page render when a
	 * placement is assigned to a group. It must be fast.
	 *
	 * Architecture:
	 *   1. Read pool from meta (WP cache primed).
	 *   2. Filter dead/unpublished ads from pool (prevent blank slots).
	 *   3. Apply rotation strategy to select one ad.
	 *   4. Cache result per-request (prevent redundant work).
	 *
	 * @param int $group_id Group ID.
	 * @return int[] Array with a single ad ID, or empty.
	 */
	public static function get_ads_for_display( $group_id ) {
		$group_id = absint( $group_id );

		// ── Request cache: return immediately if already resolved.
		if ( isset( self::$resolved[ $group_id ] ) ) {
			return self::$resolved[ $group_id ];
		}

		$post = get_post( $group_id );
		if ( ! $post || self::POST_TYPE !== $post->post_type || 'publish' !== $post->post_status ) {
			self::$resolved[ $group_id ] = [];
			return [];
		}

		$ads_meta = get_post_meta( $group_id, self::META_ADS, true );
		if ( ! is_array( $ads_meta ) || empty( $ads_meta ) ) {
			self::$resolved[ $group_id ] = [];
			return [];
		}

		// ── Build raw pool.
		$raw_pool = [];
		foreach ( $ads_meta as $entry ) {
			if ( is_array( $entry ) && ! empty( $entry['id'] ) ) {
				$raw_pool[] = [
					'id'     => absint( $entry['id'] ),
					'weight' => max( 1, (int) ( $entry['weight'] ?? self::DEFAULT_WEIGHT ) ),
				];
			}
		}

		if ( empty( $raw_pool ) ) {
			self::$resolved[ $group_id ] = [];
			return [];
		}

		// ── Filter dead/unpublished ads from pool.
		// This prevents blank slot rendering. We check post_status
		// directly (get_post is cached by WP after first call).
		$pool = [];
		foreach ( $raw_pool as $entry ) {
			$ad_post = get_post( $entry['id'] );
			if ( $ad_post && 'publish' === $ad_post->post_status && 'advajra_ad' === $ad_post->post_type ) {
				$pool[] = $entry;
			}
		}

		/**
		 * Filter the ad pool before selection.
		 *
		 * Allows PRO to modify the pool (e.g., remove ads based on
		 * schedule, geo rules, or A/B test config).
		 *
		 * @param array $pool     Pool of { id, weight } arrays.
		 * @param int   $group_id Group ID.
		 */
		$pool = apply_filters( 'advajra_group_pool', $pool, $group_id );

		if ( empty( $pool ) ) {
			self::$resolved[ $group_id ] = [];
			return [];
		}

		$rotation = get_post_meta( $group_id, self::META_ROTATION, true ) ?: 'random';

		/**
		 * Filter the rotation strategy.
		 *
		 * Allows PRO to register custom strategies (e.g., 'time_based',
		 * 'geo_weighted'). Return an ad ID (int) to override the built-in
		 * selection. Return null to fall through to default behaviour.
		 *
		 * @param int|null $selected  Pre-selected ad ID (null = use default).
		 * @param string   $rotation  Rotation mode string.
		 * @param array    $pool      Pool of { id, weight } arrays.
		 * @param int      $group_id  Group ID.
		 */
		$selected = apply_filters( 'advajra_group_strategy', null, $rotation, $pool, $group_id );

		// ── Built-in strategies (only if PRO didn't override).
		if ( null === $selected ) {
			switch ( $rotation ) {
				case 'weighted':
					$selected = self::select_weighted( $pool );
					break;

				case 'ordered':
					$selected = self::select_ordered( $group_id, $pool );
					break;

				case 'random':
				default:
					$selected = self::select_random( $pool );
					break;
			}
		}

		/**
		 * Filter the final selected ad ID.
		 *
		 * Allows PRO to transform the result (e.g., for A/B test logging,
		 * frequency capping, or fallback chains).
		 *
		 * @param int|null $selected  Selected ad ID.
		 * @param string   $rotation  Rotation mode.
		 * @param array    $pool      Pool of { id, weight } arrays.
		 * @param int      $group_id  Group ID.
		 */
		$selected = apply_filters( 'advajra_group_selected', $selected, $rotation, $pool, $group_id );

		$result = $selected ? [ $selected ] : [];

		// ── Cache for this request.
		self::$resolved[ $group_id ] = $result;

		return $result;
	}

	// ─── Selection Strategies ──────────────────────────────────

	/**
	 * Random selection — equal probability, ignores weights.
	 *
	 * @param array $pool Weighted ad pool.
	 * @return int Ad ID.
	 */
	private static function select_random( array $pool ): int {
		return $pool[ array_rand( $pool ) ]['id'];
	}

	/**
	 * Weighted random selection — probability proportional to weight.
	 *
	 * Uses the standard "cumulative weight" algorithm:
	 *   1. Sum all weights.
	 *   2. Pick a random number 1–total.
	 *   3. Walk the pool, accumulating weight, return the first
	 *      entry where the accumulator >= the random number.
	 *
	 * O(n) where n = number of ads in pool. For typical groups
	 * (2–20 ads), this is effectively O(1).
	 *
	 * @param array $pool Weighted ad pool.
	 * @return int Ad ID.
	 */
	private static function select_weighted( array $pool ): int {
		$total = 0;
		foreach ( $pool as $entry ) {
			$total += $entry['weight'];
		}

		$roll = wp_rand( 1, $total );
		$sum  = 0;

		foreach ( $pool as $entry ) {
			$sum += $entry['weight'];
			if ( $roll <= $sum ) {
				return $entry['id'];
			}
		}

		// Fallback (should never reach here).
		return $pool[0]['id'];
	}

	/**
	 * Ordered sequential selection — truly sequential (1→2→3→1...).
	 *
	 * Uses a persistent counter per group ID, stored in a single
	 * option row and flushed at shutdown. The counter tracks the
	 * index in the pool array.
	 *
	 * Note: Under high concurrency, two requests may read the same
	 * counter before either flushes. This is acceptable — even GAM
	 * doesn't guarantee perfect sequencing under concurrency.
	 *
	 * @param int   $group_id Group ID.
	 * @param array $pool     Weighted ad pool.
	 * @return int Ad ID.
	 */
	private static function select_ordered( int $group_id, array $pool ): int {
		$counters = self::get_counters();
		$index    = $counters[ $group_id ] ?? 0;

		// Wrap around if index exceeds pool size.
		if ( $index >= count( $pool ) ) {
			$index = 0;
		}

		$selected = $pool[ $index ]['id'];

		// Advance counter for next render.
		self::set_counter( $group_id, $index + 1 );

		return $selected;
	}

	// ─── Counter Management ────────────────────────────────────

	/**
	 * Get all ordered rotation counters.
	 *
	 * Reads from option once per request, then uses in-memory cache.
	 *
	 * @return array<int,int>
	 */
	private static function get_counters(): array {
		if ( null === self::$dirty_counters ) {
			$stored              = get_option( self::COUNTERS_OPTION, [] );
			self::$dirty_counters = is_array( $stored ) ? $stored : [];
		}

		return self::$dirty_counters;
	}

	/**
	 * Set counter for a group and schedule flush.
	 *
	 * @param int $group_id Group ID.
	 * @param int $value    Counter value.
	 */
	private static function set_counter( int $group_id, int $value ): void {
		if ( null === self::$dirty_counters ) {
			self::get_counters();
		}

		self::$dirty_counters[ $group_id ] = $value;
		self::register_shutdown();
	}

	/**
	 * Remove counter for a deleted group.
	 *
	 * @param int $group_id Group ID.
	 */
	private static function remove_counter( int $group_id ): void {
		$counters = self::get_counters();

		if ( isset( $counters[ $group_id ] ) ) {
			unset( self::$dirty_counters[ $group_id ] );
			update_option( self::COUNTERS_OPTION, self::$dirty_counters, false );
		}
	}

	/**
	 * Reset counter for a group to 0.
	 *
	 * Called when the ads pool changes (add/remove/reorder) to
	 * prevent stale index from referencing a non-existent slot.
	 *
	 * @param int $group_id Group ID.
	 */
	private static function reset_counter( int $group_id ): void {
		self::set_counter( $group_id, 0 );
	}

	/**
	 * Register shutdown hook for counter flush (once per request).
	 */
	private static function register_shutdown(): void {
		if ( self::$shutdown_registered ) {
			return;
		}

		self::$shutdown_registered = true;
		add_action( 'shutdown', [ __CLASS__, 'flush_counters' ], 5 );
	}

	/**
	 * Flush dirty counters to database.
	 *
	 * Called once at shutdown if any ordered rotation was used.
	 * Uses autoload=false since this is only needed on frontend renders.
	 */
	public static function flush_counters(): void {
		if ( null === self::$dirty_counters ) {
			return;
		}

		update_option( self::COUNTERS_OPTION, self::$dirty_counters, false );
	}

	/**
	 * Reset request-level caches.
	 *
	 * Used by unit tests and admin preview flows.
	 */
	public static function reset(): void {
		self::$resolved = [];
	}
}
