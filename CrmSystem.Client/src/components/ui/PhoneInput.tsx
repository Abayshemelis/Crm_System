import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { PHONE_COUNTRIES } from '../../lib/constants';
import './ui.css';

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  className?: string;
  label?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, error, className = '', label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Extract dial code and actual number if possible. 
  const matchedCountry = PHONE_COUNTRIES.find(c => value.startsWith(c.dialCode)) || PHONE_COUNTRIES.find(c => c.code === 'ET') || PHONE_COUNTRIES[0];
  
  const [selectedCountry, setSelectedCountry] = useState(matchedCountry);
  
  const localNumber = value.startsWith(selectedCountry.dialCode) 
    ? value.substring(selectedCountry.dialCode.length).trim() 
    : value;

  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d\s-]/g, '');
    if (!val.trim()) {
      onChange('');
    } else {
      onChange(`${selectedCountry.dialCode} ${val}`);
    }
  };

  const selectCountry = (country: typeof PHONE_COUNTRIES[0]) => {
    setSelectedCountry(country);
    setIsOpen(false);
    if (!localNumber.trim()) {
      onChange('');
    } else {
      onChange(`${country.dialCode} ${localNumber}`);
    }
  };

  const filteredCountries = PHONE_COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.dialCode.includes(search)
  );

  return (
    <div className={`input-wrapper ${className}`} ref={containerRef}>
      {label && <label className="input-label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>}
      <div className={`input-field ${error ? 'input-error' : ''}`} style={{ display: 'flex', padding: 0, overflow: 'visible', position: 'relative' }}>
        
        <div 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 0.75rem',
            cursor: 'pointer', borderRight: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px',
            userSelect: 'none'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>{selectedCountry.flag}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedCountry.dialCode}</span>
          <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
        </div>

        <input 
          type="text" 
          value={localNumber}
          onChange={handleNumberChange}
          placeholder="Phone number"
          style={{ flex: 1, border: 'none', background: 'transparent', padding: '0 0.75rem', outline: 'none', color: 'var(--text-primary)', width: '100%', minWidth: '0' }}
        />

        {isOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '300px',
            background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
            borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 100,
            display: 'flex', flexDirection: 'column', maxHeight: '300px'
          }}>
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={14} color="var(--text-secondary)" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search country or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
              {filteredCountries.map(c => (
                <div 
                  key={c.code}
                  onClick={() => selectCountry(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                    cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '1.1rem' }}>{c.flag}</span>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}>{c.dialCode}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <span className="input-error-text" style={{ color: 'var(--danger-color)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{error}</span>}
    </div>
  );
};
