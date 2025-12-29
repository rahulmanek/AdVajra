import React, { useState, useEffect } from 'react';
import apiFetch from '@wordpress/api-fetch';
import { Button, Notice } from '@wordpress/components';
import CodeEditor from './CodeEditor';

const LABELS = {
    domain: 'Domain',
    publisher: 'Publisher ID',
    relationship: 'Relationship',
    cert: 'Certification ID (Optional)'
};

const COMMON_NETWORKS = [
    { label: 'Google Ad Manager / AdSense', domain: 'google.com' },
    { label: 'Index Exchange', domain: 'indexexchange.com' },
    { label: 'Rubicon Project', domain: 'rubiconproject.com' },
    { label: 'AppNexus', domain: 'appnexus.com' },
    { label: 'PubMatic', domain: 'pubmatic.com' },
    { label: 'OpenX', domain: 'openx.com' },
    { label: 'Amazon', domain: 'amazon-adsystem.com' }
];

const AdsTxtManager = ({ onChange = () => {} }) => {
    const [content, setContent] = useState('');
    const [initialContent, setInitialContent] = useState('');
    const [status, setStatus] = useState('loading'); // loading, ready, error
    const [message, setMessage] = useState('');
    const [validation, setValidation] = useState(null);
    const [isWritable, setIsWritable] = useState(true);

    // Tools state
    const [activeTool, setActiveTool] = useState(null);
    const [toolData, setToolData] = useState({ domain: '', publisher: '', relationship: 'DIRECT', cert: '' });

    useEffect(() => {
        fetchAdsTxt();
    }, []);

    const fetchAdsTxt = async () => {
        setStatus('loading');
        try {
            const response = await apiFetch({ path: '/advajra/v1/ads-txt' });
            setContent(response.content || '');
            setInitialContent(response.content || '');
            setIsWritable(response.writable);
            setStatus('ready');
            if (!response.exists) {
                setMessage('No ads.txt file detected on this site. Saving will create one automatically.');
            }
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to load ads.txt');
        }
    };

    const handleContentChange = (newContent) => {
        setContent(newContent);
        onChange(newContent); // Sync to parent
        if (status === 'error') {
            setStatus('ready');
            setMessage('');
        }
    };

    const appendEntry = (domain, pubId, rel, cert) => {
        const parts = [
            domain.trim().toLowerCase(),
            pubId.trim(),
            rel.trim().toUpperCase()
        ];
        if (cert && cert.trim()) {
            parts.push(cert.trim());
        }

        const newLine = parts.join(', ');
        const newContent = content ? `${content}\n${newLine}` : newLine;
        
        setContent(newContent);
        onChange(newContent); // Sync to parent
        setActiveTool(null);
        setToolData({ domain: '', publisher: '', relationship: 'DIRECT', cert: '' });
    };

    const handleAddAdSense = () => {
        const pubId = window.prompt('Enter your Google AdSense Publisher ID (e.g. pub-123456789):');
        if (pubId) {
            appendEntry('google.com', pubId, 'DIRECT', 'f08c47fec0942fa0');
        }
    };

    const validateContent = () => {
        if (!content.trim()) {
            setValidation({ valid: 0, dups: 0, errors: [] });
            return;
        }

        const lines = content.split('\n');
        const uniqueEntries = new Set();
        let validCount = 0;
        let dupCount = 0;
        const errors = [];

        lines.forEach((line, index) => {
            const cleanLine = line.trim();
            
            // Skip comments and empty lines
            if (!cleanLine || cleanLine.startsWith('#')) return;

            const parts = cleanLine.split(',').map(p => p.trim());
            
            // Check basic structure
            if (parts.length < 3 || parts.length > 4) {
                errors.push(`Line ${index + 1}: Invalid syntax. Must have 3 or 4 comma-separated values.`);
                return;
            }

            const [domain, pubId, relationship] = parts;

            // Check domain format basic
            if (!domain.includes('.')) {
                errors.push(`Line ${index + 1}: Invalid domain format ('${domain}').`);
            }

            // Check relationship
            const upperRel = relationship.toUpperCase();
            if (upperRel !== 'DIRECT' && upperRel !== 'RESELLER') {
                errors.push(`Line ${index + 1}: Relationship must be DIRECT or RESELLER (found '${relationship}').`);
            }

            // Check duplicates
            const entryKey = `${domain.toLowerCase()}-${pubId.toLowerCase()}-${upperRel}`;
            if (uniqueEntries.has(entryKey)) {
                dupCount++;
            } else {
                uniqueEntries.add(entryKey);
            }

            validCount++;
        });

        setValidation({
            valid: validCount,
            dups: dupCount,
            errors
        });
    };

    const handleDownload = () => {
        const blob = new window.Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ads.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (status === 'loading') {
        return <div className="advajra-loading" style={{ padding: '20px' }}><div className="spinner"></div> Loading Ads.txt...</div>;
    }

    const hasChanges = content !== initialContent;

    const LeftButtons = (
        <>
            <Button variant="tertiary" onClick={handleAddAdSense} icon={<span style={{ fontWeight: 'bold' }}>G</span>}>AdSense</Button>
            <Button variant="tertiary" onClick={() => setActiveTool(activeTool === 'network' ? null : 'network')} icon="networking">Add Network</Button>
            <Button variant="tertiary" onClick={() => setActiveTool(activeTool === 'custom' ? null : 'custom')} icon="edit">Manual Entry</Button>
        </>
    );

    const RightButtons = (
        <>
            <Button variant="tertiary" onClick={validateContent} icon="saved">Validate</Button>
            <Button variant="tertiary" onClick={handleDownload} icon="download">Download</Button>
        </>
    );

    return (
        <div className="ads-txt-manager">
            {/* Tool Forms */}
            {activeTool === 'network' && (
                <div style={{ marginBottom: '16px', padding: '16px', background: '#eff6ff', borderRadius: '8px', border: '1px dashed #bfdbfe' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e3a8a' }}>Add Common Network</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Network</label>
                            <select 
                                value={toolData.domain} 
                                onChange={(e) => setToolData({ ...toolData, domain: e.target.value })}
                                style={{ width: '100%', padding: '6px' }}
                            >
                                <option value="">Select Network...</option>
                                {COMMON_NETWORKS.map(net => (
                                    <option key={net.domain} value={net.domain}>{net.label} ({net.domain})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>{LABELS.publisher}</label>
                            <input 
                                type="text" 
                                value={toolData.publisher} 
                                onChange={(e) => setToolData({ ...toolData, publisher: e.target.value })}
                                style={{ width: '100%', padding: '6px' }} 
                                placeholder="12345" 
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>{LABELS.relationship}</label>
                            <select 
                                value={toolData.relationship} 
                                onChange={(e) => setToolData({ ...toolData, relationship: e.target.value })}
                                style={{ width: '100%', padding: '6px' }}
                            >
                                <option value="DIRECT">DIRECT</option>
                                <option value="RESELLER">RESELLER</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button 
                                isPrimary 
                                disabled={!toolData.domain || !toolData.publisher}
                                onClick={() => appendEntry(toolData.domain, toolData.publisher, toolData.relationship, '')}
                            >
                                Add Entry
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTool === 'custom' && (
                <div style={{ marginBottom: '16px', padding: '16px', background: '#f5f3ff', borderRadius: '8px', border: '1px dashed #ddd6fe' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4c1d95' }}>Generate Custom Entry</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>{LABELS.domain}</label>
                            <input type="text" value={toolData.domain} onChange={(e) => setToolData({ ...toolData, domain: e.target.value })} style={{ width: '100%', padding: '6px' }} placeholder="example.com" />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>{LABELS.publisher}</label>
                            <input type="text" value={toolData.publisher} onChange={(e) => setToolData({ ...toolData, publisher: e.target.value })} style={{ width: '100%', padding: '6px' }} placeholder="pub-123" />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>{LABELS.relationship}</label>
                            <select value={toolData.relationship} onChange={(e) => setToolData({ ...toolData, relationship: e.target.value })} style={{ width: '100%', padding: '6px' }}>
                                <option value="DIRECT">DIRECT</option>
                                <option value="RESELLER">RESELLER</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>{LABELS.cert}</label>
                            <input type="text" value={toolData.cert} onChange={(e) => setToolData({ ...toolData, cert: e.target.value })} style={{ width: '100%', padding: '6px' }} placeholder="Optional hex" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: '1 / -1' }}>
                            <Button 
                                isPrimary 
                                disabled={!toolData.domain || !toolData.publisher}
                                onClick={() => appendEntry(toolData.domain, toolData.publisher, toolData.relationship, toolData.cert)}
                            >
                                Add Entry
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Validation Results */}
            {validation && (
                <div style={{ marginBottom: '16px', padding: '16px', background: validation.errors.length > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', border: `1px solid ${validation.errors.length > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: validation.errors.length > 0 ? '#991b1b' : '#166534' }}>Validation Results</h5>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: validation.errors.length > 0 ? '12px' : '0' }}>
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ {validation.valid} Valid {validation.valid === 1 ? 'Entry' : 'Entries'}</span>
                        {validation.dups > 0 && <span style={{ color: '#ca8a04', fontWeight: 600 }}>⚠️ {validation.dups} Duplicate {validation.dups === 1 ? 'Entry' : 'Entries'}</span>}
                        <span style={{ color: validation.errors.length > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>🚨 {validation.errors.length} Syntax Error{validation.errors.length !== 1 ? 's' : ''}</span>
                    </div>
                    {validation.errors.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#b91c1c' }}>
                            {validation.errors.map((err, i) => <li key={i} style={{ marginBottom: '4px' }}>{err}</li>)}
                        </ul>
                    )}
                </div>
            )}

            {/* Error / Success Notices */}
            {message && status === 'error' && (
                <Notice status="error" isDismissible={false} style={{ marginBottom: '16px' }}>{message}</Notice>
            )}
            
            {(message && status === 'ready' && !isWritable) && (
                <Notice status="warning" isDismissible={false} style={{ marginBottom: '16px' }}>
                    <strong>Filesystem Permission Warning:</strong> The root directory is not writable. Automatic saving may fail. You may need to update file permissions or download and upload the file manually via FTP.
                </Notice>
            )}

            <CodeEditor 
                value={content} 
                onChange={handleContentChange} 
                language="ads.txt" 
                placeholder="# Your ads.txt content&#10;google.com, pub-XXXX, DIRECT, XXXX" 
                minHeight={300}
                toolbarLeft={LeftButtons}
                toolbarRight={RightButtons}
            />
        </div>
    );
};

export default AdsTxtManager;
