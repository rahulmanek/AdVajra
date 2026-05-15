import { __ } from '@wordpress/i18n';
import { PRICING_URL } from '../utils/urls';
import Switch from './Switch';
import './ModuleCard.scss';

const AdBlockIcon = () => (
    <svg viewBox="0 0 24 24" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" className="inline-block">
        <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="bold" fontFamily="sans-serif">AD</text>
        <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2.5" fill="none"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="#ef4444" strokeWidth="2.5"/>
    </svg>
);

const IpBlockIcon = () => (
    <svg viewBox="0 0 24 24" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" className="inline-block">
        <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="bold" fontFamily="sans-serif">IP</text>
        <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2.5" fill="none"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="#ef4444" strokeWidth="2.5"/>
    </svg>
);

const ICON_MAP = {
    group: '🔀',       // Ad Groups
    shield: <AdBlockIcon />, // Ad Blocker
    settings: '⚙️',   // Settings
    plugins: '🔌',    // Generic Plugins
    ip_blocker: <IpBlockIcon />, // IP Blocker
    click_fraud: '🚨', // Click Fraud Protection
    smart_loading: '⚡', // Smart Loading
};

const ModuleCard = ({ module, onToggle, onConfigure }) => {
    const { id, name, description, icon, active, isPro } = module;
    const activeIcon = ICON_MAP[icon] || '✨';

    // Determine if this is a Pro feature and the user doesn't have a valid Pro license
    const isProLocked = isPro && !window.advajraSettings?.isPro;
    const isEffectivelyActive = active && !isProLocked;

    const handleConfigure = (event) => {
        event.stopPropagation();
        if (isProLocked) {
            // Action for locked Pro module
            window.open(PRICING_URL.moduleCard, '_blank');
            return;
        }
        if (onConfigure) {
            onConfigure(id);
        }
    };

    const handleToggle = (newCheckedState, event) => {
        event?.stopPropagation();
        if (isProLocked) return;
        onToggle(id, !active);
    };

    return (
        <div
            className={`category-card module-card ${isEffectivelyActive ? 'active-module' : ''} ${isProLocked ? 'locked' : ''}`}
            role="group"
            aria-label={name}
        >
            {isProLocked && <span className="module-card__pro-badge">🔒 PRO</span>}

            <div className="module-card__body">
                <span className="card-icon module-card__icon">
                    {activeIcon}
                </span>

                <span className="card-title module-card__title">{name}</span>
                <span className="card-desc module-card__desc">{description}</span>
            </div>

            {isProLocked ? (
                <div className="module-card__footer" style={{ justifyContent: 'center' }}>
                    <button
                        type="button"
                        className="card-action upgrade module-card__upgrade-btn"
                        onClick={handleConfigure}
                    >
                        {__('Upgrade to PRO', 'advajra')}
                    </button>
                </div>
            ) : (
                <div className="module-card__footer">
                    <div className="module-card__footer-start">
                        {(module.hasSettings && onConfigure) && (
                            <button
                                type="button"
                                className="module-card__action-btn"
                                onClick={handleConfigure}
                            >
                                {__('Configure', 'advajra')} →
                            </button>
                        )}
                    </div>

                    {!module.alwaysActive && (
                        <Switch
                            checked={isEffectivelyActive}
                            onChange={handleToggle}
                            color="blue"
                            aria-label={isEffectivelyActive ? __('Disable module', 'advajra') : __('Enable module', 'advajra')}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default ModuleCard;
