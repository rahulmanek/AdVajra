/**
 * NotificationSystem.js
 */
import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationDataCtx';
import { check, info, warning } from '@wordpress/icons';
import { Icon } from '@wordpress/components';

const NotificationSystem = () => {
    const { notifications, removeNotification } = useNotification();

    return (
        <div className="advajra-notification-container">
            {notifications.map((note) => (
                <PrismPill key={note.id} note={note} onRemove={() => removeNotification(note.id)} />
            ))}
        </div>
    );
};

const PrismPill = ({ note, onRemove }) => {
    // Determine Type Styling
    const getTypeClass = (type) => {
        switch(type) {
            case 'success': return 'type-success';
            case 'error': return 'type-error';
            default: return 'type-info';
        }
    };

    // Icon mapping remains in JS as it deals with components
    const getIcon = (type) => {
         switch(type) {
            case 'success': return check;
            case 'error': return warning;
            default: return info;
        }
    }

    const typeClass = getTypeClass(note.type);
    const icon = getIcon(note.type);

    return (
        <div className={`advajra-prism-pill ${typeClass}`} onClick={onRemove}>

            <div className="holo-noise"></div>


            <div className="prism-icon">
                <Icon icon={icon} size={24} />
            </div>


            <div className="prism-content">
                <div className="message">{note.message}</div>
                <div className="sub">Tap to dismiss</div>
            </div>


            <div className="prism-close">
                <Icon icon="no" size={24} />
            </div>


            <div className="prism-progress"></div>
        </div>
    );
};

export default NotificationSystem;
