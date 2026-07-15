import React from 'react';
import { Calendar } from 'lucide-react';
import './ui.css';

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  error,
  min,
  max,
  required = false,
  disabled = false
}) => {
  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label}
          {required && <span style={{ color: 'var(--accent-red, #ef4444)', marginLeft: '2px' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type="date"
          className="input-field"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          disabled={disabled}
          style={{
            paddingRight: '2.5rem',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        />
        <Calendar
          size={16}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none'
          }}
        />
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
};
