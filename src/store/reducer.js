/**
 * Store Reducer
 *
 * @package advajra
 */
import { combineReducers } from '@wordpress/data';
import {
	SET_ENTITY_RECORDS,
	RECEIVE_ENTITY,
	UPDATE_ENTITY,
	REMOVE_ENTITY,
	SET_ENTITY_LOADING,
	INVALIDATE_ENTITY,
} from './constants';

/**
 * Default state for a single entity collection.
 */
const DEFAULT_ENTITY_STATE = {
	items:   [],
	loaded:  false,
	loading: false,
};

/**
 * Creates a reducer for a single entity type (ads, groups, or placements).
 * All three entity reducers share the same logic — only the `entity` key differs.
 *
 * @param {string} entity - Entity type key (e.g. 'ads', 'groups', 'placements').
 * @return {Function} Redux reducer function.
 */
const createEntityReducer = ( entity ) => ( state = DEFAULT_ENTITY_STATE, action ) => {
	// Only handle actions targeted at this entity type.
	if ( action.entity !== entity ) {
		return state;
	}

	switch ( action.type ) {
		case SET_ENTITY_LOADING:
			return { ...state, loading: action.loading };

		case SET_ENTITY_RECORDS:
			return {
				...state,
				items:   action.records,
				loaded:  true,
				loading: false,
			};

		case RECEIVE_ENTITY:
			// Upsert: update existing or append new.
			return {
				...state,
				items: state.items.some( ( item ) => item.id === action.record.id )
					? state.items.map( ( item ) =>
						item.id === action.record.id ? action.record : item
					)
					: [ ...state.items, action.record ],
			};

		case UPDATE_ENTITY:
			return {
				...state,
				items: state.items.map( ( item ) =>
					item.id === action.id
						? { ...item, ...action.changes }
						: item
				),
			};

		case REMOVE_ENTITY:
			return {
				...state,
				items: state.items.filter( ( item ) => item.id !== action.id ),
			};

		case INVALIDATE_ENTITY:
			return { ...state, loaded: false };

		default:
			return state;
	}
};

/**
 * Root reducer — combines entity sub-reducers.
 */
export default combineReducers( {
	ads:        createEntityReducer( 'ads' ),
	groups:     createEntityReducer( 'groups' ),
	placements: createEntityReducer( 'placements' ),
} );
