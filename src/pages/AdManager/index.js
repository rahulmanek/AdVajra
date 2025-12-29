/**
 * index.js
 *
 * Entry point for the AdManager module.
 * Data is provided by the centralised @wordpress/data store (advajra/data).
 */
import React from 'react';
import AdManagerLayout from './AdManagerLayout';

const AdManager = () => {
	return <AdManagerLayout />;
};

export default AdManager;
