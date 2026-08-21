import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, X, Users } from 'lucide-react';
import './CompanySizeSelect.css';

export const COMMON_COMPANY_SIZES: string[] = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1,000 employees',
  '1,001-5,000 employees',
  '5,001-10,000 employees',
  '10,000+ employees',
  'Other'
];

export interface CompanySizeSelectProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const CompanySizeSelect: React.FC<CompanySizeSelectProps> = ({
  label,
  value = '',
  onChange,
  placeholder = 'Select or type company size...',
  error,
  disabled = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(value);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync internal text when prop value changes
  useEffect(() => {
    setInputText(value || '');
  }, [value]);

  // Filtered company sizes based on user search
  const filteredSizes = useMemo(() => {
    const query = inputText.trim().toLowerCase();
    if (!query) return COMMON_COMPANY_SIZES;

    const nonOther = COMMON_COMPANY_SIZES.filter(
      item => item.toLowerCase() !== 'other' && item.toLowerCase().includes(query)
    );
    const otherMatches = 'other'.includes(query);
    return otherMatches ? [...nonOther, 'Other'] : nonOther;
  }, [inputText]);

  // Check if typed text matches an existing option exactly
  const hasExactMatch = useMemo(() => {
    const query = inputText.trim().toLowerCase();
    if (!query) return true;
    return COMMON_COMPANY_SIZES.some(s => s.toLowerCase() === query);
  }, [inputText]);

  // Auto-detect optimal dropdown position
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 210 && rect.top > 210) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  // Close dropdown on outside click and commit typed text
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (inputText.trim() !== value) {
          onChange(inputText.trim());
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [inputText, value, onChange]);

  const handleSelect = (size: string) => {
    setInputText(size);
    onChange(size);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    onChange(val);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputText('');
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIdx = (!hasExactMatch && inputText.trim() ? 1 : 0) + filteredSizes.length - 1;
      setHighlightedIndex(prev => (prev < maxIdx ? prev + 1 : prev));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!hasExactMatch && inputText.trim() && highlightedIndex === 0) {
        handleSelect(inputText.trim());
      } else {
        const offset = !hasExactMatch && inputText.trim() ? 1 : 0;
        const targetSize = filteredSizes[highlightedIndex - offset];
        if (targetSize) {
          handleSelect(targetSize);
        } else if (inputText.trim()) {
          handleSelect(inputText.trim());
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('.size-option-item');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div ref={containerRef} className={`company-size-select-wrapper ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}

      <div
        className={`company-size-input-container ${isOpen ? 'focused' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            setIsOpen(prev => !prev);
          }
        }}
      >
        <Users size={15} className="size-leading-icon" />

        <input
          ref={inputRef}
          id={id}
          type="text"
          className="size-input-field"
          placeholder={placeholder}
          value={inputText}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {inputText && !disabled && (
          <button
            type="button"
            className="size-clear-btn"
            onClick={handleClear}
            aria-label="Clear size"
            title="Clear company size"
          >
            <X size={14} />
          </button>
        )}

        <button
          type="button"
          className="size-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              setIsOpen(prev => !prev);
              inputRef.current?.focus();
            }
          }}
          tabIndex={-1}
          aria-label="Toggle company size dropdown"
        >
          <ChevronDown size={15} className={`size-chevron ${isOpen ? 'open' : ''}`} />
        </button>
      </div>

      {error && <span className="input-error-text">{error}</span>}

      {isOpen && (
        <div className={`size-dropdown-menu size-dropdown-${dropdownPosition}`} role="listbox">
          <ul ref={listRef} className="size-options-list">
            {/* Custom entered size option when not an exact match */}
            {!hasExactMatch && inputText.trim() && (
              <li
                role="option"
                aria-selected={false}
                className={`size-option-item size-custom-item ${highlightedIndex === 0 ? 'highlighted' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(inputText.trim());
                }}
                onClick={() => handleSelect(inputText.trim())}
                onMouseEnter={() => setHighlightedIndex(0)}
              >
                <Plus size={13} className="size-custom-icon" />
                <span className="size-item-text">
                  Use custom: <strong>"{inputText.trim()}"</strong>
                </span>
              </li>
            )}

            {filteredSizes.length === 0 && hasExactMatch ? (
              <li className="size-no-results">No size options found</li>
            ) : (
              filteredSizes.map((size, idx) => {
                const isSelected = size.toLowerCase() === (value || '').trim().toLowerCase();
                const actualIdx = (!hasExactMatch && inputText.trim() ? 1 : 0) + idx;
                const isHighlighted = actualIdx === highlightedIndex;

                return (
                  <li
                    key={size}
                    role="option"
                    aria-selected={isSelected}
                    className={`size-option-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(size);
                    }}
                    onClick={() => handleSelect(size)}
                    onMouseEnter={() => setHighlightedIndex(actualIdx)}
                  >
                    <span className="size-item-text">{size}</span>
                    {isSelected && <Check size={14} className="size-item-check" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
