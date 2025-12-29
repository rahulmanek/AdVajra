import React, { useRef, useEffect, useState } from 'react';

const CodeEditor = ({ value, onChange, placeholder, minHeight = 200, language = 'html', toolbarLeft, toolbarRight }) => {
    const textareaRef = useRef(null);
    const editorInstanceRef = useRef(null);
    const [fallback, setFallback] = useState(false);

    useEffect(() => {
        if (window.wp && window.wp.codeEditor && textareaRef.current && !editorInstanceRef.current) {
            
            // Map our simple language tags to codemirror modes
            let cmMode = 'text/html';
            if (language === 'css') cmMode = 'text/css';
            if (language === 'javascript') cmMode = 'text/javascript';
            if (language === 'ads.txt') cmMode = 'text/plain';

            const baseSettings = window.wp.codeEditor.defaultSettings ? window.wp.codeEditor.defaultSettings.codemirror || {} : {};

            const settings = {
                codemirror: {
                    ...baseSettings,
                    mode: cmMode,
                    lineNumbers: true,
                    indentUnit: 4,
                    tabSize: 4,
                    theme: 'default advajra-dark-cm', // Add Custom theme class
                }
            };
            
            try {
                editorInstanceRef.current = window.wp.codeEditor.initialize(textareaRef.current, settings);
                
                if (editorInstanceRef.current && editorInstanceRef.current.codemirror) {
                    editorInstanceRef.current.codemirror.on('change', (cMirror) => {
                        const newValue = cMirror.getValue();
                        if (newValue !== value) {
                            onChange(newValue);
                        }
                    });

                    // Ensure the CodeMirror instance takes up minHeight
                    editorInstanceRef.current.codemirror.setSize(null, minHeight);
                }
            } catch (err) {
                console.warn('AdVajra: Failed to initialize CodeMirror, falling back to basic textarea.', err);
                setFallback(true);
            }
        } else {
            setFallback(true);
        }

        return () => {
            if (editorInstanceRef.current && editorInstanceRef.current.codemirror) {
                try {
                    editorInstanceRef.current.codemirror.toTextArea();
                } catch(e) {}
            }
            editorInstanceRef.current = null;
        };
        // Disable hook linting because we only want to run this once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Also update CodeMirror when value prop changes externally
    useEffect(() => {
        if (editorInstanceRef.current && editorInstanceRef.current.codemirror) {
            const currentValue = editorInstanceRef.current.codemirror.getValue();
            if (value !== currentValue && value !== undefined && value !== null) {
                editorInstanceRef.current.codemirror.setValue(value);
            }
        }
    }, [value]);

    return (
        <div className="advajra-code-editor-wrap" style={{ 
            border: '1px solid #cbd5e1', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
        }}>
            {/* Toolbar Area */}
            {(toolbarLeft || toolbarRight) && (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {toolbarLeft}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {toolbarRight}
                    </div>
                </div>
            )}

            {/* Editor Area */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <textarea
                    ref={textareaRef}
                    placeholder={placeholder || "Enter code here..."}
                    value={value || ''}
                    onChange={fallback ? (e) => onChange(e.target.value) : undefined}
                    style={fallback ? { 
                        width: '100%', 
                        minHeight: minHeight,
                        padding: '16px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: 'none',
                        outline: 'none',
                        resize: 'vertical'
                    } : { display: 'none' }}
                />
            </div>
        </div>
    );
};

export default CodeEditor;
