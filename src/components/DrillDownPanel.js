import React from 'react';
import Tooltip from './Tooltip';

const DrillDownPanel = ({ icon, title, subtitle, statusText, headerRight, tooltip, onBack, className = '', children }) => (
    <div className={`drill-down-panel ${className}`}>
        <button className="settings-back-btn" onClick={onBack}>← Settings</button>

        <div className="panel-header">
            <span className="panel-icon">{icon}</span>
            <div className="panel-header-text">
                <h3>
                    {title}
                    {tooltip && (
                        <Tooltip content={tooltip} position="bottom">
                            <span className="tooltip-icon">💡</span>
                        </Tooltip>
                    )}
                </h3>
                <span className="panel-subtitle">{subtitle}</span>
            </div>
            {statusText && <span className="panel-count">{statusText}</span>}
            {headerRight}
        </div>

        {children}
    </div>
);

export default DrillDownPanel;
