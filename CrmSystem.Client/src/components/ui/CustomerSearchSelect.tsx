import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { Search, X, User } from 'lucide-react';
import './ui.css';

interface Customer {
  customerId: number;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
}

interface CustomerSearchSelectProps {
  value: number | null;
  onChange: (customerId: number | null) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export const CustomerSearchSelect: React.FC<CustomerSearchSelectProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = "Search for a customer...",
  label
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load selected customer details when value changes
  useEffect(() => {
    if (value) {
      api.get<Customer>(`/api/customers/${value}`)
        .then(setSelectedCustomer)
        .catch(() => setSelectedCustomer(null));
    } else {
      setSelectedCustomer(null);
    }
  }, [value]);

  // Search customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await api.get<{ data: Customer[] }>(
          `/api/customers?search=${encodeURIComponent(searchTerm)}&page=1&pageSize=20`
        );
        setResults(data.data || []);
      } catch (error) {
        console.error('Failed to search customers:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: Customer) => {
    onChange(customer.customerId);
    setSelectedCustomer(customer);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange(null);
    setSelectedCustomer(null);
    setSearchTerm('');
  };

  const getDisplayText = (customer: Customer) => {
    const name = `${customer.firstName} ${customer.lastName}`;
    return customer.companyName ? `${name} (${customer.companyName})` : name;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label className="input-label" style={{ display: 'block', marginBottom: '0.25rem' }}>
          {label}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        {selectedCustomer ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-primary)',
              cursor: disabled ? 'not-allowed' : 'default'
            }}
          >
            <User size={16} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ flex: 1, fontSize: '0.875rem' }}>
              {getDisplayText(selectedCustomer)}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input-field"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder={placeholder}
              disabled={disabled}
              style={{
                width: '100%',
                paddingRight: '2.5rem',
                borderColor: error ? 'var(--error, #ef4444)' : undefined
              }}
            />
            <Search
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
        )}
      </div>

      {error && (
        <div className="field-error" style={{ marginTop: '0.25rem' }}>
          {error}
        </div>
      )}

      {showDropdown && !selectedCustomer && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000
          }}
        >
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {searchTerm ? 'No customers found' : 'Type to search customers'}
            </div>
          ) : (
            results.map(customer => (
              <div
                key={customer.customerId}
                onClick={() => handleSelectCustomer(customer)}
                style={{
                  padding: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <User size={16} style={{ color: 'var(--accent-primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {customer.firstName} {customer.lastName}
                  </div>
                  {customer.companyName && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {customer.companyName}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {customer.email}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
