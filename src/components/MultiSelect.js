import React, { useState, useRef, useEffect } from 'react';

/**
 * MultiSelect
 *
 * A multi-select dropdown with chip/token support.
 * Designed for AdVajra Targeting Builder.
 *
 * @param {Array} options - Array of { value, label, icon? } or Object { val: label }
 * @param {Array} value - Current selected values (array)
 * @param {Function} onChange - Callback (valuesArray) => {}
 * @param {string} placeholder - Placeholder text
 */
const MultiSelect = ({ options, value = [], onChange, placeholder = 'Select...' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Normalize options to array of { value, label }
    const normalizedOptions = Array.isArray(options)
        ? options.map(opt => typeof opt === 'object' ? opt : { value: opt, label: opt })
        : Object.entries(options).map(([val, label]) => ({ value: val, label }));

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (optValue) => {
        const newValue = [...value];
        const index = newValue.indexOf(optValue);
        if (index > -1) {
            newValue.splice(index, 1);
        } else {
            newValue.push(optValue);
        }
        onChange(newValue);
    };

    const removeOption = (e, optValue) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== optValue));
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Trigger / Chip Container */}
            <div
                className={`
                    w-full min-h-[40px] advajra-input px-2 py-1.5 flex flex-wrap gap-1.5 items-center cursor-pointer
                    bg-white transition-all duration-200
                    ${isOpen ? '!border-[color:var(--av-accent-gold)] !ring-2 !ring-[rgba(237,175,3,0.22)]' : 'hover:!border-[color:var(--av-accent-gold)]'}
                `}
                onClick={() => setIsOpen(!isOpen)}
            >
                {value.length === 0 && (
                    <span className="text-slate-400 text-sm ml-2 font-medium">{placeholder}</span>
                )}

                {value.map(val => {
                    const opt = normalizedOptions.find(o => o.value == val);
                    return (
                        <div key={val} className="flex items-center gap-1.5 bg-[rgba(237,175,3,0.14)] text-[color:var(--av-primary)] px-2 py-1 rounded-lg text-xs font-bold border border-[rgba(237,175,3,0.25)] animate-in fade-in zoom-in-95 duration-200">
                            {opt?.label || val}
                            <span
                                onClick={(e) => removeOption(e, val)}
                                className="hover:text-[color:var(--av-primary)] cursor-pointer p-0.5 rounded-full hover:bg-[rgba(237,175,3,0.20)] flex items-center justify-center transition-colors"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </span>
                        </div>
                    );
                })}

                {/* Chevron */}
                <div className={`ml-auto mr-2 text-slate-400 transition-transform duration-200 flex items-center justify-center ${isOpen ? 'rotate-180' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
                    <div className="max-h-[240px] overflow-y-auto p-1.5 space-y-0.5">
                        {normalizedOptions.map((option) => {
                            const isSelected = value.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    onClick={() => toggleOption(option.value)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg text-sm transition-colors
                                        ${isSelected ? 'bg-[rgba(237,175,3,0.14)] text-[color:var(--av-primary)]' : 'text-slate-600 hover:bg-slate-50'}
                                    `}
                                >
                                    <div className={`
                                        w-4 h-4 border rounded flex items-center justify-center transition-all
                                        ${isSelected ? 'bg-primary border-primary' : 'border-slate-300 bg-white'}
                                    `}>
                                        {isSelected && (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                    <span className={isSelected ? 'font-bold' : 'font-medium'}>
                                        {option.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
