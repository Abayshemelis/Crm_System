import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ManagerOnlyRouteProps {
    children: React.ReactNode;
}

export const ManagerOnlyRoute: React.FC<ManagerOnlyRouteProps> = ({ children }) => {
    const { token, user, isManagerOrAbove } = useAuth();
    const location = useLocation();

    if (!token || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isManagerOrAbove) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};
