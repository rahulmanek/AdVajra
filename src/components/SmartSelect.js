import React, { useState, useRef, useEffect } from 'react';

/**
 * SmartSelect
 */
const SmartSelect = ( {
	options = [],
	value,
	onChange,
	label,
	className = '',
	onOpenChange,
	onDisabledClick,
	popoverClass = '',
} ) => {
	const [ isOpen, setIsOpen ] = useState( false );
	const containerRef = useRef( null );

	// Notify parent when open state changes.
	const handleOpen = ( open ) => {
		setIsOpen( open );
		if ( onOpenChange ) {
			onOpenChange( open );
		}
	};

	// Close on click outside.
	useEffect( () => {
		const handleClickOutside = ( event ) => {
			if (
				containerRef.current &&
				! containerRef.current.contains( event.target )
			) {
				handleOpen( false );
			}
		};

		document.addEventListener( 'mousedown', handleClickOutside );
		return () =>
			document.removeEventListener( 'mousedown', handleClickOutside );
	}, [] );

	// Find selected option object, fallback to first option.
	const selectedOption =
		options.find( ( option ) => option.value === value ) || options[ 0 ];

	return (
		<div className={ `relative ${ className }` } ref={ containerRef }>
			{ label && <label className="advajra-label">{ label }</label> }

			<div
				className={ `w-full advajra-input px-4 py-2 min-h-[40px] flex items-center justify-between cursor-pointer bg-white transition-all duration-200 ${
					isOpen
						? '!border-[color:var(--av-accent-gold)] !ring-2 !ring-[rgba(237,175,3,0.22)]'
						: 'hover:!border-[color:var(--av-accent-gold)]'
				}` }
				onClick={ () => handleOpen( ! isOpen ) }
			>
				<div
					className="flex items-center gap-3 text-slate-700"
					style={ { overflow: 'hidden', minWidth: 0 } }
				>
					{ selectedOption?.icon && (
						<span className="flex-shrink-0 flex items-center justify-center">
							{ selectedOption.icon }
						</span>
					) }
					<span
						className="font-semibold text-sm"
						style={ {
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						} }
					>
						{ selectedOption?.label }
					</span>
				</div>

				<div
					className={ `text-slate-400 transition-transform duration-200 flex items-center justify-center ${
						isOpen ? 'rotate-180' : ''
					}` }
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</div>
			</div>

			{ isOpen && (
				<div
					className={ `absolute z-50 min-w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top ${ popoverClass }` }
					style={ { maxWidth: '320px' } }
				>
					<div className="max-h-[320px] overflow-y-auto p-1.5 space-y-0.5">
						{ options.map( ( option ) => {
							if ( option.isHeader ) {
								return (
									<div
										key={ option.value }
										className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-1 first:border-t-0 first:mt-0"
									>
										{ option.label }
									</div>
								);
							}

							const isSelected = value === option.value;
							const isDisabled = !!option.disabled;
							return (
								<div
									key={ option.value }
									onClick={ () => {
										if ( isDisabled ) {
											if ( onDisabledClick ) onDisabledClick();
											return;
										}
										onChange( option.value );
										handleOpen( false );
									} }
									className={ `flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg text-sm transition-colors ${
										isDisabled ? 'opacity-70' : ''
									} ${
										isSelected && !isDisabled
											? 'bg-[rgba(237,175,3,0.14)] text-[color:var(--av-primary)]'
											: !isDisabled ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-500'
									}` }
								>
									{ option.icon && (
										<span className="flex-shrink-0 flex items-center justify-center">
											{ option.icon }
										</span>
									) }
									<span
										className={ `whitespace-nowrap ${
											isSelected
												? 'font-bold'
												: 'font-medium'
										}` }
									>
										{ option.label }
									</span>

									{ option.isPro && (
										<span className="ml-auto text-[10px] font-bold tracking-wider leading-none bg-amber-500 text-white px-2 py-1 rounded shadow-sm">
											PRO
										</span>
									) }

									{ isSelected && !option.isPro && (
										<span className="ml-auto text-primary">
											<svg
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<polyline points="20 6 9 17 4 12" />
											</svg>
										</span>
									) }
								</div>
							);
						} ) }
					</div>
				</div>
			) }
		</div>
	);
};

export default SmartSelect;
