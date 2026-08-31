import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ManagerOnlyRouteProps {
    children: React.ReactNode;
}

const PageLoader = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div
            className="spinner-icon"
            style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(99,102,241,0.2)',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }}
        />
    </div>
);

export const ManagerOnlyRoute: React.FC<ManagerOnlyRouteProps> = ({ children }) => {
    const { token, user, isManagerOrAbove, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <PageLoader />;
    }

    if (!token || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isManagerOrAbove) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};
