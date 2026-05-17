/**
 * AdManagerLayout.js
 *
 * The main shell for the AdVajra Admin Area.
 * Implements the "Abstract Air" design system defined in style.scss.
 */
import React, { useState, useEffect, isValidElement, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationSystem from '../../components/NotificationSystem';
// User, Chart, Grid, Layout icons from wordpress
import { Icon, globe, settings, group } from '@wordpress/icons';
import { AdsNavIcon, AdvajraAnalyticsIcon, PlacementsNavIcon } from '../../components/AdvajraIcons';

const AdManagerLayout = ({ children }) => {
	const location = useLocation();
    const navigate = useNavigate();

    const [activeModules, setActiveModules] = useState(window.advajraSettings?.activeModules || []);

    useEffect(() => {
        const handleModulesChanged = () => {
            setActiveModules([...(window.advajraSettings?.activeModules || [])]);
        };
        window.addEventListener('advajra_modules_changed', handleModulesChanged);
        return () => window.removeEventListener('advajra_modules_changed', handleModulesChanged);
    }, []);

    /**
     * Guarded navigate: routes through NavigationGuard's dirty-state check.
     * Falls back to direct navigate if the guard isn't mounted yet.
     */
    const safeNavigate = useCallback( ( to ) => {
        if ( window.__advajraGuardedNavigate ) {
            window.__advajraGuardedNavigate( to );
        } else {
            navigate( to );
        }
    }, [ navigate ] );

    // Map routes to tabs
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.startsWith('/analytics')) return 'analytics';
        if (path.startsWith('/ads')) return 'ads';
        if (path.startsWith('/groups')) return 'groups';
        if (path.startsWith('/placements')) return 'placements';
        if (path.startsWith('/settings')) return 'settings';
        return 'overview';
    };

    const activeTab = getActiveTab();
    const isGroupsActive = activeModules.includes('ad_groups');

	return (
		<div id="advajra-app">
            <NotificationSystem />

            {/* Abstract Air Top Navigation */}
			<div className="advajra-top-nav">
                {/* Brand */}
                <a
                    href="#/"
                    className="advajra-brand"
                    onClick={(e) => {
                        e.preventDefault();
                        safeNavigate('/');
                    }}
                    style={{ cursor: 'pointer', textDecoration: 'none' }}
                >
                    <img
                        src={window.advajraSettings?.pluginUrl + 'assets/images/AdVajra-Logo.svg'}
                        alt="AdVajra"
                        className="advajra-logo"
                    />
                </a>

                {/* Navigation Pills */}
                <div className="advajra-nav-links">
                    <NavPill label="Overview" icon={globe} active={activeTab === 'overview'} onClick={() => safeNavigate('/')} />
                    <NavPill label="Analytics" icon={<AdvajraAnalyticsIcon size={18} />} active={activeTab === 'analytics'} onClick={() => safeNavigate('/analytics')} />
                    <NavPill label="Ads" icon={<AdsNavIcon size={18} />} active={activeTab === 'ads'} onClick={() => safeNavigate('/ads')} />
                    {isGroupsActive && (
                        <NavPill label="Groups" icon={group} active={activeTab === 'groups'} onClick={() => safeNavigate('/groups')} />
                    )}
                    <NavPill label="Placements" icon={<PlacementsNavIcon size={18} />} active={activeTab === 'placements'} onClick={() => safeNavigate('/placements')} />
                    <NavPill label="Settings" icon={settings} active={activeTab === 'settings'} onClick={() => safeNavigate('/settings')} />
                </div>


            </div>

			{/* Main Content Area */}
			<div className="advajra-layout advajra-content">
				{ children }
			</div>
		</div>
	);
};

const NavPill = ({ label, icon, active, onClick }) => (
    <div
        onClick={onClick}
        className={`advajra-nav-item ${active ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
    >
        { icon && (isValidElement(icon) ? icon : <Icon icon={icon} size={18} />) }
        {label}
    </div>
);

export default AdManagerLayout;

