/**
 * GroupOperator.js
 *
 * A stylized AND/OR toggle that sits between rule groups.
 * Features glassmorphism styling.
 */
import React from 'react';

const GroupOperator = ({ value, onChange }) => {
    const isAnd = value === 'AND';

    return (
        <div
            className={`advajra-group-operator ${isAnd ? 'mode-and' : 'mode-or'}`}
            onClick={() => onChange(isAnd ? 'OR' : 'AND')}
        >
            <div className="operator-track">
                <span className={`option ${isAnd ? 'active' : ''}`}>AND</span>
                <span className={`option ${!isAnd ? 'active' : ''}`}>OR</span>
                <div className={`slider ${isAnd ? 'left' : 'right'}`}></div>
            </div>
        </div>
    );
};

export default GroupOperator;
