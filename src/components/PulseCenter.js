/**
 * Vajra Pulse Center
 *
 * Temporary, high-emphasis feedback for actions that just happened.
 * Persistent notifications live in the Inbox as Signals.
 */
import { useNotification } from '../context/NotificationDataCtx';

const TYPE_META = {
	success: {
		className: 'is-success',
		label: 'Success',
	},
	error: {
		className: 'is-error',
		label: 'Needs attention',
	},
	warning: {
		className: 'is-warning',
		label: 'Warning',
	},
	info: {
		className: 'is-info',
		label: 'Info',
	},
};

const getPulseMeta = ( type = 'success' ) =>
	TYPE_META[ type ] || TYPE_META.info;

const PulseCenter = () => {
	const { notifications, removeNotification } = useNotification();
	const visiblePulses = notifications.slice( -4 );

	if ( visiblePulses.length === 0 ) {
		return null;
	}

	return (
		<div
			className="av-pulse-center"
			aria-live="polite"
			aria-relevant="additions text"
		>
			<div className="av-pulse-center__constellation" aria-hidden="true">
				{ visiblePulses.slice( 0, -1 ).map( ( pulse, index ) => (
					<span
						key={ `satellite-${ pulse.id }` }
						className={ [
							'av-pulse-center__satellite',
							getPulseMeta( pulse.type ).className,
						].join( ' ' ) }
						style={ { '--av-pulse-satellite': index } }
					/>
				) ) }
			</div>

			{ visiblePulses.map( ( pulse, index ) => {
				const meta = getPulseMeta( pulse.type );
				const isPrimary = index === visiblePulses.length - 1;

				return (
					<VajraPulse
						key={ pulse.id }
						pulse={ pulse }
						meta={ meta }
						isPrimary={ isPrimary }
						stackIndex={ visiblePulses.length - 1 - index }
						onDismiss={ () => removeNotification( pulse.id ) }
					/>
				);
			} ) }
		</div>
	);
};

const VajraPulse = ( { pulse, meta, isPrimary, stackIndex, onDismiss } ) => (
	<button
		type="button"
		className={ [
			'av-vajra-pulse',
			meta.className,
			isPrimary ? 'is-primary' : 'is-echo',
		].join( ' ' ) }
		style={ {
			'--av-pulse-stack': stackIndex,
			'--av-pulse-duration': `${ pulse.duration || 4200 }ms`,
		} }
		onClick={ onDismiss }
		aria-label={ `${ meta.label }: ${ pulse.message }` }
	>
		<span className="av-vajra-pulse__aura" aria-hidden="true" />
		<span className="av-vajra-pulse__scan" aria-hidden="true" />
		<span className="av-vajra-pulse__ring" aria-hidden="true" />
		<span className="av-vajra-pulse__core">
			<span className="av-vajra-pulse__glyph" aria-hidden="true">
				<PulseGlyph type={ pulse.type } />
			</span>
			<span className="av-vajra-pulse__copy">
				<span className="av-vajra-pulse__kicker">{ meta.label }</span>
				<span className="av-vajra-pulse__message">
					{ pulse.message }
				</span>
			</span>
		</span>
		<span className="av-vajra-pulse__timer" aria-hidden="true" />
	</button>
);

const PulseGlyph = ( { type } ) => {
	if ( type === 'error' || type === 'warning' ) {
		return (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					className="av-pulse-glyph__shape"
					d="M12 3.25 21 19H3L12 3.25Z"
				/>
				<path className="av-pulse-glyph__mark" d="M12 8.1v5.4" />
				<path className="av-pulse-glyph__dot" d="M12 16.9h.01" />
			</svg>
		);
	}

	if ( type === 'info' ) {
		return (
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					className="av-pulse-glyph__shape"
					d="M12 3.2 19.7 7.6v8.8L12 20.8l-7.7-4.4V7.6L12 3.2Z"
				/>
				<path className="av-pulse-glyph__mark" d="M12 10.6v5.4" />
				<path className="av-pulse-glyph__dot" d="M12 7.8h.01" />
			</svg>
		);
	}

	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path
				className="av-pulse-glyph__shape"
				d="M12 3.2 19.7 7.6v8.8L12 20.8l-7.7-4.4V7.6L12 3.2Z"
			/>
			<path
				className="av-pulse-glyph__mark"
				d="m8.1 12.2 2.55 2.55L16.4 9"
			/>
		</svg>
	);
};

export default PulseCenter;
