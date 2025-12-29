const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

module.exports = {
	...defaultConfig,
	entry: {
		index: path.resolve(process.cwd(), 'src', 'index.js'),
		tracking: path.resolve(process.cwd(), 'public', 'tracking.js'),
		'advajra-block': path.resolve(process.cwd(), 'src', 'blocks', 'advajra-ad', 'index.js'),
	},
};
