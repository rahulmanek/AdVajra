import React, { createContext, useCallback, useContext, useState } from 'react';

const NotificationContext = createContext();
const DEFAULT_PULSE_DURATION = 4200;

export const useNotification = () => {
	const context = useContext( NotificationContext );
	if ( ! context ) {
		throw new Error(
			'useNotification must be used within a NotificationProvider'
		);
	}
	return context;
};

export const NotificationProvider = ( { children } ) => {
	const [ notifications, setNotifications ] = useState( [] );

	const removeNotification = useCallback( ( id ) => {
		setNotifications( ( prev ) => prev.filter( ( n ) => n.id !== id ) );
	}, [] );

	const addPulse = useCallback(
		( arg1, arg2 = 'success' ) => {
			let message = arg1;
			let type = arg2;
			let duration = DEFAULT_PULSE_DURATION;

			if ( typeof arg1 === 'object' && arg1 !== null ) {
				message = arg1.message;
				type = arg1.type || 'success';
				duration = arg1.duration || DEFAULT_PULSE_DURATION;
			}

			if ( ! message ) {
				return null;
			}

			const id = `${ Date.now() }-${ Math.random()
				.toString( 36 )
				.slice( 2 ) }`;
			const pulse = {
				id,
				message,
				type,
				duration,
				createdAt: Date.now(),
			};

			setNotifications( ( prev ) => [ ...prev.slice( -5 ), pulse ] );

			window.setTimeout( () => {
				removeNotification( id );
			}, duration );

			return id;
		},
		[ removeNotification ]
	);

	return (
		<NotificationContext.Provider
			value={ {
				addPulse,
				removePulse: removeNotification,
				pulses: notifications,
				addNotification: addPulse,
				notifications,
				removeNotification,
			} }
		>
			{ children }
		</NotificationContext.Provider>
	);
};
