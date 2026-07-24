import React from 'react';

interface RoleBadgeProps {
    role: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
    const getColor = (r: string) => {
        switch (r.toLowerCase()) {
            case 'admin':
                return { bg: 'var(--status-won-bg)', text: 'var(--status-won-text)' };
            case 'manager':
                return { bg: 'var(--status-in-progress-bg)', text: 'var(--status-in-progress-text)' };
            case 'salesrep':
                return { bg: 'var(--status-new-bg)', text: 'var(--status-new-text)' };
            default:
                return { bg: 'var(--border-color)', text: 'var(--text-secondary)' };
        }
    };

    const colors = getColor(role);

    return (
        <span style={{
            backgroundColor: colors.bg,
            color: colors.text,
            padding: '0.2rem 0.5rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap'
        }}>
            {role}
        </span>
    );
};
