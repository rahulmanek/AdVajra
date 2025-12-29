import React, { useEffect, useRef } from 'react';

const WPEditor = ({ id, content, onChange }) => {
    const editorId = `advajra-editor-${id}`;
    const editorRef = useRef(null);

    useEffect(() => {
        if (!window.wp || !window.wp.editor) {
            console.warn('wp.editor not found');
            return;
        }

        // Remove if exists
        window.wp.editor.remove(editorId);

        window.wp.editor.initialize(editorId, {
            tinymce: {
                wpautop: true,
                plugins: 'charmap colorpicker compat3x directionality fullscreen hr image lists media paste tabfocus textcolor wordpress wpautoresize wplink wptextpattern',
                toolbar1: 'bold italic underline strikethrough | bullist numlist | blockquote hr | alignleft aligncenter alignright | link unlink | colorpicker removeformat | charmap | outdent indent | undo redo',
                setup: (editor) => {
                    editorRef.current = editor;
                    editor.on('Change KeyUp', () => {
                        onChange(editor.getContent());
                    });
                }
            },
            quicktags: true,
            mediaButtons: true,
        });

        return () => {
            if (window.wp && window.wp.editor) {
                window.wp.editor.remove(editorId);
            }
        };
    }, []);

    // Sync content if it changes externally (careful with loops)
    useEffect(() => {
        if (editorRef.current && editorRef.current.getContent() !== content && document.activeElement !== editorRef.current.getBody()) {
             // editorRef.current.setContent(content); // Can cause cursor jumps, used sparingly
        }
    }, [content]);

    return (
        <div className="advajra-wp-editor">
            <textarea
                id={editorId}
                defaultValue={content}
                style={{ width: '100%', minHeight: '300px' }}
            />
        </div>
    );
};

export default WPEditor;
