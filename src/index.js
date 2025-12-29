import { createRoot } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import App from './App';
import './hooks';
import './style.scss';


if ( window.advajraSettings ) {
    apiFetch.use( apiFetch.createRootURLMiddleware( window.advajraSettings.root ) );
    apiFetch.use( apiFetch.createNonceMiddleware( window.advajraSettings.nonce ) );
}

const container = document.getElementById( 'advajra-app' );

if ( container ) {
	const root = createRoot( container );
	root.render( <App /> );
}
