import React, { createContext, useContext, useState, useEffect } from 'react';
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
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
}

const SystemProfileContext = createContext<SystemProfileContextType | undefined>(undefined);

export const SystemProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<SystemProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const data = await api.getSystemProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load system profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <SystemProfileContext.Provider value={{ profile, refreshProfile, isLoading }}>
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
