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
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Type to search...',
  className = '',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = useMemo(() => {
    return options.find(o => String(o.value) === String(value));
  }, [options, value]);

  // Sync displayed text with selected value when not actively typing
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

  // Reset highlight when options filter changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions]);

  // Close list on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
    setOpen(true);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setIsFocused(true);
      } else {
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setIsFocused(true);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (open && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.ss-option');
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className={`ss-container ${className}`}>
      <div className="ss-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className={`input-field ss-input ${open ? 'ss-input--open' : ''}`}
          placeholder={placeholder}
          value={filterText}
          disabled={disabled}
          autoComplete="off"
          onChange={e => {
            if (disabled) return;
            setFilterText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) handleFocus();
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          className="ss-chevron-btn"
          aria-label="Toggle dropdown"
          onClick={() => {
            if (disabled) return;
            if (open) {
              inputRef.current?.blur();
              setOpen(false);
              setIsFocused(false);
            } else {
              inputRef.current?.focus();
              handleFocus();
            }
          }}
        >
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
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {open && (
        <ul ref={listRef} className="ss-list animate-ss-open" role="listbox">
          {filteredOptions.length === 0 ? (
            <li className="ss-no-results">No matches found</li>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const isHighlighted = idx === highlightedIndex;
              return (
                <li
                  key={`${opt.value}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`ss-option ${isSelected ? 'ss-option--selected' : ''} ${isHighlighted ? 'ss-option--highlighted' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                >
                  <span className="ss-option-label">{opt.label}</span>
                  {isSelected && (
                    <svg className="ss-check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
