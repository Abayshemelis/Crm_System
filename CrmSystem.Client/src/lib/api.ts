// ==============================================================================
// CRM SYSTEM HTTP API CLIENT (api.ts)
// ==============================================================================
// Centralized HTTP client wrapper built on top of the browser fetch API:
// 1. Automatic Authorization: Attaches `Bearer <token>` to all authenticated requests
// 2. Error Normalization: Parses ASP.NET Core ProblemDetails and Model Validation dictionaries
// 3. Security & 401 Interception: Automatically clears expired credentials on unauthorized access
// 4. File Upload Support: Seamlessly handles multipart FormData (contracts, avatars, documents)
// 5. Proxy & Base URL Resolution: Works seamlessly across Vite dev proxy, localhost, and production
// ==============================================================================

const DEBUG_API = ((import.meta as any).env?.VITE_API_DEBUG as string) === 'true';

const envApiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;

function getApiBase(): string {
  if (envApiBase !== undefined && envApiBase !== '') {
    return envApiBase;
  }
  if (typeof window !== 'undefined') {
    // If accessing via ngrok tunnel or HTTPS, use relative paths so proxy handles it
    if (window.location.hostname.includes('ngrok') || window.location.protocol === 'https:') {
      return '';
    }
    // If on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5073';
    }
    // If accessing over local Wi-Fi IP (e.g. 10.x.x.x or 192.168.x.x)
    return `http://${window.location.hostname}:5073`;
  }
  return 'http://localhost:5073';
}

export const API_BASE = getApiBase();

if (DEBUG_API) {
  console.log('[API] Base URL:', API_BASE);
}

// ── 1. URL BUILDER ────────────────────────────────────────────────────────────
export function buildUrl(path: string) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/uploads')) {
    return API_BASE ? `${API_BASE.replace(/\/+$/, '')}${path}` : path;
  }
  if (API_BASE) {
    const base = API_BASE.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

// ── 2. JWT TOKEN RETRIEVER ────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') ?? '';
}

function authHeaders(extra?: Record<string, string>): HeadersInit {
  const selectedRole = typeof localStorage !== 'undefined' ? localStorage.getItem('selectedRole') : null;
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
    ...(selectedRole ? { 'X-Selected-Role': selectedRole } : {}),
    ...extra
  };
}

// ── 3. CORE REQUEST INTERCEPTOR ───────────────────────────────────────────────
let offlineCallback: (() => void) | null = null;
export const setOfflineHandler = (cb: () => void) => {
  offlineCallback = cb;
};

let refreshPromise: Promise<string | null> | null = null;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const selectedRole = typeof localStorage !== 'undefined' ? localStorage.getItem('selectedRole') : null;
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };

  // Only set Content-Type for JSON payloads; browsers set multipart boundary automatically for FormData
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Bypass ngrok browser warning screen when tunneling local API
  headers['ngrok-skip-browser-warning'] = '69420';

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (selectedRole) {
    headers['X-Selected-Role'] = selectedRole;
  }

  if (DEBUG_API) {
    console.log('[API] Request:', { method: options?.method ?? 'GET', url: buildUrl(path), headers, body: options?.body });
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      ...options,
      headers,
    });
  } catch (err: any) {
    if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed'))) {
      console.warn(`[API] Network failure or tunnel unreachable for ${path}:`, err.message);
      if (offlineCallback) {
        offlineCallback();
      }
    }
    throw err;
  }

  if (DEBUG_API) {
    console.log('[API] Response:', { status: res.status, url: res.url });
  }

  // Step A: Handle session expiry (401 Unauthorized)
  if (res.status === 401) {
    const storedRefresh = localStorage.getItem('refreshToken');
    if (storedRefresh) {
      if (!refreshPromise) {
        refreshPromise = fetch(buildUrl('/api/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' },
          body: JSON.stringify({ refreshToken: storedRefresh })
        }).then(async (refreshRes) => {
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('token', data.accessToken);
            if (data.refreshToken) {
              localStorage.setItem('refreshToken', data.refreshToken);
            }
            window.dispatchEvent(new Event('auth:token-refreshed'));
            return data.accessToken;
          }
          return null;
        }).catch((err) => {
          console.error('[API] Silent refresh failed:', err);
          return null;
        }).finally(() => {
          refreshPromise = null;
        });
      }
      
      const newToken = await refreshPromise;
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(buildUrl(path), { ...options, headers });
        
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          throw new Error('Unauthorized - session expired. Please sign in again.');
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new Error('Unauthorized - session expired. Please sign in again.');
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      throw new Error('Unauthorized - session expired. Please sign in again.');
    }
  }

  // Step B: Handle server errors and parse ASP.NET Validation/ProblemDetails
  if (!res.ok) {
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      // Case 1: ASP.NET ModelState validation errors { errors: { Field: ["Error description"] } }
      if (json.errors && typeof json.errors === 'object') {
        const msgs = Object.values(json.errors).flat() as string[];
        message = msgs.join(' ');
      // Case 2: RFC 7807 ProblemDetails { detail: "..." } or { title: "..." }
      } else if (json.detail) {
        message = json.detail;
      } else if (json.title) {
        message = json.title;
      } else if (json.message) {
        message = json.message;
      }
    } catch {
      if (text) message = text;
    }

    throw new Error(message);
  }

  // HTTP 204 No Content response
  if (res.status === 204) return undefined as T;

  // HTTP 200/201 JSON payload
  return res.json() as Promise<T>;
}

// ── 4. CONVENIENCE API OBJECT ─────────────────────────────────────────────────
export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'GET', headers: authHeaders(), cache: 'no-store', ...options }),

  post: <T>(path: string, body: unknown, options?: RequestInit) =>
    body instanceof FormData
      ? request<T>(path, { method: 'POST', body, ...options })
      : request<T>(path, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body), ...options }),

  put: <T>(path: string, body: unknown, options?: RequestInit) =>
    body instanceof FormData
      ? request<T>(path, { method: 'PUT', body, ...options })
      : request<T>(path, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body), ...options }),

  patch: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body), ...options }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'DELETE', headers: authHeaders(), ...options }),

  upload: <T>(path: string, form: FormData, options?: RequestInit) =>
    request<T>(path, { method: 'POST', body: form, ...options }),

  // ==========================================
  // SYSTEM PROFILE ENDPOINTS
  // ==========================================
  getSystemProfile: () => request<any>('/api/systemprofiles', { method: 'GET' }),
  updateSystemProfile: (payload: any) => request<any>('/api/systemprofiles', { method: 'PUT', body: JSON.stringify(payload) }),
  uploadSystemLogo: async (file: File) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/systemprofiles/upload-logo', {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || 'Upload failed');
    }
    return res.json();
  },
};
// ── 5. MEDIA & DOCUMENT URL RESOLVER ──────────────────────────────────────────
export function resolveUrl(path: string) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/uploads')) return path;
  return buildUrl(path);
}
