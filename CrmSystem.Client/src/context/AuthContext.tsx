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
  profileImage?: string | null;
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
  updateProfileImage: (image: string | null) => Promise<boolean>;
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

    const userId = Number(payload?.['sub'] ?? payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? 0);
    const cachedAvatar = userId ? localStorage.getItem(`crm_user_avatar_${userId}`) : null;

    const email =
      payload?.['email'] ??
      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ??
      payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/emailaddress'] ??
      '';

    const name =
      payload?.['name'] ??
      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ??
      payload?.['unique_name'] ??
      (email ? email.split('@')[0] : 'User');

    setUser({
      userId,
      name,
      email,
      roles: roles.length > 0 ? Array.from(new Set(roles)) : ['SalesRep'],
      profileImage: cachedAvatar || null,
    });

    // Default the active working role — stored per-user so different accounts never share a role preference
    const finalRoles = roles.length > 0 ? Array.from(new Set(roles)) : ['SalesRep'];
    const userRoleKey = userId ? `crm_role_${userId}` : null;
    const savedRole = userRoleKey
      ? (localStorage.getItem(userRoleKey) as 'Admin' | 'Manager' | 'SalesRep' | null)
      : null;

    if (savedRole && finalRoles.includes(savedRole)) {
      // Restore the user's previously chosen role preference
      setSelectedRole(savedRole);
    } else if (finalRoles.includes('Manager')) {
      // Manager takes precedence — a user with Manager role should start as Manager,
      // even if they also have Admin. They can switch to Admin view in the profile.
      setSelectedRole('Manager');
      if (userRoleKey) localStorage.setItem(userRoleKey, 'Manager');
    } else if (finalRoles.includes('Admin')) {
      // Pure Admin-only accounts (no Manager role)
      setSelectedRole('Admin');
      if (userRoleKey) localStorage.setItem(userRoleKey, 'Admin');
    } else {
      setSelectedRole('SalesRep');
      if (userRoleKey) localStorage.setItem(userRoleKey, 'SalesRep');
    }
    // Clean up the old shared global key so it no longer contaminates new logins
    localStorage.removeItem('selectedRole');
  }, []);

  // Sync profile data from server
  const syncServerProfile = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(buildUrl('/api/users/me'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.userId) {
          if (data.profileImage) {
            localStorage.setItem(`crm_user_avatar_${data.userId}`, data.profileImage);
          }
          setUser(prev => prev ? {
            ...prev,
            name: data.name || prev.name,
            email: data.email || prev.email,
            profileImage: data.profileImage || prev.profileImage,
          } : null);
        }
      }
    } catch {
      // Ignore network errors on background sync
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
        syncServerProfile(token);
      }
    } else {
      setUser(null);
    }
  }, [token, hydrateUser, syncServerProfile]);

  // Listen for background token refreshes triggered by api.ts interceptor
  useEffect(() => {
    const handleTokenRefreshed = () => {
      const newToken = localStorage.getItem('token');
      if (newToken && newToken !== token) {
        setToken(newToken);
      }
    };
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed);
    return () => window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
  }, [token]);

  // ── 5. LOGIN ACTION ─────────────────────────────────────────────────────────
  const login = (tokenOrResponse: string | { accessToken?: string; roles?: string[]; refreshToken?: string }) => {
    if (typeof tokenOrResponse === 'string') {
      const newToken = tokenOrResponse;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      hydrateUser(newToken);
      syncServerProfile(newToken);
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
      if (newToken) {
        syncServerProfile(newToken);
      }
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

  // ── 8. UPDATE PROFILE IMAGE ─────────────────────────────────────────────────
  const updateProfileImage = async (imageUrl: string | null): Promise<boolean> => {
    if (user?.userId) {
      if (imageUrl) {
        localStorage.setItem(`crm_user_avatar_${user.userId}`, imageUrl);
      } else {
        localStorage.removeItem(`crm_user_avatar_${user.userId}`);
      }
    }

    setUser(prev => prev ? { ...prev, profileImage: imageUrl } : null);

    if (token) {
      try {
        const res = await fetch(buildUrl('/api/users/me/profile-image'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({ profileImage: imageUrl }),
        });
        return res.ok;
      } catch {
        return true; // Still persisted locally
      }
    }
    return true;
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
      const userRoleKey = user.userId ? `crm_role_${user.userId}` : null;
      if (userRoleKey) localStorage.setItem(userRoleKey, role);
      // Dispatch custom event to notify all components to refetch with new role
      window.dispatchEvent(new CustomEvent('app:role-switched', { detail: { role } }));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      refresh,
      updateProfileImage,
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
