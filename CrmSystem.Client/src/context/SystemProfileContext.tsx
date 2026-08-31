import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface SystemProfile {
  id: number;
  systemName: string;
  companyName: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  currency: string | null;
  timezone: string | null;
}

interface SystemProfileContextType {
  profile: SystemProfile | null;
  currency: string;
  timezone: string;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
  formatCurrency: (value: number, customCurrency?: string, maximumFractionDigits?: number) => string;
  formatDate: (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
}

export const formatCurrencyGlobal = (
  value: number,
  currency?: string,
  maximumFractionDigits = 0
): string => {
  const num = Number(value) || 0;
  const curr = currency || (typeof window !== 'undefined' ? localStorage.getItem('crm-active-currency') : null) || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits
    }).format(num);
  } catch {
    const formattedNum = new Intl.NumberFormat('en-US', {
      maximumFractionDigits
    }).format(num);
    return `${curr} ${formattedNum}`;
  }
};

const SystemProfileContext = createContext<SystemProfileContextType | undefined>(undefined);

export const SystemProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<SystemProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const data = await api.getSystemProfile();
      setProfile(data);
      if (data?.currency) {
        localStorage.setItem('crm-active-currency', data.currency);
      }
      if (data?.timezone) {
        localStorage.setItem('crm-active-timezone', data.timezone);
      }
      if (data?.systemName) {
        localStorage.setItem('crm-active-system-name', data.systemName);
      }
      if (data?.companyName) {
        localStorage.setItem('crm-active-company-name', data.companyName);
      }
    } catch (error) {
      console.error('Failed to load system profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  // Update browser tab title dynamically whenever systemName changes
  useEffect(() => {
    if (profile?.systemName) {
      document.title = profile.systemName;
    }
  }, [profile?.systemName]);

  const activeCurrency = profile?.currency || 'USD';
  const activeTimezone = profile?.timezone || 'UTC';

  const formatCurrency = useCallback(
    (value: number, customCurrency?: string, maximumFractionDigits = 0): string => {
      const curr = customCurrency || activeCurrency;
      return formatCurrencyGlobal(value, curr, maximumFractionDigits);
    },
    [activeCurrency]
  );

  const formatDate = useCallback(
    (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
      if (!date) return '—';
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '—';

        const defaultOpts: Intl.DateTimeFormatOptions = options || {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        };

        if (activeTimezone && activeTimezone !== 'UTC') {
          try {
            return new Intl.DateTimeFormat('en-US', { ...defaultOpts, timeZone: activeTimezone }).format(d);
          } catch {
            return new Intl.DateTimeFormat('en-US', defaultOpts).format(d);
          }
        }
        return new Intl.DateTimeFormat('en-US', defaultOpts).format(d);
      } catch {
        return String(date);
      }
    },
    [activeTimezone]
  );

  return (
    <SystemProfileContext.Provider
      value={{
        profile,
        currency: activeCurrency,
        timezone: activeTimezone,
        refreshProfile,
        isLoading,
        formatCurrency,
        formatDate
      }}
    >
      {children}
    </SystemProfileContext.Provider>
  );
};

export const useSystemProfile = () => {
  const context = useContext(SystemProfileContext);
  if (!context) {
    throw new Error('useSystemProfile must be used within a SystemProfileProvider');
  }
  return context;
};

export const useFormatCurrency = () => {
  const { formatCurrency, currency } = useSystemProfile();
  return { formatCurrency, currency };
};
