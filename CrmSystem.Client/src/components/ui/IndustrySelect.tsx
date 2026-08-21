import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Plus, X, Briefcase } from 'lucide-react';
import './IndustrySelect.css';

export const COMMON_INDUSTRIES: string[] = [
  'Technology & Software',
  'Healthcare & Medical',
  'Financial Services & Banking',
  'Manufacturing & Industrial',
  'Retail & E-Commerce',
  'Education & Training',
  'Real Estate & Construction',
  'Telecommunications',
  'Hospitality & Tourism',
  'Energy, Oil & Gas',
  'Transportation & Logistics',
  'Agriculture & Farming',
  'Media & Entertainment',
  'Professional & Consulting',
  'Legal Services',
  'Automotive',
  'Food & Beverage',
  'Pharmaceuticals & Biotech',
  'Non-Profit & NGO',
  'Government & Public Sector',
  'Aerospace & Defense',
  'Architecture & Engineering',
  'Marketing & Advertising',
  'Other'
];

export interface IndustrySelectProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const IndustrySelect: React.FC<IndustrySelectProps> = ({
  label,
  value = '',
  onChange,
  placeholder = 'Select or type industry...',
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

  // Sync internal input text when prop value changes
  useEffect(() => {
    setInputText(value || '');
  }, [value]);

  // Filtered industries based on what user has typed
  const filteredIndustries = useMemo(() => {
    const query = inputText.trim().toLowerCase();
    if (!query) return COMMON_INDUSTRIES;

    const nonOther = COMMON_INDUSTRIES.filter(
      item => item.toLowerCase() !== 'other' && item.toLowerCase().includes(query)
    );
    const otherMatches = 'other'.includes(query);
    return otherMatches ? [...nonOther, 'Other'] : nonOther;
  }, [inputText]);

  // Check if typed text matches an existing predefined option exactly
  const hasExactMatch = useMemo(() => {
    const query = inputText.trim().toLowerCase();
    if (!query) return true;
    return COMMON_INDUSTRIES.some(ind => ind.toLowerCase() === query);
  }, [inputText]);

  // Auto-detect optimal dropdown position (open up if close to viewport bottom)
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
        // Commit whatever custom text the user typed
        if (inputText.trim() !== value) {
          onChange(inputText.trim());
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [inputText, value, onChange]);

  const handleSelect = (industry: string) => {
    setInputText(industry);
    onChange(industry);
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
      const maxIdx = (!hasExactMatch && inputText.trim() ? 1 : 0) + filteredIndustries.length - 1;
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
        const targetInd = filteredIndustries[highlightedIndex - offset];
        if (targetInd) {
          handleSelect(targetInd);
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
    const items = listRef.current.querySelectorAll('.industry-option-item');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div ref={containerRef} className={`industry-select-wrapper ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}

      <div
        className={`industry-input-container ${isOpen ? 'focused' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            setIsOpen(prev => !prev);
          }
        }}
      >
        <Briefcase size={15} className="industry-leading-icon" />

        <input
          ref={inputRef}
          id={id}
          type="text"
          className="industry-input-field"
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
            className="industry-clear-btn"
            onClick={handleClear}
            aria-label="Clear industry"
            title="Clear industry"
          >
            <X size={14} />
          </button>
        )}

        <button
          type="button"
          className="industry-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              setIsOpen(prev => !prev);
              inputRef.current?.focus();
            }
          }}
          tabIndex={-1}
          aria-label="Toggle industry dropdown"
        >
          <ChevronDown size={15} className={`industry-chevron ${isOpen ? 'open' : ''}`} />
        </button>
      </div>

      {error && <span className="input-error-text">{error}</span>}

      {isOpen && (
        <div className={`industry-dropdown-menu industry-dropdown-${dropdownPosition}`} role="listbox">
          <ul ref={listRef} className="industry-options-list">
            {/* Custom entered industry option when not an exact match */}
            {!hasExactMatch && inputText.trim() && (
              <li
                role="option"
                aria-selected={false}
                className={`industry-option-item industry-custom-item ${highlightedIndex === 0 ? 'highlighted' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(inputText.trim());
                }}
                onClick={() => handleSelect(inputText.trim())}
                onMouseEnter={() => setHighlightedIndex(0)}
              >
                <Plus size={13} className="industry-custom-icon" />
                <span className="industry-item-text">
                  Use custom: <strong>"{inputText.trim()}"</strong>
                </span>
              </li>
            )}

            {filteredIndustries.length === 0 && hasExactMatch ? (
              <li className="industry-no-results">No industries found</li>
            ) : (
              filteredIndustries.map((ind, idx) => {
                const isSelected = ind.toLowerCase() === (value || '').trim().toLowerCase();
                const actualIdx = (!hasExactMatch && inputText.trim() ? 1 : 0) + idx;
                const isHighlighted = actualIdx === highlightedIndex;

                return (
                  <li
                    key={ind}
                    role="option"
                    aria-selected={isSelected}
                    className={`industry-option-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(ind);
                    }}
                    onClick={() => handleSelect(ind)}
                    onMouseEnter={() => setHighlightedIndex(actualIdx)}
                  >
                    <span className="industry-item-text">{ind}</span>
                    {isSelected && <Check size={14} className="industry-item-check" />}
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
