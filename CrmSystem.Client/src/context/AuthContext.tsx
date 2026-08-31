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
  isLoading: boolean;
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
    if (!payload || !payload.exp) return false;
    const exp = payload.exp * 1000; // Convert seconds to milliseconds
    return Date.now() >= (exp - 10000);
  } catch {
    return false;
  }
}

// ── 4. SYNCHRONOUS USER HYDRATION HELPER ──────────────────────────────────────
function extractUserFromToken(t: string | null, explicitRoles?: string[]): { user: User | null; role: 'Admin' | 'Manager' | 'SalesRep' } {
  if (!t || typeof t !== 'string') return { user: null, role: 'SalesRep' };
  const payload = parseJwt(t);
  if (!payload && !explicitRoles) return { user: null, role: 'SalesRep' };

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
  const cachedAvatar = userId && typeof localStorage !== 'undefined' ? localStorage.getItem(`crm_user_avatar_${userId}`) : null;

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

  const finalRoles = (roles.length > 0 ? Array.from(new Set(roles)) : ['SalesRep']) as Array<'Admin' | 'Manager' | 'SalesRep'>;
  const user: User = {
    userId,
    name,
    email,
    roles: finalRoles,
    profileImage: cachedAvatar || null,
  };

  const userRoleKey = userId ? `crm_role_${userId}` : null;
  const savedRole = userRoleKey && typeof localStorage !== 'undefined'
    ? (localStorage.getItem(userRoleKey) as 'Admin' | 'Manager' | 'SalesRep' | null)
    : null;

  let role: 'Admin' | 'Manager' | 'SalesRep' = 'SalesRep';
  if (savedRole && finalRoles.includes(savedRole)) {
    role = savedRole;
  } else if (finalRoles.includes('Manager')) {
    role = 'Manager';
  } else if (finalRoles.includes('Admin')) {
    role = 'Admin';
  } else {
    role = 'SalesRep';
  }

  return { user, role };
}

// ── 5. AUTH PROVIDER COMPONENT ────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialToken = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const initialAuth = extractUserFromToken(initialToken);

  const [token, setToken] = useState<string | null>(initialToken);
  const [user, setUser] = useState<User | null>(initialAuth.user);
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Manager' | 'SalesRep'>(initialAuth.role);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (initialToken && isTokenExpired(initialToken)) {
      return true;
    }
    return false;
  });

  // Extracts user profile and roles from decoded JWT payload or server response
  const hydrateUser = useCallback((t: string, explicitRoles?: string[]) => {
    const { user: extractedUser, role: extractedRole } = extractUserFromToken(t, explicitRoles);
    if (extractedUser) {
      setUser(extractedUser);
      setSelectedRole(extractedRole);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('selectedRole');
      }
    }
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
        setIsLoading(true);
        (async () => {
          const refreshed = await refresh();
          if (!refreshed) {
            const storedToken = localStorage.getItem('token');
            if (!storedToken) {
              setToken(null);
              setUser(null);
            }
          }
          setIsLoading(false);
        })();
      } else {
        hydrateUser(token);
        syncServerProfile(token);
        setIsLoading(false);
      }
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [token, hydrateUser, syncServerProfile]);

  // Listen for background token refreshes triggered by api.ts interceptor
  useEffect(() => {
    const handleTokenRefreshed = () => {
      const newToken = localStorage.getItem('token');
      if (newToken && newToken !== token) {
        setToken(newToken);
        hydrateUser(newToken);
      }
    };
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed);
    return () => window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
  }, [token, hydrateUser]);

  // ── 6. LOGIN ACTION ─────────────────────────────────────────────────────────
  const login = (tokenOrResponse: string | { accessToken?: string; roles?: string[]; refreshToken?: string }) => {
    if (typeof tokenOrResponse === 'string') {
      const newToken = tokenOrResponse;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      hydrateUser(newToken);
      syncServerProfile(newToken);
      setIsLoading(false);
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
      setIsLoading(false);
    }
  };

  // ── 7. SILENT REFRESH TOKEN ROTATION ────────────────────────────────────────
  // Automatically exchanges stored refresh token for a fresh JWT access token
  const refresh = async (): Promise<boolean> => {
    const storedRefresh = localStorage.getItem('refreshToken');
    if (!storedRefresh) {
      setIsLoading(false);
      return false;
    }

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
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setToken(null);
          setUser(null);
        }
        setIsLoading(false);
        return false;
      }
      const data = await res.json();
      login({ accessToken: data.accessToken, roles: data.roles, refreshToken: data.refreshToken });
      setIsLoading(false);
      return true;
    } catch {
      setIsLoading(false);
      return false;
    }
  };

  // ── 8. LOGOUT ACTION ────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    setIsLoading(false);
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  // ── 9. UPDATE PROFILE IMAGE ─────────────────────────────────────────────────
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
      isLoading,
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
