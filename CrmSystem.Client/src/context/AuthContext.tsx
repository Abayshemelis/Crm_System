// ==============================================================================
// CRM SYSTEM AUTHENTICATION CONTEXT (AuthContext.tsx)
// ==============================================================================
// Provides central authentication state management across the entire React app:
// 1. User Identity & JWT Token persistence (localStorage)
// 2. Client-side JWT decoding (extracts user ID, name, email, and role claims)
// 3. Proactive Token Expiration & Silent Refresh Token rotation
// 4. Role-Based Access Control (RBAC) helpers (isAdmin, isManagerOrAbove)
// 5. Multi-Role view switcher (allows admins to preview the CRM as a SalesRep)
// ==============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { buildUrl } from '../lib/api';

// ── 1. TYPES & INTERFACES ─────────────────────────────────────────────────────
interface User {
  userId: number;
  name: string;
  email: string;
  roles: Array<'Admin' | 'Manager' | 'SalesRep'>;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (tokenOrResponse: string | { accessToken?: string; roles?: string[]; refreshToken?: string }) => void;
  logout: () => void;
  isAdmin: boolean;
  isManagerOrAbove: boolean;
  isAdminSelected: boolean;
  isManagerOrAboveSelected: boolean;
  userRole: 'Admin' | 'Manager' | 'SalesRep';
  selectedRole: 'Admin' | 'Manager' | 'SalesRep';
  switchRole: (role: 'Admin' | 'Manager' | 'SalesRep') => void;
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── 2. LIGHTWEIGHT JWT PARSER ─────────────────────────────────────────────────
// Decodes base64-encoded JWT payload without requiring heavy external libraries.
function parseJwt(token: string): any {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
}

// ── 3. TOKEN EXPIRATION CHECKER ───────────────────────────────────────────────
// Checks if the JWT access token is within 10 seconds of expiry so we can refresh silently.
function isTokenExpired(token: string): boolean {
  try {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    const exp = payload.exp * 1000; // Convert seconds to milliseconds
    return Date.now() >= (exp - 10000);
  } catch {
    return true;
  }
}

// ── 4. AUTH PROVIDER COMPONENT ────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Manager' | 'SalesRep'>('SalesRep');

  // Extracts user profile and roles from decoded JWT payload or server response
  const hydrateUser = useCallback((t: string, explicitRoles?: string[]) => {
    const payload = parseJwt(t);
    if (!payload && !explicitRoles) return;

    const rolesFromServer = explicitRoles ?? [];
    const claimRoles = payload ? (payload['role'] || payload['roles'] || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) : null;
    const roles: Array<'Admin' | 'Manager' | 'SalesRep'> = [];

    if (rolesFromServer && rolesFromServer.length > 0) {
      rolesFromServer.forEach((r) => {
        if (r === 'Admin' || r === 'Manager' || r === 'SalesRep') roles.push(r);
      });
    } else if (Array.isArray(claimRoles)) {
      claimRoles.forEach((role: string) => {
        if (role === 'Admin' || role === 'Manager' || role === 'SalesRep') {
          roles.push(role as any);
        }
      });
    } else if (typeof claimRoles === 'string') {
      claimRoles.split(',').map((r: string) => r.trim()).forEach((role: string) => {
        if (role === 'Admin' || role === 'Manager' || role === 'SalesRep') {
          roles.push(role as any);
        }
      });
    }

    setUser({
      userId: Number(payload?.['sub'] ?? payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? 0),
      name: payload?.['name'] ?? payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? 'User',
      email: payload?.['email'] ?? payload?.['http://schemas.microsoft.com/ws/2005/05/identity/claims/emailaddress'] ?? '',
      roles: roles.length > 0 ? Array.from(new Set(roles)) : ['SalesRep'],
    });

    // Default the active working role to the highest available role
    const finalRoles = roles.length > 0 ? Array.from(new Set(roles)) : ['SalesRep'];
    if (finalRoles.includes('Admin')) {
      setSelectedRole('Admin');
    } else if (finalRoles.includes('Manager')) {
      setSelectedRole('Manager');
    } else {
      setSelectedRole('SalesRep');
    }
  }, []);

  // On initial mount or token change, check expiration and hydrate user
  useEffect(() => {
    if (token) {
      if (isTokenExpired(token)) {
        (async () => {
          const refreshed = await refresh();
          if (!refreshed) {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          }
        })();
      } else {
        hydrateUser(token);
      }
    } else {
      setUser(null);
    }
  }, [token, hydrateUser]);

  // ── 5. LOGIN ACTION ─────────────────────────────────────────────────────────
  const login = (tokenOrResponse: string | { accessToken?: string; roles?: string[]; refreshToken?: string }) => {
    if (typeof tokenOrResponse === 'string') {
      const newToken = tokenOrResponse;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      hydrateUser(newToken);
    } else {
      const newToken = tokenOrResponse.accessToken ?? null;
      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
      }
      if (tokenOrResponse.refreshToken) {
        localStorage.setItem('refreshToken', tokenOrResponse.refreshToken);
      }
      hydrateUser(newToken ?? '', tokenOrResponse.roles ?? []);
    }
  };

  // ── 6. SILENT REFRESH TOKEN ROTATION ────────────────────────────────────────
  // Automatically exchanges stored refresh token for a fresh JWT access token
  const refresh = async (): Promise<boolean> => {
    const storedRefresh = localStorage.getItem('refreshToken');
    if (!storedRefresh) return false;

    try {
      const res = await fetch(buildUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });
      if (!res.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setToken(null);
        setUser(null);
        return false;
      }
      const data = await res.json();
      login({ accessToken: data.accessToken, roles: data.roles, refreshToken: data.refreshToken });
      return true;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setToken(null);
      setUser(null);
      return false;
    }
  };

  // ── 7. LOGOUT ACTION ────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  const primaryRole = user?.roles.includes('Admin')
    ? 'Admin'
    : user?.roles.includes('Manager')
      ? 'Manager'
      : 'SalesRep';

  // Role simulation switcher (lets Admins test views as Sales Reps)
  const switchRole = (role: 'Admin' | 'Manager' | 'SalesRep') => {
    if (user?.roles.includes(role)) {
      setSelectedRole(role);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      refresh,
      isAdmin: user?.roles.includes('Admin') ?? false,
      isManagerOrAbove: (user?.roles.includes('Admin') || user?.roles.includes('Manager')) ?? false,
      isAdminSelected: selectedRole === 'Admin',
      isManagerOrAboveSelected: selectedRole === 'Admin' || selectedRole === 'Manager',
      userRole: primaryRole ?? 'SalesRep',
      selectedRole,
      switchRole,
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
