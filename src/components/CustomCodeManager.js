import React from 'react';
import { __ } from '@wordpress/i18n';
import Switch from './Switch';
import CodeEditor from './CodeEditor';

const CustomCodeManager = ({ settings, updateSetting }) => {

    // Helper to safely get value and ensure it's a string
    const getVal = (key) => settings?.[key] || '';
    const getBool = (key) => settings?.[key] || false;

    return (
        <div className="custom-code-manager">

            {/* Header Code */}
            <div style={{ marginBottom: '24px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
                    {__('This code will be inserted into the ', 'advajra')}<code>&lt;head&gt;</code>{__(' section of your website. Useful for scripts, ', 'advajra')}<strong>{__('analytics', 'advajra')}</strong>{__(', and ', 'advajra')}<strong>{__('CSS styles', 'advajra')}</strong>{__('.', 'advajra')}
                </p>
                <CodeEditor
                    value={getVal('custom_code_header')}
                    onChange={(val) => updateSetting('custom_code_header', val)}
                    placeholder="<!-- Paste your header code here -->"
                    language="html"
                    minHeight={150}
                    toolbarLeft={
                        <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>{__('Header Code', 'advajra')}</h3>
                    }
                    toolbarRight={
                        <Switch
                            checked={getBool('custom_code_header_enabled')}
                            onChange={(val) => updateSetting('custom_code_header_enabled', val)}
                            color="blue"
                        />
                    }
                />
            </div>

            {/* Body Code */}
            <div style={{ marginBottom: '24px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
                    {__('This code will be inserted into the ', 'advajra')}<code>&lt;body&gt;</code>{__(' section of your website.', 'advajra')}
                </p>
                <CodeEditor
                    value={getVal('custom_code_body')}
                    onChange={(val) => updateSetting('custom_code_body', val)}
                    placeholder="<!-- Paste your body code here -->"
                    language="html"
                    minHeight={150}
                    toolbarLeft={
                        <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>{__('Body Code', 'advajra')}</h3>
                    }
                    toolbarRight={
                        <Switch
                            checked={getBool('custom_code_body_enabled')}
                            onChange={(val) => updateSetting('custom_code_body_enabled', val)}
                            color="blue"
                        />
                    }
                />
            </div>

            {/* Footer Code */}
            <div style={{ marginBottom: '24px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
                    {__('This code will be inserted into the ', 'advajra')}<code>&lt;footer&gt;</code>{__(' section of your website.', 'advajra')}
                </p>
                <CodeEditor
                    value={getVal('custom_code_footer')}
                    onChange={(val) => updateSetting('custom_code_footer', val)}
                    placeholder="<!-- Paste your footer code here -->"
                    language="html"
                    minHeight={150}
                    toolbarLeft={
                        <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>{__('Footer Code', 'advajra')}</h3>
                    }
                    toolbarRight={
                        <Switch
                            checked={getBool('custom_code_footer_enabled')}
                            onChange={(val) => updateSetting('custom_code_footer_enabled', val)}
                            color="blue"
                        />
                    }
                />
            </div>

        </div>
    );
};

export default CustomCodeManager;
