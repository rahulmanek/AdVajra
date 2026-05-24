/**
 * Store Selectors.
 *
 * @package advajra
 */

// ── Ads ──
export const getAds = ( state ) => state.ads.items;

/**
 * Get a single ad by ID.
 *
 * @param {Object} state - Store state.
 * @param {number} id    - Ad ID.
 * @return {Object|undefined} Ad record or undefined.
 */
export const getAd = ( state, id ) =>
	state.ads.items.find( ( item ) => item.id === id );

/**
 * Whether the ads collection has been loaded from the API.
 *
 * @param {Object} state - Store state.
 * @return {boolean}
 */
export const hasLoadedAds = ( state ) => state.ads.loaded;

/**
 * Whether the ads collection is currently loading.
 *
 * @param {Object} state - Store state.
 * @return {boolean}
 */
export const isLoadingAds = ( state ) => state.ads.loading;

/**
 * Get the error message for the ads collection, if any.
 *
 * @param {Object} state - Store state.
 * @return {string|null}
 */
export const getAdsError = ( state ) => state.ads.error;



/**
 * Get all groups.
 *
 * @param {Object} state - Store state.
 * @return {Array} List of group records.
 */
export const getGroups = ( state ) => state.groups.items;

/**
 * Get a single group by ID.
 *
 * @param {Object} state - Store state.
 * @param {number} id    - Group ID.
 * @return {Object|undefined} Group record or undefined.
 */
export const getGroup = ( state, id ) =>
	state.groups.items.find( ( item ) => item.id === id );

/**
 * Whether the groups collection has been loaded from the API.
 *
 * @param {Object} state - Store state.
 * @return {boolean}
 */
export const hasLoadedGroups = ( state ) => state.groups.loaded;

/**
 * Whether the groups collection is currently loading.
 *
 * @param {Object} state - Store state.
 * @return {boolean}
 */
export const isLoadingGroups = ( state ) => state.groups.loading;

/**
 * Get the error message for the groups collection, if any.
 *
 * @param {Object} state - Store state.
 * @return {string|null}
 */
export const getGroupsError = ( state ) => state.groups.error;



/**
 * Get all placements.
 *
 * @param {Object} state - Store state.
 * @return {Array} List of placement records.
 */
export const getPlacements = ( state ) => state.placements.items;

/**
 * Get a single placement by ID.
 *
 * @param {Object} state - Store state.
 * @param {number} id    - Placement ID.
 * @return {Object|undefined} Placement record or undefined.
 */
export const getPlacement = ( state, id ) =>
	state.placements.items.find( ( item ) => item.id === id );

/**
 * Whether the placements collection has been loaded from the API.
 *
 * @param {Object} state - Store state.
 * @return {boolean}
 */
export const hasLoadedPlacements = ( state ) => state.placements.loaded;

/**
 * Whether the placements collection is currently loading.
 *
 * @param {Object} state - Store state.
 * @return {boolean}
 */
export const isLoadingPlacements = ( state ) => state.placements.loading;

/**
 * Get the error message for the placements collection, if any.
 *
 * @param {Object} state - Store state.
 * @return {string|null}
 */
export const getPlacementsError = ( state ) => state.placements.error;



/**
 * Whether ALL entity collections have finished their initial load.
 * Useful for full-app loading states.
 *
 * @param {Object} state - Store state.
 * @return {boolean}
 */
export const isFullyLoaded = ( state ) =>
	state.ads.loaded && state.groups.loaded && state.placements.loaded;

/**
 * Whether ANY entity has a REST API error.
 * Useful for showing a global connectivity error banner.
 *
 * @param {Object} state - Store state.
 * @return {string|null} First error message found, or null.
 */
export const getRestApiError = ( state ) =>
	state.ads.error || state.placements.error || state.groups.error || null;
