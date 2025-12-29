/**
 * ActionDropdown.js
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@wordpress/components';
import { moreVertical } from '@wordpress/icons';

/**
 * ActionDropdown Component
 *
 * @param {Array} actions - Array of action objects: { icon, label, onClick, variant }
 *   - variant: 'primary' (blue), 'info' (purple), 'success' (green), 'danger' (red)
 * @param {Object} triggerIcon - Icon for the trigger button (default: moreVertical)
 */
const ActionDropdown = ({ actions = [], triggerIcon = moreVertical }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const panelRef = useRef(null);

    // Calculate position
    const updatePosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const panelWidth = 160;

            let left = rect.right - panelWidth;
            if (left < 8) left = 8;
            if (left + panelWidth > window.innerWidth - 8) {
                left = window.innerWidth - panelWidth - 8;
            }

            setPosition({
                top: rect.bottom + 8,
                left: left,
            });
        }
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target) &&
                panelRef.current && !panelRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    // Update position on scroll/resize when open
    useEffect(() => {
        if (isOpen) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen, updatePosition]);

    // Reset ready state after close animation
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => setIsReady(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleTriggerClick = (e) => {
        e.stopPropagation();

        if (!isOpen) {
            updatePosition();
            setIsReady(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsOpen(true);
                });
            });
        } else {
            setIsOpen(false);
        }
    };

    const handleActionClick = (action) => {
        setIsOpen(false);
        setTimeout(() => action.onClick?.(), 100);
    };

    // Dropdown panel (rendered via Portal)
    const dropdownPanel = isReady ? (
        <div
            ref={panelRef}
            className={`advajra-action-panel ${isOpen ? 'is-visible' : ''}`}
            style={{ top: position.top, left: position.left }}
        >
            {actions.map((action, index) => (
                action.divider ? (
                    <div key={index} className="advajra-action-divider" />
                ) : (
                    <button
                        key={index}
                        className={`advajra-action-item advajra-action-item--${action.variant || 'primary'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(action);
                        }}
                    >
                        <span className="advajra-action-icon">
                            <Icon icon={action.icon} />
                        </span>
                        <span>{action.label}</span>
                    </button>
                )
            ))}
        </div>
    ) : null;

    return (
        <div className="advajra-action-dropdown">
            <button
                ref={triggerRef}
                className={`advajra-action-trigger ${isOpen ? 'is-open' : ''}`}
                onClick={handleTriggerClick}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <Icon icon={triggerIcon} size={20} />
            </button>

            {createPortal(dropdownPanel, document.body)}
        </div>
    );
};

export default ActionDropdown;
