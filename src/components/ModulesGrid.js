import React, { useState, useEffect } from 'react';
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import ModuleCard from './ModuleCard';
import { useSelect, useDispatch } from '@wordpress/data';
import { useNavigate } from 'react-router-dom';
import { STORE_NAME } from '../store/constants';

const ModulesGrid = ({ isSettingsContext = false }) => {
    const [modules, setModules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const navigate = useNavigate();
    const noticesDispatch = useDispatch('core/notices');

    const notifyError = (message) => {
        if (noticesDispatch && typeof noticesDispatch.createNotice === 'function') {
            noticesDispatch.createNotice('error', message, { isDismissible: true });
            return;
        }

        console.error(message);
    };

    // Fetch modules on mount
    useEffect(() => {
        apiFetch({ path: '/advajra/v1/modules' })
            .then((data) => {
                setModules(data);
                setIsLoading(false);
            })
            .catch(() => {
                notifyError(__('Failed to load Advajra Modules.', 'advajra'));
                setIsLoading(false);
            });
    }, [noticesDispatch]);

    const handleToggle = (id, active) => {
        // Optimistic UI update
        const updatedModules = modules.map(m =>
            m.id === id ? { ...m, active } : m
        );
        const prevModules = [...modules];
        setModules(updatedModules);

        apiFetch({
            path: '/advajra/v1/modules/toggle',
            method: 'POST',
            data: { id, active }
        }).then((response) => {
            if (!response.success) {
                // Revert on failure
                setModules(prevModules);
                notifyError(__('Failed to toggle module.', 'advajra'));
            } else {
                // Update global JS state synchronously
                if (!window.advajraSettings.activeModules) {
                    window.advajraSettings.activeModules = [];
                }

                if (active) {
                    if (!window.advajraSettings.activeModules.includes(id)) {
                        window.advajraSettings.activeModules.push(id);
                    }
                } else {
                    window.advajraSettings.activeModules = window.advajraSettings.activeModules.filter(m => m !== id);
                }

                // Dispatch event so Layout & App routing updates instantly
                window.dispatchEvent(new Event('advajra_modules_changed'));
            }
        }).catch(() => {
            // Revert on error
            setModules(prevModules);
            notifyError(__('Failed to toggle module.', 'advajra'));
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-10">
                <Spinner />
            </div>
        );
    }

    if (modules.length === 0) {
        return null; // Return nothing if no modules are registered yet
    }

    return (
        <div className="mt-8">

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map(module => (
                    <ModuleCard
                        key={module.id}
                        module={module}
                        onToggle={handleToggle}
                        onConfigure={(isSettingsContext && module.hasSettings) ? (id) => navigate(`/settings/${id}`) : null}
                    />
                ))}
            </div>
        </div>
    );
};

export default ModulesGrid;
