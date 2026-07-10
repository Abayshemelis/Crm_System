import React from 'react';
import { Building2 } from 'lucide-react';
import { Card } from '../ui/Card';
import '../ui/ui.css';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => (
    <div className="login-container">
        <div className="login-bg-glow" />
        <Card className="login-card glass-panel animate-fade-in">
            <div className="login-header">
                <div className="brand-logo-large"><Building2 size={32} /></div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
            </div>
            {children}
        </Card>
    </div>
);
