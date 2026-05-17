import React, { useState, useEffect, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { SlotFillProvider } from '@wordpress/components';
import { PluginArea } from '@wordpress/plugins';
import AdManagerLayout from './pages/AdManager/AdManagerLayout';
import LazyView from './components/LazyView';
import { NotificationProvider } from './context/NotificationDataCtx';
import { DirtyStateProvider } from './context/DirtyStateContext';
import NavigationGuard from './components/NavigationGuard';

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
                <HashRouter>
                    <DirtyStateProvider>
                        { children }
                    </DirtyStateProvider>
                </HashRouter>
            </NotificationProvider>
        </SlotFillProvider>
    );
};

const App = () => {
    const [activeModules, setActiveModules] = useState(window.advajraSettings?.activeModules || []);

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

    return (
        <AppProviders>
            <NavigationGuard />
            <AdManagerLayout>
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
