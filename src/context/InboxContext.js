import { createContext, useContext, useState, useEffect, useMemo } from 'react';

const InboxContext = createContext( null );

const LOCAL_STORAGE_KEY = 'advajra_inbox_v2';
const MAX_SIGNALS = 200;
const VALID_TYPES = [ 'critical', 'warning', 'info', 'success' ];

const createWelcomeSignal = () => ( {
	id: 'sig_welcome',
	type: 'info',
	title: 'Welcome to Vajra Inbox',
	message:
		'Important plugin updates, setup alerts, and optimization notices will appear here so you can review them anytime.',
	createdAt: Date.now() - 60000,
	read: false,
	dismissed: false,
} );

const normalizeSignal = ( signal ) => {
	if ( ! signal || typeof signal !== 'object' ) {
		return null;
	}

	const createdAt = Number( signal.createdAt );
	const cta =
		signal.cta && typeof signal.cta === 'object'
			? {
					label: String( signal.cta.label || '' ),
					path: String( signal.cta.path || '' ),
			  }
			: null;

	return {
		id: String(
			signal.id ||
				`sig_${ Date.now() }_${ Math.random()
					.toString( 36 )
					.slice( 2, 9 ) }`
		),
		type: VALID_TYPES.includes( signal.type ) ? signal.type : 'info',
		title: String( signal.title || 'Notification' ),
		message: String( signal.message || '' ),
		cta: cta?.label && cta?.path ? cta : null,
		createdAt: Number.isFinite( createdAt ) ? createdAt : Date.now(),
		read: Boolean( signal.read ),
		dismissed: Boolean( signal.dismissed ),
	};
};

const sortNewestFirst = ( items ) => {
	return [ ...items ].sort( ( a, b ) => b.createdAt - a.createdAt );
};

export const InboxProvider = ( { children } ) => {
	const [ signals, setSignals ] = useState( () => {
		try {
			const raw = window.localStorage.getItem( LOCAL_STORAGE_KEY );
			if ( raw ) {
				const parsed = JSON.parse( raw );
				if ( Array.isArray( parsed ) ) {
					return parsed
						.map( normalizeSignal )
						.filter( Boolean )
						.slice( -MAX_SIGNALS );
				}
			}

			return [ createWelcomeSignal() ];
		} catch {
			return [ createWelcomeSignal() ];
		}
	} );

	// Save to localStorage whenever state changes
	useEffect( () => {
		try {
			window.localStorage.setItem(
				LOCAL_STORAGE_KEY,
				JSON.stringify( signals )
			);
		} catch {
			// Storage can fail in private browsing or restricted admin contexts.
		}
	}, [ signals ] );

	// Active (undismissed) signals — sorted newest first
	const activeSignals = useMemo( () => {
		return sortNewestFirst( signals.filter( ( s ) => ! s.dismissed ) );
	}, [ signals ] );

	// Archive (dismissed) signals — sorted newest first
	const archiveSignals = useMemo( () => {
		return sortNewestFirst( signals.filter( ( s ) => s.dismissed ) );
	}, [ signals ] );

	// Unread signals (active and not read)
	const unreadSignals = useMemo( () => {
		return signals.filter( ( s ) => ! s.dismissed && ! s.read );
	}, [ signals ] );

	const unreadCount = unreadSignals.length;

	const criticalCount = useMemo( () => {
		return unreadSignals.filter( ( s ) => s.type === 'critical' ).length;
	}, [ unreadSignals ] );

	const warningCount = useMemo( () => {
		return unreadSignals.filter( ( s ) => s.type === 'warning' ).length;
	}, [ unreadSignals ] );

	const infoCount = useMemo( () => {
		return unreadSignals.filter(
			( s ) => s.type === 'info' || s.type === 'success'
		).length;
	}, [ unreadSignals ] );

	const addSignal = ( signal ) => {
		setSignals( ( prev ) => {
			const newSignal = normalizeSignal( {
				...signal,
				read: false,
				dismissed: false,
			} );

			if ( ! newSignal ) {
				return prev;
			}

			// Remove duplicates with the same custom static ID if provided
			const filtered = prev.filter( ( s ) => s.id !== newSignal.id );

			// Limit to MAX_SIGNALS
			const updated = [ ...filtered, newSignal ];
			if ( updated.length > MAX_SIGNALS ) {
				updated.shift();
			}
			return updated;
		} );
	};

	const markAsRead = ( id ) => {
		setSignals( ( prev ) =>
			prev.map( ( s ) => ( s.id === id ? { ...s, read: true } : s ) )
		);
	};

	const markAllRead = () => {
		setSignals( ( prev ) =>
			prev.map( ( s ) => ( ! s.dismissed ? { ...s, read: true } : s ) )
		);
	};

	const dismissSignal = ( id ) => {
		setSignals( ( prev ) =>
			prev.map( ( s ) =>
				s.id === id ? { ...s, dismissed: true, read: true } : s
			)
		);
	};

	const deleteSignal = ( id ) => {
		setSignals( ( prev ) => prev.filter( ( s ) => s.id !== id ) );
	};

	const clearAllArchive = () => {
		setSignals( ( prev ) => prev.filter( ( s ) => ! s.dismissed ) );
	};

	return (
		<InboxContext.Provider
			value={ {
				signals,
				activeSignals,
				archiveSignals,
				unreadCount,
				criticalCount,
				warningCount,
				infoCount,
				addSignal,
				markAsRead,
				markAllRead,
				dismissSignal,
				deleteSignal,
				clearAllArchive,
			} }
		>
			{ children }
		</InboxContext.Provider>
	);
};

export const useInbox = () => {
	const context = useContext( InboxContext );
	if ( ! context ) {
		throw new Error( 'useInbox must be used within an InboxProvider' );
	}
	return context;
};
