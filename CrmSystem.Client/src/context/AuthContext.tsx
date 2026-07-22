import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  userId: number;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'SalesRep';
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAdmin: boolean;
  isManagerOrAbove: boolean;
  userRole: 'Admin' | 'Manager' | 'SalesRep';
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwt(token: string): any {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= exp;
  } catch {
    return true;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  const hydrateUser = useCallback((t: string) => {
    const payload = parseJwt(t);
    if (!payload) return;
    setUser({
      userId: Number(payload['sub'] ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? 0),
      name: payload['name'] ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? 'User',
      email: payload['email'] ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ?? '',
      role: payload['role'] ?? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? 'SalesRep',
    });
  }, []);

  useEffect(() => {
    if (token) {
      // Check if token is expired
      if (isTokenExpired(token)) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } else {
        hydrateUser(token);
      }
    } else {
      setUser(null);
    }
  }, [token, hydrateUser]);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    hydrateUser(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAdmin: user?.role === 'Admin',
      isManagerOrAbove: user?.role === 'Admin' || user?.role === 'Manager',
      userRole: user?.role ?? 'SalesRep',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
