/**
 * AdVajra — Deactivation Survey
 */
'use strict';

( function () {
	const cfg = window.advajraDeactivation || {};

	// ── Reasons config ────────────────────────────────────────────────────────
	const REASONS = [
		{
			key:   'bug',
			icon:  '🐛',
			label: 'Found a bug',
			nudge: {
				icon: '🛠️',
				html: `Please <a href="${ cfg.supportUrl }" target="_blank">report the bug here</a> — we fix critical issues within 24h.`,
			},
			placeholder: 'Describe what happened...',
		},
		{
			key:   'conflict',
			icon:  '🧩',
			label: 'Plugin conflict',
			nudge: {
				icon: '💬',
				html: `We can help troubleshoot conflicts. <a href="${ cfg.supportUrl }" target="_blank">Open a support ticket</a> and we'll sort it out.`,
			},
			placeholder: 'Which plugin is conflicting?',
		},
		{
			key:   'missing_feature',
			icon:  '🔧',
			label: 'Missing a feature',
			nudge: {
				icon: '💡',
				html: `We love feature requests! <a href="${ cfg.featureUrl }" target="_blank">Submit your idea here</a> — it may already be on our roadmap.`,
			},
			placeholder: 'What feature were you looking for?',
		},
		{
			key:   'too_complex',
			icon:  '🤷',
			label: 'Too complex / Hard to set up',
			nudge: null,
			placeholder: 'What was confusing? We\'d love to simplify it.',
		},
		{
			key:   'no_revenue',
			icon:  '📉',
			label: 'Not improving ad revenue',
			nudge: null,
			placeholder: 'Tell us what you expected vs what you saw...',
		},
		{
			key:   'too_expensive',
			icon:  '💰',
			label: 'PRO is too expensive',
			nudge: null,
			placeholder: 'What price point would work for you?',
		},
		{
			key:   'switching',
			icon:  '🔄',
			label: 'Switching to another plugin',
			nudge: null,
			placeholder: 'Which plugin are you switching to?',
		},
		{
			key:   'temporary',
			icon:  '⏸️',
			label: 'Temporarily deactivating',
			nudge: null,
			placeholder: 'Optional: any reason?',
		},
		{
			key:   'no_longer_ads',
			icon:  '🚫',
			label: 'No longer running ads',
			nudge: null,
			placeholder: 'Optional: anything we could have done better?',
		},
		{
			key:   'other',
			icon:  '💬',
			label: 'Other',
			nudge: null,
			placeholder: 'Please share your reason...',
		},
	];

	// ── State ─────────────────────────────────────────────────────────────────
	let deactivateUrl = '';
	let selectedReason = null;

	// ── Build modal HTML ──────────────────────────────────────────────────────
	function buildModal() {
		const reasonCards = REASONS.map( ( r ) =>
			`<button
				type="button"
				class="avds-reason-card"
				data-key="${ r.key }"
				aria-label="${ r.label }"
			>
				<span class="avds-reason-icon">${ r.icon }</span>
				<span class="avds-reason-text">${ r.label }</span>
			</button>`
		).join( '' );

		return `
		<div id="advajra-survey-overlay" role="dialog" aria-modal="true" aria-label="Why are you deactivating AdVajra?">
			<div id="advajra-survey-modal">

				<!-- Header -->
				<div class="avds-header">
					<button class="avds-close" id="avds-close-btn" aria-label="Close">&#x2715;</button>
					<p class="avds-header-eyebrow">AdVajra &mdash; Quick Feedback</p>
					<h2>Before you go&hellip; &#x1F44B;</h2>
					<p>Takes 10 seconds. Helps us improve for you.</p>
				</div>

				<!-- Step 1: Reason selection -->
				<div class="avds-step avds-body" id="avds-step-reasons">
					<p class="avds-section-label">Why are you deactivating?</p>
					<div class="avds-reason-grid">
						${ reasonCards }
					</div>

					<!-- Contextual nudge (shown for bug / conflict / missing_feature) -->
					<div class="avds-nudge" id="avds-nudge">
						<span class="avds-nudge-icon" id="avds-nudge-icon"></span>
						<p id="avds-nudge-text"></p>
					</div>

					<!-- Optional detail textarea -->
					<div class="avds-detail" id="avds-detail">
						<label class="avds-detail-label" for="avds-detail-input">Anything you'd like to share? <span style="color:rgba(255,255,255,0.3)">(optional)</span></label>
						<textarea id="avds-detail-input" name="detail" rows="3" placeholder=""></textarea>
					</div>
				</div>

				<!-- Footer -->
				<div class="avds-footer avds-step" id="avds-step-footer">
					<button class="avds-btn-skip" id="avds-skip-btn" type="button">Skip &amp; Deactivate</button>
					<button class="avds-btn-submit" id="avds-submit-btn" type="button" disabled>
						Send Feedback &amp; Deactivate
					</button>
				</div>

				<!-- Thank you screen -->
				<div class="avds-thankyou avds-step is-hidden" id="avds-thankyou">
					<div class="avds-thankyou-icon">🙏</div>
					<h3>Thank you for your feedback!</h3>
					<p>We genuinely read every response. Deactivating now&hellip;</p>
				</div>

			</div>
		</div>`;
	}

	// ── Mount modal into DOM ──────────────────────────────────────────────────
	function mountModal() {
		if ( document.getElementById( 'advajra-survey-overlay' ) ) return;
		const wrapper = document.createElement( 'div' );
		wrapper.innerHTML = buildModal();
		document.body.appendChild( wrapper.firstElementChild );
		bindEvents();
	}

	// ── Show / hide ───────────────────────────────────────────────────────────
	function showModal( url ) {
		deactivateUrl = url;
		selectedReason = null;
		const overlay = document.getElementById( 'advajra-survey-overlay' );
		if ( ! overlay ) return;
		// Reset state
		document.querySelectorAll( '.avds-reason-card' ).forEach( ( c ) => c.classList.remove( 'is-selected' ) );
		document.getElementById( 'avds-detail' ).classList.remove( 'is-visible' );
		document.getElementById( 'avds-nudge' ).classList.remove( 'is-visible' );
		document.getElementById( 'avds-detail-input' ).value = '';
		document.getElementById( 'avds-submit-btn' ).disabled = true;
		showStep( 'reasons' );

		// Animate in
		overlay.style.display = 'flex';
		requestAnimationFrame( () => {
			requestAnimationFrame( () => overlay.classList.add( 'is-visible' ) );
		} );
	}

	function hideModal() {
		const overlay = document.getElementById( 'advajra-survey-overlay' );
		if ( ! overlay ) return;
		overlay.classList.remove( 'is-visible' );
		setTimeout( () => { overlay.style.display = 'none'; }, 300 );
	}

	function showStep( step ) {
		document.getElementById( 'avds-step-reasons' ).classList.toggle( 'is-hidden', step !== 'reasons' );
		document.getElementById( 'avds-step-footer' ).classList.toggle( 'is-hidden', step !== 'reasons' );
		document.getElementById( 'avds-thankyou' ).classList.toggle( 'is-visible', step === 'thankyou' );
		document.getElementById( 'avds-thankyou' ).classList.toggle( 'is-hidden', step !== 'thankyou' );
	}

	// ── Handle reason card click ──────────────────────────────────────────────
	function selectReason( key ) {
		selectedReason = key;
		const reason = REASONS.find( ( r ) => r.key === key );
		if ( ! reason ) return;

		// Highlight selected card
		document.querySelectorAll( '.avds-reason-card' ).forEach( ( c ) => {
			c.classList.toggle( 'is-selected', c.dataset.key === key );
		} );

		// Show/hide nudge
		const nudge     = document.getElementById( 'avds-nudge' );
		const nudgeIcon = document.getElementById( 'avds-nudge-icon' );
		const nudgeText = document.getElementById( 'avds-nudge-text' );

		if ( reason.nudge ) {
			nudgeIcon.textContent     = reason.nudge.icon;
			nudgeText.innerHTML       = reason.nudge.html;
			nudge.classList.add( 'is-visible' );
		} else {
			nudge.classList.remove( 'is-visible' );
		}

		// Show detail textarea with correct placeholder
		const detailBox = document.getElementById( 'avds-detail' );
		const textarea  = document.getElementById( 'avds-detail-input' );
		textarea.placeholder = reason.placeholder || '';
		detailBox.classList.add( 'is-visible' );

		// Enable submit
		document.getElementById( 'avds-submit-btn' ).disabled = false;
	}

	// ── Submit feedback ───────────────────────────────────────────────────────
	function submitFeedback() {
		const btn    = document.getElementById( 'avds-submit-btn' );
		const detail = document.getElementById( 'avds-detail-input' ).value.trim();

		btn.disabled    = true;
		btn.textContent = 'Sending…';

		const body = new URLSearchParams( {
			action: 'advajra_deactivation_feedback',
			nonce:  cfg.nonce,
			reason: selectedReason || 'other',
			detail,
			email:  cfg.userEmail || '',
		} );

		fetch( cfg.ajaxUrl, {
			method:  'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body:    body.toString(),
		} )
		.then( () => {
			// Show thank you screen, then deactivate after a short pause
			showStep( 'thankyou' );
			setTimeout( () => {
				hideModal();
				window.location.href = deactivateUrl;
			}, 1800 );
		} )
		.catch( () => {
			// On network error, just deactivate silently
			window.location.href = deactivateUrl;
		} );
	}

	// ── Bind events ───────────────────────────────────────────────────────────
	function bindEvents() {
		// Reason cards
		document.querySelectorAll( '.avds-reason-card' ).forEach( ( card ) => {
			card.addEventListener( 'click', () => selectReason( card.dataset.key ) );
		} );

		// Close button
		document.getElementById( 'avds-close-btn' ).addEventListener( 'click', hideModal );

		// Overlay click-outside
		document.getElementById( 'advajra-survey-overlay' ).addEventListener( 'click', function ( e ) {
			if ( e.target === this ) hideModal();
		} );

		// Skip button — go straight to deactivation URL
		document.getElementById( 'avds-skip-btn' ).addEventListener( 'click', () => {
			hideModal();
			window.location.href = deactivateUrl;
		} );

		// Submit button
		document.getElementById( 'avds-submit-btn' ).addEventListener( 'click', submitFeedback );

		// Esc key
		document.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'Escape' ) hideModal();
		} );
	}

	// ── Intercept Deactivate link ─────────────────────────────────────────────
	function interceptDeactivateLink() {
		const pluginFile = cfg.pluginFile; // e.g. "advajra/advajra.php"

		// WordPress generates a row ID from the plugin file slug.
		const rowId = pluginFile.replace( '/', '-' ).replace( '.php', '' );

		// Look for the deactivate link in the plugin row.
		// Could be #advajra-advajra or just scan for the link text.
		const allDeactivateLinks = document.querySelectorAll( `tr.active[data-plugin="${ pluginFile }"] a, #${ rowId } a` );

		allDeactivateLinks.forEach( ( link ) => {
			if ( link.href?.includes( 'deactivate' ) && link.href?.includes( 'plugin=' ) ) {
				link.addEventListener( 'click', function ( e ) {
					e.preventDefault();
					mountModal();
					showModal( this.href );
				} );
			}
		} );

		// Fallback: scan all plugin-action links on the page in case selector missed.
		document.querySelectorAll( '.plugin-action-buttons a, .row-actions a' ).forEach( ( link ) => {
			if (
				link.href?.includes( 'action=deactivate' ) &&
				link.href?.includes( encodeURIComponent( pluginFile ) )
			) {
				link.addEventListener( 'click', function ( e ) {
					e.preventDefault();
					mountModal();
					showModal( this.href );
				} );
			}
		} );
	}

	// ── Init ──────────────────────────────────────────────────────────────────
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', interceptDeactivateLink );
	} else {
		interceptDeactivateLink();
	}
} )();
