import React from 'react';

/**
 * SegmentedControl
 */
const SegmentedControl = ({ options, value, onChange, label, className = '' }) => {
    return (
        <div className={`advajra-segmented-control-wrapper ${className}`}>
            {label && <label className="advajra-label">{label}</label>}
            <div className="advajra-segmented-control">
                {options.map((option) => (
                    <button
                        key={option.value.toString()}
                        className={`segment-btn ${value === option.value ? 'active' : ''}`}
                        onClick={() => onChange(option.value)}
                        type="button"
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SegmentedControl;
