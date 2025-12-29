/**
 * Store Constants
 *
 * @package advajra
 */

/** Redux store namespace — used with useSelect/useDispatch */
export const STORE_NAME = 'advajra/data';

/** Entity API paths, keyed by entity type */
export const ENTITY_PATHS = {
	ads:        '/advajra/v1/ads',
	groups:     '/advajra/v1/groups',
	placements: '/advajra/v1/placements',
};

/** Action type constants */
export const SET_ENTITY_RECORDS   = 'SET_ENTITY_RECORDS';
export const RECEIVE_ENTITY       = 'RECEIVE_ENTITY';
export const UPDATE_ENTITY        = 'UPDATE_ENTITY';
export const REMOVE_ENTITY        = 'REMOVE_ENTITY';
export const SET_ENTITY_LOADING   = 'SET_ENTITY_LOADING';
export const INVALIDATE_ENTITY    = 'INVALIDATE_ENTITY';
