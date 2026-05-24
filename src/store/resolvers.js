/**
 * Store Resolvers
 *
 * Resolvers are the magic of @wordpress/data:
 * each resolver name MUST match a selector name exactly.
 *
 * When a component calls `select('advajra/data').getAds()` and
 * the data hasn't been loaded yet, the resolver auto-fires,
 * fetches from the API, and dispatches into state.
 *
 * On subsequent calls, the data is already in cache — no API hit.
 *
 * @package advajra
 */
import apiFetch from '@wordpress/api-fetch';
import { ENTITY_PATHS } from './constants';
import { setEntityRecords, setEntityLoading, setEntityError } from './actions';

/**
 * Resolver for getAds selector.
 * Fetches all ads from REST API on first access.
 */
export const getAds = () => async ( { dispatch, select } ) => {
	// Guard: don't re-fetch if already loaded.
	if ( select.hasLoadedAds() ) {
		return;
	}

	dispatch( setEntityLoading( 'ads', true ) );
	try {
		const records = await apiFetch( { path: ENTITY_PATHS.ads } );
		dispatch( setEntityRecords( 'ads', records ) );
	} catch ( error ) {
		console.error( 'Error fetching ads:', error );
		dispatch( setEntityError( 'ads', error?.message || 'Failed to load ads.' ) );
	}
};

/**
 * Resolver for getGroups selector.
 * Fetches all groups from REST API on first access.
 */
export const getGroups = () => async ( { dispatch, select } ) => {
	if ( select.hasLoadedGroups() ) {
		return;
	}

	// Guard: Do not fetch from REST API if the module is inactive
	if (!window.advajraSettings?.activeModules?.includes('ad_groups')) {
		dispatch( setEntityRecords( 'groups', [] ) );
		return;
	}

	dispatch( setEntityLoading( 'groups', true ) );
	try {
		const records = await apiFetch( { path: ENTITY_PATHS.groups } );
		dispatch( setEntityRecords( 'groups', records ) );
	} catch ( error ) {
		console.error( 'Error fetching groups:', error );
		dispatch( setEntityError( 'groups', error?.message || 'Failed to load groups.' ) );
	}
};

/**
 * Resolver for getPlacements selector.
 * Fetches all placements from REST API on first access.
 */
export const getPlacements = () => async ( { dispatch, select } ) => {
	if ( select.hasLoadedPlacements() ) {
		return;
	}

	dispatch( setEntityLoading( 'placements', true ) );
	try {
		const records = await apiFetch( { path: ENTITY_PATHS.placements } );
		dispatch( setEntityRecords( 'placements', records ) );
	} catch ( error ) {
		console.error( 'Error fetching placements:', error );
		dispatch( setEntityError( 'placements', error?.message || 'Failed to load placements.' ) );
	}
};
