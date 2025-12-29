/**
 * AdVajra Data Store
 *
 * Registers the `advajra/data` store with @wordpress/data.
 * Import this file once (in App.js) to make the store available
 * everywhere via useSelect / useDispatch.
 *
 * Usage in components:
 *
 *   import { useSelect, useDispatch } from '@wordpress/data';
 *   import { STORE_NAME } from '../store/constants';
 *
 *   const ads = useSelect( select => select( STORE_NAME ).getAds() );
 *   const { savePlacement } = useDispatch( STORE_NAME );
 *
 * @package advajra
 */
import { createReduxStore, register } from '@wordpress/data';
import { STORE_NAME } from './constants';
import reducer from './reducer';
import * as actions from './actions';
import * as selectors from './selectors';
import * as resolvers from './resolvers';

const store = createReduxStore( STORE_NAME, {
	reducer,
	actions,
	selectors,
	resolvers,
} );

register( store );

export default store;
