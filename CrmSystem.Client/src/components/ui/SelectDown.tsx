import React, { useState, useRef, useEffect } from 'react';
import './SelectDown.css';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectDownProps {
  value: string | number;
  options: SelectOption[];
  onChange: (value: string | number) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  compact?: boolean;
}

export const SelectDown: React.FC<SelectDownProps> = ({
  value,
  options,
  onChange,
  className = '',
  placeholder = 'Select...',
  id,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => String(o.value) === String(value));

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleSelect = (optVal: string | number) => {
    onChange(optVal);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`sd-container ${compact ? 'sd-compact' : ''} ${className}`}
      id={id}
    >
      <button
        type="button"
        className={`sd-trigger ${open ? 'sd-trigger--open' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="sd-trigger-label">
          {selected ? selected.label : <span className="sd-placeholder">{placeholder}</span>}
        </span>
        <svg
          className={`sd-chevron ${open ? 'sd-chevron--open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul className="sd-list" role="listbox">
          {options.map((opt, index) => (
            <li
              key={`${opt.value}-${index}`}
              role="option"
              aria-selected={String(opt.value) === String(value)}
              className={`sd-option ${String(opt.value) === String(value) ? 'sd-option--selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
