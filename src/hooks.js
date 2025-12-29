/**
 * AdVajra Hooks System.
 *
 * @package advajra
 */
import { createHooks } from '@wordpress/hooks';

const advajraHooks = createHooks();


export const addAction = advajraHooks.addAction;
export const addFilter = advajraHooks.addFilter;
export const removeAction = advajraHooks.removeAction;
export const removeFilter = advajraHooks.removeFilter;
export const doAction = advajraHooks.doAction;
export const applyFilters = advajraHooks.applyFilters;
export const hasAction = advajraHooks.hasAction;
export const hasFilter = advajraHooks.hasFilter;

window.advajraHooks = advajraHooks;

export default advajraHooks;
