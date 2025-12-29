import React from 'react';
import { Icon } from '@wordpress/components';

/**
 * Visual Layout Selector
 * Allows selecting between Default, Float, and Block modes with visual cards.
 */
const LayoutSelector = ({ layout, onChange }) => {
    const { mode, align } = layout;

    const updateMode = (newMode) => {
        // Reset sub-options when changing mode
        const newLayout = { ...layout, mode: newMode };
        if (newMode === 'float' && (layout.align === 'none' || layout.align === 'center' || !layout.align)) {
            newLayout.align = 'left';
        }
        if (newMode === 'block' && (layout.align === 'none' || !layout.align)) {
            newLayout.align = 'center';
        }
        onChange(newLayout);
    };

    const updateAlign = (newAlign) => onChange({ ...layout, align: newAlign });

    return (
        <div className="flex flex-col gap-4">
            {/* Main Mode Cards */}
            <div className="grid grid-cols-3 gap-3">
                {/* Default Card */}
                <div
                    onClick={() => updateMode('default')}
                    className={`ad-layout-card ${mode === 'default' ? 'active' : ''}`}
                >
                    <div className="icon-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                    </div>
                    <span className="label">Default</span>
                </div>

                {/* Float Card */}
                <div
                    onClick={() => updateMode('float')}
                    className={`ad-layout-card ${mode === 'float' ? 'active' : ''}`}
                >
                    <div className="icon-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" className="opacity-20" />
                            <path d="M7 7h5v5H7z" />
                            <path d="M14 7h3 M7 15h10 M7 18h6" strokeLinecap="round" />
                        </svg>
                    </div>
                    <span className="label">Float</span>
                </div>

                {/* Block Card */}
                <div
                    onClick={() => updateMode('block')}
                    className={`ad-layout-card ${mode === 'block' ? 'active' : ''}`}
                >
                    <div className="icon-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="10" width="18" height="4" rx="1" />
                            <path d="M3 6h18 M3 18h18" className="opacity-30" strokeLinecap="round" />
                        </svg>
                    </div>
                    <span className="label">Block</span>
                </div>
            </div>

            {/* Sub Options: Float */}
            {mode === 'float' && (
                <div className="ad-sub-option-group animate-slide-down">
                    {[
                        { id: 'left', label: 'Stick Left', icon: <path d="M3 3h8v8H3z M15 3h6 M15 7h6 M3 15h18 M3 19h18"/> },
                        { id: 'right', label: 'Stick Right', icon: <path d="M13 3h8v8h-8z M3 3h6 M3 7h6 M3 15h18 M3 19h18"/> }
                    ].map(opt => (
                        <div
                            key={opt.id}
                            onClick={() => updateAlign(opt.id)}
                            className={`ad-sub-option-btn ${align === opt.id ? 'active' : ''}`}
                        >
                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {opt.icon}
                             </svg>
                             <span>{opt.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Sub Options: Block */}
            {mode === 'block' && (
                <div className="ad-sub-option-group animate-slide-down">
                    {[
                        { id: 'left', label: 'Left', icon: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></> },
                        { id: 'center', label: 'Center', icon: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></> },
                        { id: 'right', label: 'Right', icon: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></> }
                    ].map(opt => (
                        <div
                            key={opt.id}
                            onClick={() => updateAlign(opt.id)}
                            className={`ad-sub-option-btn mini ${align === opt.id ? 'active' : ''}`}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {opt.icon}
                            </svg>
                            <span>{opt.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LayoutSelector;
