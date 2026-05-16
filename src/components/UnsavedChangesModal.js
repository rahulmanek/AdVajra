/**
 * UnsavedChangesModal.js
 *
 * Premium confirmation dialog for unsaved changes protection.
 *
 * Architecture decision: All structural CSS is inline.
 * Reason: In WordPress admin, co-located SCSS imports can be injected
 * in a different pass from the main bundle, and parent elements with
 * `transform`, `will-change: transform`, or `filter` (common in WP admin
 * and our own glass-row components) create new containing blocks that
 * break `position: fixed`. Inline styles are immune to both issues.
 *
 * @package advajra
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ── Inline style objects (structural layout — cannot be overridden externally) ──

const OVERLAY_STYLE = {
    position:        'fixed',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    zIndex:          999999,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    background:      'rgba(15, 28, 46, 0.6)',
    backdropFilter:  'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxSizing:       'border-box',
    margin:          0,
    padding:         0,
};

const MODAL_STYLE = {
    background:      '#ffffff',
    borderRadius:    '16px',
    boxShadow:       '0 24px 48px -12px rgba(0,0,0,0.18), 0 12px 24px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
    padding:         '32px',
    maxWidth:        '420px',
    width:           'calc(100% - 32px)',
    textAlign:       'center',
    boxSizing:       'border-box',
    position:        'relative',
    margin:          0,
    border:          'none',
};

const ICON_STYLE = {
    display:         'flex',
    justifyContent:  'center',
    marginBottom:    '16px',
};

const TITLE_STYLE = {
    fontFamily:      "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize:        '18px',
    fontWeight:      700,
    color:           '#1e293b',
    margin:          '0 0 8px 0',
    padding:         0,
    lineHeight:      1.3,
    border:          'none',
    background:      'none',
};

const DESC_STYLE = {
    fontFamily:      "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize:        '14px',
    lineHeight:      1.6,
    color:           '#475569',
    margin:          '0 0 24px 0',
    padding:         0,
};

const ACTIONS_STYLE = {
    display:         'flex',
    gap:             '12px',
    justifyContent:  'center',
};

const BTN_BASE = {
    fontFamily:      "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize:        '14px',
    fontWeight:      600,
    padding:         '10px 24px',
    borderRadius:    '12px',
    cursor:          'pointer',
    whiteSpace:      'nowrap',
    lineHeight:      1.4,
    textDecoration:  'none',
    textTransform:   'none',
    letterSpacing:   'normal',
    boxSizing:       'border-box',
    transition:      'all 0.2s ease',
    display:         'inline-block',
    minHeight:       'auto',
    height:          'auto',
};

const BTN_STAY = {
    ...BTN_BASE,
    background:  '#0f1c2e',
    color:       '#ffffff',
    border:      'none',
};

const BTN_LEAVE = {
    ...BTN_BASE,
    background:  'transparent',
    color:       '#dc2626',
    border:      '1.5px solid #fecaca',
};

// ── Component ──

const UnsavedChangesModal = ( { onConfirm, onCancel } ) => {
    const stayBtnRef = useRef( null );

    // Focus "Stay" button on mount (safe default action)
    useEffect( () => {
        if ( stayBtnRef.current ) {
            stayBtnRef.current.focus();
        }
    }, [] );

    // Escape key = stay on page
    useEffect( () => {
        const handleKeyDown = ( e ) => {
            if ( e.key === 'Escape' ) {
                e.preventDefault();
                onCancel();
            }
        };
        document.addEventListener( 'keydown', handleKeyDown );
        return () => document.removeEventListener( 'keydown', handleKeyDown );
    }, [ onCancel ] );

    // Prevent body scroll while modal is open
    useEffect( () => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [] );

    const modalContent = (
        <div style={ OVERLAY_STYLE } onClick={ onCancel }>
            <div
                style={ MODAL_STYLE }
                onClick={ ( e ) => e.stopPropagation() }
                role="dialog"
                aria-modal="true"
                aria-labelledby="av-unsaved-title"
                aria-describedby="av-unsaved-desc"
            >
                {/* Warning Icon */}
                <div style={ ICON_STYLE }>
                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="26" cy="26" r="24" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
                        <path d="M26 16v14" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="26" cy="36" r="2.5" fill="#D97706" />
                    </svg>
                </div>

                {/* Title */}
                <h2 id="av-unsaved-title" style={ TITLE_STYLE }>
                    Unsaved Changes
                </h2>

                {/* Description */}
                <p id="av-unsaved-desc" style={ DESC_STYLE }>
                    You have unsaved changes that will be lost if you leave this page. Would you like to stay and save your work?
                </p>

                {/* Actions */}
                <div style={ ACTIONS_STYLE }>
                    <button
                        ref={ stayBtnRef }
                        style={ BTN_STAY }
                        onClick={ onCancel }
                        onMouseEnter={ ( e ) => {
                            e.currentTarget.style.background = '#1f2e44';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        } }
                        onMouseLeave={ ( e ) => {
                            e.currentTarget.style.background = '#0f1c2e';
                            e.currentTarget.style.transform = 'translateY(0)';
                        } }
                    >
                        Stay on Page
                    </button>
                    <button
                        style={ BTN_LEAVE }
                        onClick={ onConfirm }
                        onMouseEnter={ ( e ) => {
                            e.currentTarget.style.background = '#fef2f2';
                            e.currentTarget.style.borderColor = '#fca5a5';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        } }
                        onMouseLeave={ ( e ) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = '#fecaca';
                            e.currentTarget.style.transform = 'translateY(0)';
                        } }
                    >
                        Discard & Leave
                    </button>
                </div>
            </div>
        </div>
    );

    // Portal to document.body — outside all WP admin and plugin containers,
    // so no parent transform/will-change/filter can contain position:fixed.
    return createPortal( modalContent, document.body );
};

export default UnsavedChangesModal;
