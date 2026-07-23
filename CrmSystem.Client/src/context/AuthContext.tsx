import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  userId: number;
  name: string;
  email: string;
  roles: Array<'Admin' | 'Manager' | 'SalesRep'>;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  // accept either a raw token string or an object returned from the server
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
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Manager' | 'SalesRep'>('SalesRep');

  const hydrateUser = useCallback((t: string, explicitRoles?: string[]) => {
    const payload = parseJwt(t);
    if (!payload && !explicitRoles) return;

    // prefer explicit roles from server response when provided
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

    // Set initial selected role to highest available role
    const finalRoles = roles.length > 0 ? Array.from(new Set(roles)) : ['SalesRep'];
    if (finalRoles.includes('Admin')) {
      setSelectedRole('Admin');
    } else if (finalRoles.includes('Manager')) {
      setSelectedRole('Manager');
    } else {
      setSelectedRole('SalesRep');
    }
  }, []);

  useEffect(() => {
    if (token) {
      // Check if token is expired
      if (isTokenExpired(token)) {
        // attempt to refresh using refresh token
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
      // store refresh token when provided
      if (tokenOrResponse.refreshToken) {
        localStorage.setItem('refreshToken', tokenOrResponse.refreshToken);
      }
      // hydrate using explicit roles when available; pass token if present
      hydrateUser(newToken ?? '', tokenOrResponse.roles ?? []);
    }
  };

  const refresh = async (): Promise<boolean> => {
    const storedRefresh = localStorage.getItem('refreshToken');
    if (!storedRefresh) return false;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });
      if (!res.ok) {
        // clear tokens on failed refresh
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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  };

  const primaryRole = user?.roles.includes('Admin')
    ? 'Admin'
    : user?.roles.includes('Manager')
      ? 'Manager'
      : 'SalesRep';

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
