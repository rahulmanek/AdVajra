/**
 * Store Actions
 *
 * Plain action creators for synchronous state changes,
 * and thunks for async API mutations.
 *
 * Thunks receive { dispatch, select } and can perform
 * optimistic updates + API sync in a single function.
 *
 * @package advajra
 */
import {
	SET_ENTITY_RECORDS,
	RECEIVE_ENTITY,
	UPDATE_ENTITY,
	REMOVE_ENTITY,
	SET_ENTITY_LOADING,
	INVALIDATE_ENTITY,
	ENTITY_PATHS,
} from './constants';
import apiFetch from '@wordpress/api-fetch';


/**
 * Store a full list of entity records (called after initial fetch).
 *
 * @param {string} entity  - Entity type ('ads', 'groups', 'placements').
 * @param {Array}  records - Array of entity records from API.
 * @return {Object} Action object.
 */
export const setEntityRecords = ( entity, records ) => ( {
	type: SET_ENTITY_RECORDS,
	entity,
	records,
} );

/**
 * Receive (upsert) a single entity record into the store.
 *
 * @param {string} entity - Entity type.
 * @param {Object} record - Entity record with `id`.
 * @return {Object} Action object.
 */
export const receiveEntity = ( entity, record ) => ( {
	type: RECEIVE_ENTITY,
	entity,
	record,
} );

/**
 * Partially update a cached entity record.
 *
 * @param {string} entity  - Entity type.
 * @param {number} id      - Entity ID.
 * @param {Object} changes - Partial data to merge.
 * @return {Object} Action object.
 */
export const updateEntityRecord = ( entity, id, changes ) => ( {
	type: UPDATE_ENTITY,
	entity,
	id,
	changes,
} );

/**
 * Remove an entity record from the cache.
 *
 * @param {string} entity - Entity type.
 * @param {number} id     - Entity ID.
 * @return {Object} Action object.
 */
export const removeEntityRecord = ( entity, id ) => ( {
	type: REMOVE_ENTITY,
	entity,
	id,
} );

/**
 * Set loading state for an entity type.
 *
 * @param {string}  entity  - Entity type.
 * @param {boolean} loading - Whether loading is in progress.
 * @return {Object} Action object.
 */
export const setEntityLoading = ( entity, loading ) => ( {
	type: SET_ENTITY_LOADING,
	entity,
	loading,
} );

/**
 * Mark an entity type as stale so its resolver re-fetches.
 *
 * @param {string} entity - Entity type.
 * @return {Object} Action object.
 */
export const invalidateEntity = ( entity ) => ( {
	type: INVALIDATE_ENTITY,
	entity,
} );


/**
 * Save (update) a placement via PUT and update the cache.
 *
 * @param {number} id   - Placement ID.
 * @param {Object} data - Fields to update.
 * @return {Function} Thunk.
 */
export const savePlacement = ( id, data ) => async ( { dispatch } ) => {
	const result = await apiFetch( {
		path: `${ ENTITY_PATHS.placements }/${ id }`,
		method: 'PUT',
		data,
	} );
	dispatch( receiveEntity( 'placements', result ) );
	return result;
};

/**
 * Create a new placement via POST and add to cache.
 *
 * @param {Object} data - Placement fields.
 * @return {Function} Thunk.
 */
export const createPlacement = ( data ) => async ( { dispatch } ) => {
	const result = await apiFetch( {
		path: ENTITY_PATHS.placements,
		method: 'POST',
		data,
	} );
	dispatch( receiveEntity( 'placements', result ) );
	return result;
};

/**
 * Delete a placement via DELETE and remove from cache.
 *
 * @param {number} id - Placement ID.
 * @return {Function} Thunk.
 */
export const deletePlacement = ( id ) => async ( { dispatch } ) => {
	dispatch( removeEntityRecord( 'placements', id ) );
	await apiFetch( {
		path: `${ ENTITY_PATHS.placements }/${ id }`,
		method: 'DELETE',
	} );
};

/**
 * Duplicate a placement.
 *
 * @param {Object} placement - Original placement record.
 * @return {Function} Thunk.
 */
export const duplicatePlacement = ( placement ) => async ( { dispatch } ) => {
	const hooks = window.advajraHooks;
	if ( ! hooks ) {
		return { success: false, reason: 'pro_required' };
	}

	const handler = hooks.applyFilters( 'advajra.placements.duplicateHandler', null );
	if ( ! handler ) {
		return { success: false, reason: 'pro_required' };
	}

	try {
		const result = await handler( placement );

		if ( ! result || ! result.id ) {
			return {
				success: false,
				reason: result?.message || result?.reason || 'duplicate_failed',
				data: result,
			};
		}

		dispatch( receiveEntity( 'placements', result ) );
		return { success: true, data: result };
	} catch ( error ) {
		return {
			success: false,
			reason: error?.message || 'duplicate_failed',
			error,
		};
	}
};

/**
 * Save (update) a group via PUT/POST and update cache.
 *
 * @param {number|null} id   - Group ID (null = new).
 * @param {Object}      data - Group fields.
 * @return {Function} Thunk.
 */
export const saveGroup = ( id, data ) => async ( { dispatch } ) => {
	const isNew = ! id || id === 'new';
	const result = await apiFetch( {
		path: isNew ? ENTITY_PATHS.groups : `${ ENTITY_PATHS.groups }/${ id }`,
		method: isNew ? 'POST' : 'PUT',
		data,
	} );
	dispatch( receiveEntity( 'groups', result ) );
	return result;
};

/**
 * Delete a group via DELETE and remove from cache.
 *
 * @param {number} id - Group ID.
 * @return {Function} Thunk.
 */
export const deleteGroup = ( id ) => async ( { dispatch } ) => {
	dispatch( removeEntityRecord( 'groups', id ) );
	await apiFetch( {
		path: `${ ENTITY_PATHS.groups }/${ id }`,
		method: 'DELETE',
	} );
};

/**
 * Duplicate a group.
 *
 * @param {Object} group - Original group record.
 * @return {Function} Thunk.
 */
export const duplicateGroup = ( group ) => async ( { dispatch } ) => {
	const hooks = window.advajraHooks;
	if ( ! hooks ) {
		return { success: false, reason: 'pro_required' };
	}

	const handler = hooks.applyFilters( 'advajra.groups.duplicateHandler', null );
	if ( ! handler ) {
		return { success: false, reason: 'pro_required' };
	}

	try {
		const result = await handler( group );

		if ( ! result || ! result.id ) {
			return {
				success: false,
				reason: result?.message || result?.reason || 'duplicate_failed',
				data: result,
			};
		}

		dispatch( receiveEntity( 'groups', result ) );
		return { success: true, data: result };
	} catch ( error ) {
		return {
			success: false,
			reason: error?.message || 'duplicate_failed',
			error,
		};
	}
};

/**
 * Save (create or update) an ad and update cache.
 *
 * @param {number|null} id   - Ad ID (null = new).
 * @param {Object}      data - Ad fields.
 * @return {Function} Thunk.
 */
export const saveAd = ( id, data ) => async ( { dispatch } ) => {
	const isNew = ! id;
	const result = await apiFetch( {
		path: isNew ? ENTITY_PATHS.ads : `${ ENTITY_PATHS.ads }/${ id }`,
		method: isNew ? 'POST' : 'PUT',
		data,
	} );
	dispatch( receiveEntity( 'ads', result ) );
	return result;
};

/**
 * Delete an ad via DELETE and remove from cache.
 *
 * @param {number}  id      - Ad ID.
 * @param {Object}  options - { silent: boolean }.
 * @return {Function} Thunk.
 */
export const deleteAd = ( id, options = {} ) => async ( { dispatch } ) => {
	const { silent = false } = options;
	if ( ! silent && ! window.confirm( 'Are you sure you want to delete this ad? This action cannot be undone.' ) ) {
		return false;
	}
	dispatch( removeEntityRecord( 'ads', id ) );
	await apiFetch( {
		path: `${ ENTITY_PATHS.ads }/${ id }`,
		method: 'DELETE',
	} );
	return true;
};

/**
 * Duplicate an ad.
 *
 * @param {number} id - Ad ID.
 * @return {Function} Thunk.
 */
export const duplicateAd = ( id ) => async ( { dispatch, select } ) => {
	const hooks = window.advajraHooks;
	if ( ! hooks ) {
		return { success: false, reason: 'pro_required' };
	}

	const handler = hooks.applyFilters( 'advajra.ads.duplicateHandler', null );
	if ( ! handler ) {
		return { success: false, reason: 'pro_required' };
	}

	// Get current ads, let PRO handler do its thing,
	// then refresh the full ads list from the store.
	const currentAds = select.getAds();
	const setAds = ( updater ) => {
		const newAds = typeof updater === 'function' ? updater( currentAds ) : updater;
		dispatch( setEntityRecords( 'ads', newAds ) );
	};

	try {
		const result = await handler( id, currentAds, setAds );

		if ( ! result?.success ) {
			return {
				success: false,
				reason: result?.message || result?.reason || 'duplicate_failed',
				data: result,
			};
		}

		return result;
	} catch ( error ) {
		return {
			success: false,
			reason: error?.message || 'duplicate_failed',
			error,
		};
	}
};

/**
 * Force re-fetch of a specific entity collection.
 *
 * @param {string} entity - Entity type.
 * @return {Function} Thunk.
 */
export const refreshEntity = ( entity ) => async ( { dispatch } ) => {
	dispatch( setEntityLoading( entity, true ) );
	try {
		const records = await apiFetch( { path: ENTITY_PATHS[ entity ] } );
		dispatch( setEntityRecords( entity, records ) );
	} catch ( error ) {
		console.error( `Error refreshing ${ entity }:`, error );
		dispatch( setEntityLoading( entity, false ) );
	}
};
