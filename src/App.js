import React, { useState, useEffect, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { SlotFillProvider } from '@wordpress/components';
import { PluginArea } from '@wordpress/plugins';
import { useSelect } from '@wordpress/data';
import AdManagerLayout from './pages/AdManager/AdManagerLayout';
import LazyView from './components/LazyView';
import { NotificationProvider } from './context/NotificationDataCtx';
import { InboxProvider } from './context/InboxContext';
import { DirtyStateProvider } from './context/DirtyStateContext';
import NavigationGuard from './components/NavigationGuard';
import { STORE_NAME } from './store/constants';

import './store';


const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdList = lazy(() => import('./pages/Ads/AdList'));
const AdEditor = lazy(() => import('./pages/Ads/AdEditor'));
const GroupList = lazy(() => import('./pages/Groups/GroupList'));
const GroupEditor = lazy(() => import('./pages/Groups/GroupEditor'));
const PlacementList = lazy(() => import('./pages/Placements/PlacementList'));
const PlacementCreate = lazy(() => import('./pages/Placements/PlacementCreate'));
const PlacementEdit = lazy(() => import('./pages/Placements/PlacementEdit'));
const AnalyticsDashboard = lazy(() => import('./pages/Analytics/AnalyticsDashboard'));
const Settings = lazy(() => import('./pages/Settings'));

const AppProviders = ( { children } ) => {
    return (
        <SlotFillProvider>
            <PluginArea />
            <NotificationProvider>
                <InboxProvider>
                    <HashRouter>
                        <DirtyStateProvider>
                            { children }
                        </DirtyStateProvider>
                    </HashRouter>
                </InboxProvider>
            </NotificationProvider>
        </SlotFillProvider>
    );
};

/**
 * Shown when the WordPress REST API returns non-JSON responses.
 * This is always a server/site configuration issue, never a plugin bug.
 */
const RestApiErrorBanner = ( { message } ) => (
    <div style={{
        margin: '20px',
        padding: '20px 24px',
        background: '#fff8f0',
        border: '1px solid #f59e0b',
        borderLeft: '4px solid #f59e0b',
        borderRadius: '8px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#92400e', fontSize: '15px', fontWeight: 600 }}>
            ⚠️ Unable to connect to the WordPress REST API
        </h3>
        <p style={{ margin: '0 0 12px 0', color: '#78350f', fontSize: '13px' }}>
            AdVajra could not load data because your server is not returning valid responses. This is a <strong>site configuration issue</strong> — not a plugin bug.
        </p>
        { message && (
            <p style={{ margin: '0 0 12px 0', padding: '8px 12px', background: '#fef3c7', borderRadius: '4px', color: '#78350f', fontSize: '12px', fontFamily: 'monospace' }}>
                { message }
            </p>
        ) }
        <p style={{ margin: '0', color: '#92400e', fontSize: '13px' }}><strong>Common causes to check:</strong></p>
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', color: '#78350f', fontSize: '13px', lineHeight: 1.7 }}>
            <li><strong>WP_DEBUG_DISPLAY is on</strong> — PHP notices/warnings are printing into REST responses. Set <code>define(&apos;WP_DEBUG_DISPLAY&apos;, false);</code> in wp-config.php</li>
            <li><strong>Security plugin blocking REST API</strong> — Check Wordfence, iThemes, or similar plugin settings</li>
            <li><strong>Another plugin outputting content</strong> — Try disabling other plugins one by one</li>
            <li><strong>Hosting WAF / Cloudflare rule</strong> — A firewall may be intercepting wp-json requests</li>
        </ul>
        <p style={{ margin: '12px 0 0 0', color: '#78350f', fontSize: '13px' }}>
            <strong>Quick test:</strong> Open <a href={ `${ window.wpApiSettings?.root ?? '' }advajra/v1/ads` } target="_blank" rel="noreferrer" style={{ color: '#d97706' }}>this URL</a> in a new tab — it should show JSON, not HTML.
        </p>
    </div>
);

const App = () => {
    const [activeModules, setActiveModules] = useState(window.advajraSettings?.activeModules || []);
    const restApiError = useSelect( ( select ) => select( STORE_NAME ).getRestApiError() );

    useEffect(() => {
        const handleModulesChanged = () => {
            setActiveModules([...(window.advajraSettings?.activeModules || [])]);
        };
        window.addEventListener('advajra_modules_changed', handleModulesChanged);
        return () => window.removeEventListener('advajra_modules_changed', handleModulesChanged);
    }, []);

    useEffect(() => {
        document.body.classList.add('folded');
    }, []);

    // Silently report REST API errors to support@advajra.com.
    // Throttled server-side to once per 24h per site per error type.
    useEffect(() => {
        if ( ! restApiError ) {
            return;
        }
        const nonce = window.advajraSettings?.telemetryNonce;
        const ajaxUrl = window.advajraSettings?.ajaxUrl;
        if ( ! nonce || ! ajaxUrl ) {
            return;
        }
        // Fire-and-forget — we do not await or handle the response.
        // We use admin-ajax.php instead of REST API because if the REST API
        // itself is broken on the site, calling wp-json to report it will also fail.
        const params = new URLSearchParams();
        params.append( 'action', 'advajra_report_error' );
        params.append( 'nonce', nonce );
        params.append( 'error_type', 'REST_API_ERROR' );
        params.append( 'error_message', restApiError );
        params.append( 'context', 'initial_load' );

        window.fetch(
            ajaxUrl,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body:    params,
            }
        ).catch( () => {
            // Swallow network errors.
        } );
    }, [ restApiError ] );

    return (
        <AppProviders>
            <NavigationGuard />
            <AdManagerLayout>
                { restApiError && <RestApiErrorBanner message={ restApiError } /> }
                <Routes>
                    <Route path="/" element={<LazyView><Dashboard /></LazyView>} />
                    <Route path="/ads" element={<LazyView><AdList /></LazyView>} />
                    <Route path="/ads/new" element={<LazyView><AdEditor /></LazyView>} />
                    <Route path="/ads/:id" element={<LazyView><AdEditor /></LazyView>} />


                    {activeModules.includes('ad_groups') && (
                        <>
                            <Route path="/groups" element={<LazyView><GroupList /></LazyView>} />
                            <Route path="/groups/new" element={<LazyView><GroupEditor /></LazyView>} />
                            <Route path="/groups/:id" element={<LazyView><GroupEditor /></LazyView>} />
                        </>
                    )}

                    <Route path="/placements" element={<LazyView><PlacementList /></LazyView>} />
                    <Route path="/placements/new" element={<LazyView><PlacementCreate /></LazyView>} />
                    <Route path="/placements/:id" element={<LazyView><PlacementEdit /></LazyView>} />
                    <Route path="/analytics" element={<LazyView><AnalyticsDashboard /></LazyView>} />
                    <Route path="/settings" element={<LazyView><Settings /></LazyView>} />
                    <Route path="/settings/:tab" element={<LazyView><Settings /></LazyView>} />
                </Routes>
            </AdManagerLayout>
        </AppProviders>
    );
};

export default App;
