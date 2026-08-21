import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, X, Check, AlertCircle } from 'lucide-react';
import { COUNTRIES, Country, DEFAULT_COUNTRY, parsePhoneNumber, validatePhoneNumber, getCountryFlagUrl } from './countryData';
import './PhoneInput.css';

export interface PhoneInputProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  defaultCountryCode?: string;
  showInlineValidation?: boolean;
}

/**
 * High quality Country Flag component with instant Unicode emoji fallback and crisp CDN image
 */
export const CountryFlag: React.FC<{ country: Country }> = ({ country }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [country.code]);

  return (
    <span className="country-flag-wrapper" title={country.name}>
      {!imgError && (
        <img
          src={getCountryFlagUrl(country.code)}
          alt={`${country.name} flag`}
          className="country-flag-img"
          style={{ display: imgLoaded ? 'block' : 'none' }}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      )}
      {(!imgLoaded || imgError) && (
        <span className="country-flag-fallback" role="img" aria-label={country.name}>
          {country.flag}
        </span>
      )}
    </span>
  );
};

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value = '',
  onChange,
  error,
  placeholder,
  disabled = false,
  className = '',
  id,
  defaultCountryCode = 'ET', // Defaults to Ethiopia (+251) or specified
  showInlineValidation = true,
}) => {
  // Find fallback country from defaultCountryCode prop
  const initialCountry = useMemo(() => {
    return COUNTRIES.find(c => c.code.toUpperCase() === defaultCountryCode.toUpperCase()) || DEFAULT_COUNTRY;
  }, [defaultCountryCode]);

  // Selected country state
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    if (value) {
      const parsed = parsePhoneNumber(value, initialCountry);
      return parsed.country;
    }
    return initialCountry;
  });

  // National phone number state (excluding the dial code)
  const [nationalNumber, setNationalNumber] = useState<string>(() => {
    if (value) {
      const parsed = parsePhoneNumber(value, initialCountry);
      return parsed.nationalNumber;
    }
    return '';
  });

  // Dropdown states
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Auto-detect optimal dropdown position (open up if close to bottom)
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

  // Sync internal state when external `value` prop changes
  useEffect(() => {
    if (value !== undefined) {
      const parsed = parsePhoneNumber(value, selectedCountry);
      setSelectedCountry(parsed.country);
      setNationalNumber(parsed.nationalNumber);
    }
  }, [value]);

  // Live validation for current country + national number
  const liveValidationError = useMemo(() => {
    if (!nationalNumber.trim()) return null;
    return validatePhoneNumber(nationalNumber, selectedCountry);
  }, [nationalNumber, selectedCountry]);

  // Filtered countries based on search query
  const filteredCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return COUNTRIES;

    // Remove leading '+' from query if user searched for '+251' or '251'
    const cleanQuery = query.startsWith('+') ? query.slice(1) : query;

    return COUNTRIES.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(query);
      const codeMatch = c.code.toLowerCase().includes(query);
      const dialMatch = c.dialCode.replace('+', '').includes(cleanQuery);
      return nameMatch || codeMatch || dialMatch;
    });
  }, [searchQuery]);

  // Reset highlight index when filtered results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCountries]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Emit updated phone number (prepends country dial code automatically)
  const emitChange = (country: Country, numberStr: string) => {
    const trimmedNumber = numberStr.trim();
    if (!trimmedNumber) {
      onChange?.('');
    } else {
      onChange?.(`${country.dialCode} ${trimmedNumber}`);
    }
  };

  // Handle national number input change
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // 1. If user pasted/typed full international number with '+', e.g. '+251 91 123 4567'
    if (val.trim().startsWith('+')) {
      const parsed = parsePhoneNumber(val, selectedCountry);
      let cleanNat = parsed.nationalNumber;
      if ((parsed.country.code === 'ET' || parsed.country.code === 'GB') && cleanNat.startsWith('0')) {
        cleanNat = cleanNat.replace(/^0+/, '');
      }
      setSelectedCountry(parsed.country);
      setNationalNumber(cleanNat);
      emitChange(parsed.country, cleanNat);
      return;
    }

    // 2. If user typed/pasted the dial code digits without '+', e.g. '251911234567'
    const dialDigits = selectedCountry.dialCode.replace('+', '');
    const cleanDigits = val.replace(/\D/g, '');
    if (cleanDigits.startsWith(dialDigits) && cleanDigits.length > (selectedCountry.maxDigits || 9)) {
      val = cleanDigits.slice(dialDigits.length);
    }

    setNationalNumber(val);
    emitChange(selectedCountry, val);
  };

  // Handle input blur (auto-sanitize leading zeros for countries that drop leading zero in intl format)
  const handleBlur = () => {
    setIsInputFocused(false);
    if ((selectedCountry.code === 'ET' || selectedCountry.code === 'GB') && nationalNumber.startsWith('0')) {
      const sanitized = nationalNumber.replace(/^0+/, '');
      setNationalNumber(sanitized);
      emitChange(selectedCountry, sanitized);
    }
  };

  // Auto-fix handler for removing leading 0
  const handleStripLeadingZero = () => {
    const fixed = nationalNumber.replace(/^0+/, '');
    setNationalNumber(fixed);
    emitChange(selectedCountry, fixed);
    numberInputRef.current?.focus();
  };

  // Handle country selection
  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    emitChange(country, nationalNumber);
    numberInputRef.current?.focus();
  };

  // Handle keyboard navigation in search box
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredCountries.length - 1 ? prev + 1 : prev));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCountries[highlightedIndex]) {
        handleSelectCountry(filteredCountries[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      numberInputRef.current?.focus();
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('.phone-country-item');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  const displayError = error || (showInlineValidation && !isInputFocused ? liveValidationError : null);

  return (
    <div ref={containerRef} className={`phone-input-wrapper ${className}`}>
      {label && <label htmlFor={id} className="phone-input-label">{label}</label>}

      <div
        className={`phone-input-group ${isInputFocused || isOpen ? 'focused' : ''} ${displayError ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
      >
        {/* Country Selector Trigger */}
        <button
          type="button"
          className="phone-country-btn"
          onClick={() => {
            if (!disabled) setIsOpen(prev => !prev);
          }}
          disabled={disabled}
          title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <CountryFlag country={selectedCountry} />
          <span className="phone-dial-code">{selectedCountry.dialCode}</span>
          <ChevronDown size={14} className={`phone-chevron ${isOpen ? 'open' : ''}`} />
        </button>

        {/* National Number Input - User just types local/national phone number without country code */}
        <input
          ref={numberInputRef}
          id={id}
          type="tel"
          className="phone-number-field"
          value={nationalNumber}
          onChange={handleNumberChange}
          onFocus={() => setIsInputFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder || selectedCountry.placeholder || 'Phone number'}
          disabled={disabled}
          autoComplete="tel-national"
        />
      </div>

      {/* Live Warning / helper when typing leading 0 for Ethiopia or UK */}
      {nationalNumber.startsWith('0') && (selectedCountry.code === 'ET' || selectedCountry.code === 'GB') && (
        <div className="phone-validation-warning">
          <span>
            <AlertCircle size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            When using {selectedCountry.dialCode}, leading <strong>0</strong> is automatically dropped (e.g. 911 234 567).
          </span>
          <button type="button" className="phone-auto-fix-btn" onClick={handleStripLeadingZero}>
            Remove 0
          </button>
        </div>
      )}

      {displayError && <span className="input-error-text">{displayError}</span>}

      {/* Country Selector Dropdown */}
      {isOpen && (
        <div className={`phone-dropdown-menu phone-dropdown-${dropdownPosition}`} role="dialog" aria-label="Country selector">
          {/* Search Box */}
          <div className="phone-dropdown-search-wrapper">
            <Search size={15} className="phone-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="phone-dropdown-search-input"
              placeholder="Search country or dial code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchQuery && (
              <button
                type="button"
                className="phone-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Country List */}
          <ul ref={listRef} className="phone-country-list" role="listbox">
            {filteredCountries.length === 0 ? (
              <li className="phone-no-results">No countries found</li>
            ) : (
              filteredCountries.map((country, idx) => {
                const isSelected = country.code === selectedCountry.code && country.dialCode === selectedCountry.dialCode;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={`${country.code}-${country.dialCode}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`phone-country-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectCountry(country);
                    }}
                    onClick={() => handleSelectCountry(country)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    <CountryFlag country={country} />
                    <span className="phone-item-name">{country.name}</span>
                    <span className="phone-item-dial">{country.dialCode}</span>
                    {isSelected && <Check size={14} className="phone-item-check" />}
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
