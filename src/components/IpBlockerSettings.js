import React, { useState } from 'react';
import { Button } from '@wordpress/components';
import DrillDownPanel from './DrillDownPanel';
import { __ } from '@wordpress/i18n';
import './IpBlockerSettings.scss';

const IpBlockerSettings = ({ settings, updateSetting, onBack }) => {
    const [newIp, setNewIp] = useState('');
    const [error, setError] = useState('');

    // Ensure blocked_ips is always an array
    const blockedIPs = Array.isArray(settings?.blocked_ips) ? settings.blocked_ips : [];

    // Basic IP validation (IPv4 & IPv6 loosely)
    const isValidIP = (ip) => {
        const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    };

    const handleAddIp = () => {
        setError('');
        const trimmedIp = newIp.trim();

        if (!trimmedIp) return;

        if (!isValidIP(trimmedIp)) {
            setError(__('Please enter a valid IPv4 or IPv6 address.', 'advajra'));
            return;
        }

        if (blockedIPs.includes(trimmedIp)) {
            setError(__('This IP address is already blocked.', 'advajra'));
            return;
        }

        const updatedIps = [...blockedIPs, trimmedIp];
        updateSetting('blocked_ips', updatedIps);
        setNewIp('');
    };

    const handleRemoveIp = (ipToRemove) => {
        const updatedIps = blockedIPs.filter(ip => ip !== ipToRemove);
        updateSetting('blocked_ips', updatedIps);
    };

    const handleClearAll = () => {
        if (window.confirm(__('Are you sure you want to unblock ALL IP addresses? This cannot be undone.', 'advajra'))) {
            updateSetting('blocked_ips', []);
        }
    };

    const handleKeyDown = (e) => {
        // Allow shift+enter for newlines, regular enter submits
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddIp();
        }
    };

    return (
        <DrillDownPanel
            icon={
                <svg viewBox="0 0 24 24" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" className="inline-block relative top-[-2px]">
                    <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="bold" fontFamily="sans-serif">IP</text>
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2.5" fill="none"/>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="#ef4444" strokeWidth="2.5"/>
                </svg>
            }
            title={__('IP Blocker', 'advajra')}
            subtitle={__('Protect your ad revenue from known bad actors and bots.', 'advajra')}
            onBack={onBack}
        >
            <div className="ip-blocker-container">
                <div className="ip-blocker-header">
                    <div className="ip-blocker-info">
                        <h3>{__('Block IP Addresses', 'advajra')}</h3>
                        <p>{__('Ads will be completely hidden from any user matching these IP addresses. The engine will instantly abort rendering, saving server resources. You can paste multiple IPs separated by commas or newlines.', 'advajra')}</p>
                    </div>
                </div>

                <div className="ip-blocker-input-area">
                    <div className="ip-input-wrapper">
                        <span className="ip-icon">📍</span>
                        <input
                            type="text"
                            className={`advajra-ip-input ${error ? 'has-error' : ''}`}
                            placeholder="e.g., 192.168.1.100 or 2001:0db8::"
                            value={newIp}
                            onChange={(e) => {
                                setNewIp(e.target.value);
                                if (error) setError('');
                            }}
                            onKeyDown={handleKeyDown}
                        />
                        <Button
                            variant="primary"
                            className="advajra-btn"
                            onClick={handleAddIp}
                            disabled={!newIp.trim()}
                            style={{ padding: '8px 24px', borderRadius: '50px' }}
                        >
                            {__('Block IP', 'advajra')}
                        </Button>
                    </div>
                    {error && <div className="ip-error-message">{error}</div>}
                </div>

                <div className="ip-list-section">
                    <div className="ip-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>{__('Currently Blocked IPs', 'advajra')} <span className="ip-count">{blockedIPs.length}</span></h4>

                        {blockedIPs.length > 0 && (
                            <Button
                                variant="tertiary"
                                isDestructive
                                onClick={handleClearAll}
                                style={{ borderRadius: '50px' }}
                            >
                                {__('Clear All', 'advajra')}
                            </Button>
                        )}
                    </div>

                    {blockedIPs.length > 0 ? (
                        <div className="advajra-ip-grid">
                            {blockedIPs.map(ip => (
                                <div key={ip} className="advajra-ip-card">
                                    <div className="ip-card-content">
                                        <span className="ip-label">{ip}</span>
                                    </div>
                                    <button
                                        className="ip-remove-btn"
                                        onClick={() => handleRemoveIp(ip)}
                                        aria-label={__('Remove IP', 'advajra')}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 6L6 18M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="advajra-empty-state">
                            <div className="empty-icon">🛡️</div>
                            <h4>{__('No IPs Blocked', 'advajra')}</h4>
                        </div>
                    )}
                </div>
            </div>
        </DrillDownPanel>
    );
};

export default IpBlockerSettings;
