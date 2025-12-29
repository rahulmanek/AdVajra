import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((arg1, arg2 = 'success') => {
        let message, type;

        if (typeof arg1 === 'object' && arg1 !== null) {

            message = arg1.message;
            type = arg1.type || 'success';
        } else {

            message = arg1;
            type = arg2;
        }

        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);


        setTimeout(() => {
            removeNotification(id);
        }, 4000);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ addNotification, notifications, removeNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};
