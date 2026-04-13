( function () {
	'use strict';

	const CONFIG = window.advajra_config || {};
	const API_URL = CONFIG.api_url || '/wp-json/advajra/v1/tracking';
	const NONCE = CONFIG.nonce || '';
	const FLUSH_DELAY_MS = Math.max(
		250,
		parseInt( CONFIG.flush_delay_ms, 10 ) || 1200
	);
	const VISIBILITY_THRESHOLD = 0.5;

	let eventQueue = [];
	let flushTimer = null;
	const viewabilityState = new Map();

	function recordEvent( id, type, value ) {
		const adId = parseInt( id, 10 );
		if ( ! adId || ! type ) {
			return;
		}

		const event = {
			id: adId,
			type,
			ts: Date.now(),
		};

		if ( typeof value === 'number' && Number.isFinite( value ) ) {
			const rounded = Math.round( value );
			if ( rounded !== 0 ) {
				event.value = rounded;
			}
		}

		eventQueue.push( event );
		scheduleFlush();
	}

	function clearScheduledFlush() {
		if ( flushTimer !== null ) {
			window.clearTimeout( flushTimer );
			flushTimer = null;
		}
	}

	function scheduleFlush() {
		if ( flushTimer !== null ) {
			return;
		}

		flushTimer = window.setTimeout( function () {
			flushTimer = null;
			flushQueue();
		}, FLUSH_DELAY_MS );
	}

	function flushQueue( options ) {
		const includeVisibleDurations = Boolean(
			options && options.includeVisibleDurations
		);
		const forceFlush = Boolean( options && options.force );

		if ( forceFlush ) {
			clearScheduledFlush();
		}

		if ( includeVisibleDurations ) {
			commitVisibleDurations();
		}

		if ( eventQueue.length === 0 ) {
			return;
		}

		const batch = [ ...eventQueue ];
		eventQueue = [];
		const payload = JSON.stringify( { events: batch } );

		if ( navigator.sendBeacon ) {
			const blob = new Blob( [ payload ], { type: 'application/json' } );
			const sent = navigator.sendBeacon(
				API_URL + '?_wpnonce=' + NONCE,
				blob
			);

			if ( sent ) {
				return;
			}
		}

		fetch( API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': NONCE,
			},
			body: payload,
			keepalive: true,
		} ).catch( function ( err ) {
			eventQueue = batch.concat( eventQueue );
			console.warn( '[AdVajra] Tracking retry queued:', err.message );
		} );
	}

	function getTrackingState( adId ) {
		if ( ! viewabilityState.has( adId ) ) {
			viewabilityState.set( adId, {
				visibleSince: null,
				viewableTracked: false,
			} );
		}
		return viewabilityState.get( adId );
	}

	function startVisibleSession( adEl ) {
		const adId = adEl.dataset.adId;
		const tracking = adEl.dataset.tracking;

		if ( ! adId || ( tracking !== 'both' && tracking !== 'impressions' ) ) {
			return;
		}

		const state = getTrackingState( adId );
		const now = performance.now();

		if ( ! state.viewableTracked ) {
			recordEvent( adId, 'viewable' );
			state.viewableTracked = true;
		}

		if ( state.visibleSince === null ) {
			state.visibleSince = now;
		}
	}

	function endVisibleSession( adEl ) {
		const adId = adEl.dataset.adId;
		if ( ! adId ) {
			return;
		}

		const state = getTrackingState( adId );
		if ( state.visibleSince === null ) {
			return;
		}

		const duration = Math.round( performance.now() - state.visibleSince );
		if ( duration > 0 ) {
			recordEvent( adId, 'viewable_time', duration );
		}

		state.visibleSince = null;
	}

	function commitVisibleDurations() {
		const now = performance.now();

		viewabilityState.forEach( function ( state, adId ) {
			if ( state.visibleSince === null ) {
				return;
			}

			const duration = Math.round( now - state.visibleSince );
			if ( duration > 0 ) {
				recordEvent( adId, 'viewable_time', duration );
				state.visibleSince = now;
			}
		} );
	}

	function sampleLoadTime( adEl ) {
		if ( CONFIG.disable_load_time_sampling ) {
			return;
		}

		if ( ! adEl || adEl.dataset.loadSampled === 'true' ) {
			return;
		}

		const adId = adEl.dataset.adId;
		const tracking = adEl.dataset.tracking;

		if ( ! adId || ( tracking !== 'both' && tracking !== 'impressions' ) ) {
			return;
		}

		const sample = Math.round( performance.now() );
		if ( sample > 0 ) {
			recordEvent( adId, 'load_time', sample );
		}

		adEl.dataset.loadSampled = 'true';
	}

	function getVisibleRatio( el ) {
		if ( ! el || typeof el.getBoundingClientRect !== 'function' ) {
			return 0;
		}

		const rect = el.getBoundingClientRect();
		const width = rect.width || 0;
		const height = rect.height || 0;

		if ( width <= 0 || height <= 0 ) {
			return 0;
		}

		const viewportWidth =
			window.innerWidth || document.documentElement.clientWidth || 0;
		const viewportHeight =
			window.innerHeight || document.documentElement.clientHeight || 0;

		const visibleWidth =
			Math.min( rect.right, viewportWidth ) - Math.max( rect.left, 0 );
		const visibleHeight =
			Math.min( rect.bottom, viewportHeight ) - Math.max( rect.top, 0 );

		if ( visibleWidth <= 0 || visibleHeight <= 0 ) {
			return 0;
		}

		const visibleArea = visibleWidth * visibleHeight;
		const totalArea = width * height;

		return totalArea > 0 ? visibleArea / totalArea : 0;
	}

	function markVisibleIfEligible( ad ) {
		const tracking = ad.dataset.tracking;

		if ( tracking !== 'both' && tracking !== 'impressions' ) {
			return;
		}

		if ( getVisibleRatio( ad ) < VISIBILITY_THRESHOLD ) {
			return;
		}

		if ( ! ad.dataset.impressed ) {
			ad.dataset.impressed = 'true';
			recordEvent( ad.dataset.adId, 'impression' );
		}

		startVisibleSession( ad );
	}

	const impressionObserver =
		typeof IntersectionObserver !== 'undefined'
			? new IntersectionObserver(
					function ( entries ) {
						entries.forEach( function ( entry ) {
							const adEl = entry.target;
							const tracking = adEl.dataset.tracking;

							if (
								entry.isIntersecting &&
								entry.intersectionRatio >= VISIBILITY_THRESHOLD
							) {
								if (
									! adEl.dataset.impressed &&
									( tracking === 'both' ||
										tracking === 'impressions' )
								) {
									adEl.dataset.impressed = 'true';
									recordEvent(
										adEl.dataset.adId,
										'impression'
									);
								}
								startVisibleSession( adEl );
								return;
							}

							endVisibleSession( adEl );
						} );
					},
					{ threshold: [ VISIBILITY_THRESHOLD ] }
			  )
			: null;

	function processClickFraudDefense( adId, adWrapper ) {
		if ( ! CONFIG.cfp_enabled ) {
			return true;
		}

		const maxClicks = parseInt( CONFIG.cfp_max_clicks, 10 ) || 3;
		const detectionWindowMins =
			parseInt( CONFIG.cfp_detection_window_minutes, 10 ) || 10;
		const banDurationMins =
			parseInt( CONFIG.cfp_duration_minutes, 10 ) || 360;

		const clicksKey = `advajra_clicks_${ adId }`;
		const banKey = `advajra_ban_${ adId }`;
		const now = Date.now();

		try {
			const banUntil = localStorage.getItem( banKey );
			if ( banUntil && now < parseInt( banUntil, 10 ) ) {
				adWrapper.remove();
				return false;
			}
			if ( banUntil && now >= parseInt( banUntil, 10 ) ) {
				localStorage.removeItem( banKey );
				localStorage.removeItem( clicksKey );
			}
		} catch ( e ) {
			// ignore storage errors
		}

		let clickHistory = [];
		try {
			const stored = localStorage.getItem( clicksKey );
			if ( stored ) {
				clickHistory = JSON.parse( stored );
			}
		} catch ( e ) {
			// ignore storage errors
		}

		const cutoff = now - detectionWindowMins * 60 * 1000;
		clickHistory = clickHistory.filter(
			( timestamp ) => timestamp > cutoff
		);
		clickHistory.push( now );

		if ( clickHistory.length >= maxClicks ) {
			try {
				const banExpiry = now + banDurationMins * 60 * 1000;
				localStorage.setItem( banKey, banExpiry.toString() );
				localStorage.removeItem( clicksKey );
			} catch ( e ) {
				// ignore storage errors
			}

			setTimeout( function () {
				if ( adWrapper && adWrapper.parentNode ) {
					adWrapper.remove();
				}
			}, 150 );

			return true;
		}

		try {
			localStorage.setItem( clicksKey, JSON.stringify( clickHistory ) );
		} catch ( e ) {
			// ignore storage errors
		}

		return true;
	}

	document.addEventListener( 'click', function ( e ) {
		const adWrapper = e.target.closest( '[data-ad-id]' );
		if ( ! adWrapper || ! adWrapper.dataset.adId ) {
			return;
		}

		const adId = adWrapper.dataset.adId;
		const isClickAllowed = processClickFraudDefense( adId, adWrapper );
		if ( ! isClickAllowed ) {
			e.preventDefault();
			console.warn( '[AdVajra] Click blocked by Fraud Protection.' );
			return;
		}

		const tracking = adWrapper.dataset.tracking;
		if ( tracking === 'both' || tracking === 'clicks' ) {
			recordEvent( adId, 'click' );
			flushQueue( { force: true } );
		}
	} );

	document.addEventListener( 'visibilitychange', function () {
		if ( document.visibilityState === 'hidden' ) {
			flushQueue( { includeVisibleDurations: true, force: true } );
		}
	} );

	window.addEventListener( 'pagehide', function () {
		flushQueue( { includeVisibleDurations: true, force: true } );
	} );
	window.addEventListener( 'beforeunload', function () {
		flushQueue( { includeVisibleDurations: true, force: true } );
	} );

	function init() {
		const ads = document.querySelectorAll( '[data-ad-id]' );

		if ( CONFIG.cfp_enabled ) {
			const now = Date.now();
			ads.forEach( function ( ad ) {
				const adId = ad.dataset.adId;
				const banKey = `advajra_ban_${ adId }`;
				try {
					const banUntil = localStorage.getItem( banKey );
					if ( banUntil && now < parseInt( banUntil, 10 ) ) {
						ad.remove();
					} else if ( banUntil && now >= parseInt( banUntil, 10 ) ) {
						localStorage.removeItem( banKey );
					}
				} catch ( e ) {
					// ignore storage errors
				}
			} );
		}

		document.querySelectorAll( '[data-ad-id]' ).forEach( function ( ad ) {
			const tracking = ad.dataset.tracking;
			sampleLoadTime( ad );

			if ( tracking !== 'both' && tracking !== 'impressions' ) {
				ad.dataset.impressed = 'true';
				return;
			}

			if ( ! impressionObserver ) {
				if ( ! ad.dataset.impressed ) {
					ad.dataset.impressed = 'true';
					recordEvent( ad.dataset.adId, 'impression' );
					recordEvent( ad.dataset.adId, 'viewable' );
				}
				return;
			}

			if ( ad.dataset.observing !== 'true' ) {
				impressionObserver.observe( ad );
				ad.dataset.observing = 'true';
			}
		} );

		// Defer initial visibility checks to avoid synchronous layout reflow
		// blocking first paint. IntersectionObserver handles ongoing tracking.
		var deferFn = typeof requestIdleCallback === 'function'
			? requestIdleCallback
			: function ( cb ) { setTimeout( cb, 50 ); };
		deferFn( function () {
			document.querySelectorAll( '[data-ad-id][data-tracking]' ).forEach( function ( ad ) {
				if ( ad.dataset.impressed !== 'true' ) {
					markVisibleIfEligible( ad );
				}
			} );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

	window.advajraTrackingInit = init;
} )();
