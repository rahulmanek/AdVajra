/**
 * Settings Page.
 */
import React, { useState, useEffect } from 'react';
import { Button, Spinner } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { useNotification } from '../context/NotificationDataCtx';
import SettingsDashboard from '../components/SettingsDashboard';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { SaveActionIcon } from '../components/AdvajraIcons';

const Settings = () => {
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { addNotification } = useNotification();

    useDocumentTitle('Settings');

    const isPro = window.advajraSettings?.isPro || false;


    const isSystemDisabled = settings?.disable_all_ads || false;

    useEffect(() => {
        let isMounted = true;
        apiFetch({ path: '/advajra/v1/settings' })
            .then((data) => {
                if ( ! isMounted ) return;
                setSettings(data);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error(err);
                if ( ! isMounted ) return;
                setIsLoading(false);
            });
            
        return () => { isMounted = false; };
    }, []);

    const updateSetting = (key, value) => {
        setSettings(prevSettings => ({ ...prevSettings, [key]: value }));
    };

    const batchUpdateSettings = (newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const toggleMasterSwitch = () => {
        updateSetting('disable_all_ads', !isSystemDisabled);
    };

    const saveSettings = async (overrideData = null) => {
        setIsSaving(true);
        const dataToSave = { ...(overrideData || settings) };
        let adsTxtPromise = Promise.resolve();

        // Intercept ads_txt_content from frontend state and fire dedicated API
        if (dataToSave.ads_txt_content !== undefined) {
            const adsTxtContent = dataToSave.ads_txt_content;
            delete dataToSave.ads_txt_content; // Drop it from the main settings payload
            
            adsTxtPromise = apiFetch({
                path: '/advajra/v1/ads-txt',
                method: 'POST',
                data: { content: adsTxtContent }
            });
        }

        try {
            const [settingsResponse] = await Promise.all([
                apiFetch({
                    path: '/advajra/v1/settings',
                    method: 'POST',
                    data: dataToSave,
                }),
                adsTxtPromise
            ]);

            setIsSaving(false);
            if (settingsResponse) {
                setSettings(prev => ({ ...settingsResponse, ads_txt_content: prev.ads_txt_content })); // Preserve local ads text state
            }
            addNotification({ type: 'success', message: 'Settings saved!' });
            return true;
        } catch (err) {
            console.error(err);
            setIsSaving(false);
            addNotification({ type: 'error', message: 'Failed to save settings.' });
            return false;
        }
    };


    const handleAutoSaveReset = (newDefaults) => {
        const merged = { ...settings, ...newDefaults };
        saveSettings(merged).then((success) => {
            if (success) {
                // Redirect to main settings dashboard (remove active tab)
                // Navigation logic is inside SettingsDashboard usually, or we can use window.location hash
                // Since this component is inside HashRouter, we can't easily navigate from here unless we use hook.
                // But SettingsDashboard has the navigate hook.
                // Actually, let's just return the promise and let SettingsDashboard navigate.
            }
        });
        return merged; // Return for immediate UI update if needed
    };

    if (isLoading) {
        return (
            <div className="advajra-settings-page flex items-center justify-center" style={{ minHeight: '400px' }}>
                <Spinner />
            </div>
        );
    }

    return (
        <div className="advajra-settings-page p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
                <Button
                    variant="primary"
                    onClick={() => saveSettings()}
                    isBusy={isSaving}
                    disabled={isSaving}
                >
                    <SaveActionIcon size={16} />
                    <span style={{ marginLeft: '8px' }}>
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </span>
                </Button>
            </div>

            {/* Settings Cards */}
            <div className="grid gap-6">


                <div className="advajra-card p-6">

                    <div className={`master-switch ${isSystemDisabled ? 'disabled' : 'active'}`}>
                        <div className="master-switch-content">
                            <div className="master-switch-info">
                                <div className="master-switch-icon">
                                    {isSystemDisabled ? '🔴' : '🟢'}
                                </div>
                                <div className="master-switch-text">
                                    <span className="master-switch-label">AD SYSTEM</span>
                                    <span className="master-switch-status">
                                        {isSystemDisabled ? 'All ads disabled' : 'Ads are live'}
                                    </span>
                                </div>
                            </div>
                            <button
                                className={`master-toggle-btn ${isSystemDisabled ? 'off' : 'on'}`}
                                onClick={toggleMasterSwitch}
                            >
                                <span className="toggle-track">
                                    <span className="toggle-thumb"></span>
                                </span>
                                <span className="toggle-label">
                                    {isSystemDisabled ? 'OFFLINE' : 'LIVE'}
                                </span>
                            </button>
                        </div>
                    </div>


                    <div className={`mt-6 ${isSystemDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <SettingsDashboard
                            settings={settings}
                            updateSetting={updateSetting}
                            batchUpdateSettings={batchUpdateSettings}
                            onSaveReset={saveSettings} // Pass modified saver
                            isSystemDisabled={isSystemDisabled}
                        />
                    </div>
                </div>


            </div>
        </div>
    );
};

export default Settings;
