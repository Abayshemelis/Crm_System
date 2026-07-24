import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './ui.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, type, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={`input-wrapper ${className}`}>
        {label && <label className="input-label">{label}</label>}
        {isPassword ? (
          <div className="password-input-container">
            <input
              ref={ref}
              type={effectiveType}
              className={`input-field ${error ? 'input-error' : ''}`}
              style={{ paddingRight: '2.5rem' }}
              {...props}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(prev => !prev)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        ) : (
          <input
            ref={ref}
            type={effectiveType}
            className={`input-field ${error ? 'input-error' : ''}`}
            {...props}
          />
        )}
        {error && <span className="input-error-text">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
