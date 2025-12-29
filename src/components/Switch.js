import React from 'react';
import './Switch.scss';

const Switch = ({
    checked,
    onChange,
    color = 'blue',
    disabled = false,
    className = '',
    'aria-label': ariaLabel
}) => {
    return (
        <button
            type="button"
            className={`module-card__switch ${checked ? 'is-on' : 'is-off'} color-${color} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            onClick={(e) => {
                e.stopPropagation();
                if (onChange && !disabled) onChange(!checked, e);
            }}
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
        >
            <span className="module-card__switch-track">
                <span className="module-card__switch-thumb"></span>
            </span>
        </button>
    );
};

export default Switch;
