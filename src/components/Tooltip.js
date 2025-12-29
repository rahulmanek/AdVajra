/**
 * Tooltip Component
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const Tooltip = ({
    content,
    children,
    icon = '💡',
    position = 'bottom', // 'top' | 'bottom' | 'left' | 'right'
    delay = 100, // hover delay in ms
    maxWidth = 280,
    className = 'text-sm',
    style = {},
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [placement, setPlacement] = useState(position);
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const timeoutRef = useRef(null);

    // Calculate and update tooltip position
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;

        const trigger = triggerRef.current.getBoundingClientRect();
        const gap = 10; // Gap between trigger and tooltip
        const viewportPadding = 12; // Minimum distance from viewport edges

        // Get tooltip dimensions (use estimate if not yet rendered)
        let tooltipWidth = maxWidth;
        let tooltipHeight = 40;
        if (tooltipRef.current) {
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            tooltipWidth = tooltipRect.width;
            tooltipHeight = tooltipRect.height;
        }

        let top, left;
        let finalPlacement = position;

        // Calculate position based on preferred placement
        const positions = {
            bottom: {
                top: trigger.bottom + gap + window.scrollY,
                left: trigger.left + (trigger.width / 2) - (tooltipWidth / 2) + window.scrollX,
                fallback: 'top'
            },
            top: {
                top: trigger.top - tooltipHeight - gap + window.scrollY,
                left: trigger.left + (trigger.width / 2) - (tooltipWidth / 2) + window.scrollX,
                fallback: 'bottom'
            },
            left: {
                top: trigger.top + (trigger.height / 2) - (tooltipHeight / 2) + window.scrollY,
                left: trigger.left - tooltipWidth - gap + window.scrollX,
                fallback: 'right'
            },
            right: {
                top: trigger.top + (trigger.height / 2) - (tooltipHeight / 2) + window.scrollY,
                left: trigger.right + gap + window.scrollX,
                fallback: 'left'
            }
        };

        // Get initial position
        let pos = positions[position];
        top = pos.top;
        left = pos.left;

        // Check if position overflows viewport and flip if needed
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Check vertical overflow
        if (position === 'bottom' && (trigger.bottom + gap + tooltipHeight > viewportHeight - viewportPadding)) {
            pos = positions.top;
            top = pos.top;
            finalPlacement = 'top';
        } else if (position === 'top' && (trigger.top - gap - tooltipHeight < viewportPadding)) {
            pos = positions.bottom;
            top = pos.top;
            finalPlacement = 'bottom';
        }

        // Check horizontal overflow
        if (position === 'right' && (trigger.right + gap + tooltipWidth > viewportWidth - viewportPadding)) {
            pos = positions.left;
            left = pos.left;
            finalPlacement = 'left';
        } else if (position === 'left' && (trigger.left - gap - tooltipWidth < viewportPadding)) {
            pos = positions.right;
            left = pos.left;
            finalPlacement = 'right';
        }

        // Ensure tooltip stays within viewport horizontally
        const scrollX = window.scrollX;
        if (left < viewportPadding + scrollX) {
            left = viewportPadding + scrollX;
        } else if (left + tooltipWidth > viewportWidth + scrollX - viewportPadding) {
            left = viewportWidth + scrollX - tooltipWidth - viewportPadding;
        }

        // Ensure tooltip stays within viewport vertically
        const scrollY = window.scrollY;
        if (top < viewportPadding + scrollY) {
            top = viewportPadding + scrollY;
        }

        setCoords({ top, left });
        setPlacement(finalPlacement);
    }, [position, maxWidth]);

    // Update position when visible
    useEffect(() => {
        if (isVisible) {
            // Initial position calculation
            updatePosition();
            // Recalculate after tooltip renders to get accurate dimensions
            requestAnimationFrame(updatePosition);
        }
    }, [isVisible, updatePosition]);

    // Handle scroll and resize events
    useEffect(() => {
        if (!isVisible) return;

        const handleUpdate = () => {
            requestAnimationFrame(updatePosition);
        };

        window.addEventListener('scroll', handleUpdate, true);
        window.addEventListener('resize', handleUpdate);

        return () => {
            window.removeEventListener('scroll', handleUpdate, true);
            window.removeEventListener('resize', handleUpdate);
        };
    }, [isVisible, updatePosition]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Event handlers
    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    const handleFocus = () => setIsVisible(true);
    const handleBlur = () => setIsVisible(false);

    // Handle escape key
    useEffect(() => {
        if (!isVisible) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setIsVisible(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isVisible]);

    // Render trigger element
    const triggerElement = children || (
        <span className="tooltip-icon">{icon}</span>
    );

    // Tooltip portal content
    const tooltipContent = isVisible && createPortal(
        <div
            ref={tooltipRef}
            className={`av-tooltip av-tooltip--${placement} ${className}`}
            role="tooltip"
            style={{
                position: 'absolute',
                top: coords.top,
                left: coords.left,
                maxWidth: maxWidth,
                zIndex: 999999,
                ...style,
            }}
        >
            <div className="av-tooltip__content">
                {content}
            </div>
            <div className="av-tooltip__arrow" />
        </div>,
        document.body
    );

    return (
        <>
            <span
                ref={triggerRef}
                className="av-tooltip__trigger"
                tabIndex={0}
                role="button"
                aria-describedby={isVisible ? 'tooltip' : undefined}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={handleFocus}
                onBlur={handleBlur}
            >
                {triggerElement}
            </span>
            {tooltipContent}
        </>
    );
};

export default Tooltip;
