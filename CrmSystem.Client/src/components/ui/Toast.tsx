import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error';
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = window.setTimeout(onClose, 3200);
        return () => window.clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast toast-${type}`} role="status">
            <span>{message}</span>
        </div>
    );
};
