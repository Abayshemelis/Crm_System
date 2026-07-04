import React from 'react';
import './ui.css';

interface CardProps { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void; }

export const Card: React.FC<CardProps> & {
  Header: React.FC<CardProps>;
  Title: React.FC<CardProps>;
  Content: React.FC<CardProps>;
} = ({ children, className = '', style, onClick }) => (
  <div className={`card ${className}`} style={style} onClick={onClick}>{children}</div>
);

Card.Header = ({ children, className = '' }) => <div className={`card-header ${className}`}>{children}</div>;
Card.Title = ({ children, className = '' }) => <h3 className={`card-title ${className}`}>{children}</h3>;
Card.Content = ({ children, className = '' }) => <div className={`card-content ${className}`}>{children}</div>;
