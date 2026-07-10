import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface RoleGateProps {
    allow: Array<'Admin' | 'Manager' | 'SalesRep'>;
    children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ allow, children }) => {
    const { user } = useAuth();
    const role = user?.role ?? 'SalesRep';
    return allow.includes(role as 'Admin' | 'Manager' | 'SalesRep') ? <>{children}</> : null;
};
