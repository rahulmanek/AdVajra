import React from 'react';

// Tiny Input Component (Fixed: Moved outside to prevent focus loss on re-render)
const TinyInput = ({ val, onChange, placeholder, className }) => (
    <input
        type="text"
        value={val}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`
            absolute w-10 h-6 text-center text-xs font-medium
            bg-white/90 border border-slate-200 rounded
            focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-300
            shadow-sm
            ${className}
        `}
    />
);

/**
 * BoxModelControl
 * A professional, unified "DevTools-style" input for Margin, Padding, and Content Size.
 */
const BoxModelControl = ({ margin, padding, onMarginChange, onPaddingChange, children }) => {
    // Handler for Margin (Fixed: Restored missing handlers)
    const handleMarginChange = (side, val) => {
        onMarginChange({ ...margin, [side]: val });
    };

    // Handler for Padding (Fixed: Restored missing handlers)
    const handlePaddingChange = (side, val) => {
        onPaddingChange({ ...padding, [side]: val });
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Size & Spacing</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">MARGIN &gt; PADDING &gt; CONTENT</span>
            </div>

            {/* The Stage */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-8 flex items-center justify-center relative select-none">

                {/* 1. MARGIN ZONE (Outer) */}
                <div className="relative bg-orange-50/50 border border-dashed border-orange-300 rounded-lg py-14 px-16 w-full max-w-[460px] shadow-sm transition-all hover:bg-orange-50 hover:border-orange-400 group/margin">
                    <span className="absolute top-2 left-3 text-[10px] font-bold text-orange-400 uppercase">Margin</span>

                    {/* Margin Inputs */}
                    <TinyInput val={margin.top} onChange={(v) => handleMarginChange('top', v)} placeholder="-" className="top-3 left-1/2 -translate-x-1/2" />
                    <TinyInput val={margin.bottom} onChange={(v) => handleMarginChange('bottom', v)} placeholder="-" className="bottom-3 left-1/2 -translate-x-1/2" />
                    <TinyInput val={margin.left} onChange={(v) => handleMarginChange('left', v)} placeholder="-" className="left-3 top-1/2 -translate-y-1/2" />
                    <TinyInput val={margin.right} onChange={(v) => handleMarginChange('right', v)} placeholder="-" className="right-3 top-1/2 -translate-y-1/2" />

                    {/* 2. PADDING ZONE (Inner) */}
                    <div className="relative bg-lime-50/50 border border-solid border-lime-300 rounded-lg p-10 w-full shadow-inner transition-all hover:bg-lime-50 hover:border-lime-400 group/padding mx-auto">
                        <span className="absolute top-2 left-3 text-[10px] font-bold text-lime-500 uppercase">Padding</span>

                        {/* Padding Inputs */}
                        <TinyInput val={padding.top} onChange={(v) => handlePaddingChange('top', v)} placeholder="-" className="top-3 left-1/2 -translate-x-1/2" />
                        <TinyInput val={padding.bottom} onChange={(v) => handlePaddingChange('bottom', v)} placeholder="-" className="bottom-3 left-1/2 -translate-x-1/2" />
                        <TinyInput val={padding.left} onChange={(v) => handlePaddingChange('left', v)} placeholder="-" className="left-2.5 top-1/2 -translate-y-1/2" />
                        <TinyInput val={padding.right} onChange={(v) => handlePaddingChange('right', v)} placeholder="-" className="right-2.5 top-1/2 -translate-y-1/2" />

                        {/* 3. CONTENT ZONE (Center) - No Background */}
                        <div className="relative flex items-center justify-center min-h-[60px] mt-1">
                            <div className="relative flex items-center justify-center">
                                <span className="absolute -top-4 left-0 text-[9px] font-bold text-slate-500 uppercase tracking-tight">Size</span>
                                {/* Size Inputs Passed as Children */}
                                {children}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BoxModelControl;
