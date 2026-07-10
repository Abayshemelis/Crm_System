import React from 'react';
import { Button } from './Button';
import './ui.css';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  actionText?: string;
  onActionClick?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  actionText,
  onActionClick,
  className = ''
}) => {
  return (
    <div className={`empty-state-wrapper glass-panel ${className}`}>
      {Icon && (
        <div className="empty-state-icon">
          <Icon size={40} />
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionText && onActionClick && (
        <Button size="sm" onClick={onActionClick} style={{ marginTop: '1rem' }}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
