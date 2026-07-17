import React, { useState, useRef, useEffect, useMemo } from 'react';
import './SearchableSelect.css';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  value: string | number;
  options: SelectOption[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Type to search...',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => {
    return options.find(o => String(o.value) === String(value));
  }, [options, value]);

  // Set initial/updated value in the input text when not editing
  useEffect(() => {
    if (!isFocused) {
      setFilterText(selectedOption ? selectedOption.label : '');
    }
  }, [selectedOption, isFocused]);

  // Filter options based on user text input
  const filteredOptions = useMemo(() => {
    const query = (filterText || '').trim().toLowerCase();
    if (!query || !isFocused) {
      return options;
    }
    return options.filter(o => o.label.toLowerCase().includes(query));
  }, [options, filterText, isFocused]);

  // Close list on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
    setOpen(true);
    // Select the current input text on focus for easier search-over
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleSelect = (option: SelectOption) => {
    onChange(option.value);
    setFilterText(option.label);
    setOpen(false);
    setIsFocused(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <div ref={containerRef} className={`ss-container ${className}`}>
      <div className="ss-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className={`input-field ss-input ${open ? 'ss-input--open' : ''}`}
          placeholder={placeholder}
          value={filterText}
          onChange={e => {
            setFilterText(e.target.value);
            setOpen(true);
          }}
          onFocus={handleFocus}
        />
        <svg
          className={`ss-chevron ${open ? 'ss-chevron--open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          onClick={() => {
            if (open) {
              inputRef.current?.blur();
              setOpen(false);
              setIsFocused(false);
            } else {
              inputRef.current?.focus();
            }
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {open && (
        <ul className="ss-list animate-ss-open" role="listbox">
          {filteredOptions.length === 0 ? (
            <li className="ss-no-results">No matches found</li>
          ) : (
            filteredOptions.map(opt => (
              <li
                key={opt.value}
                role="option"
                aria-selected={String(opt.value) === String(value)}
                className={`ss-option ${String(opt.value) === String(value) ? 'ss-option--selected' : ''}`}
                onMouseDown={() => handleSelect(opt)}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
