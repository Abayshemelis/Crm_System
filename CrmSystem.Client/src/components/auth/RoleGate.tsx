import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface RoleGateProps {
    allow: Array<'Admin' | 'Manager' | 'SalesRep'>;
    children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ allow, children }) => {
    const { userRole } = useAuth();
    return allow.includes(userRole) ? <>{children}</> : null;
};
