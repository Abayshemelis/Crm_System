import React from 'react';
import './ui.css';

interface SkeletonProps {
  variant?: 'text' | 'avatar' | 'card' | 'rect';
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  style
}) => {
  const customStyle: React.CSSProperties = {
    width: width ?? undefined,
    height: height ?? undefined,
    ...style
  };

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={customStyle}
    />
  );
};
