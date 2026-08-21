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

const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) ?? '';

// ── 1. URL BUILDER ────────────────────────────────────────────────────────────
function buildUrl(path: string) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/uploads')) return path;
  if (API_BASE) {
    return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

// ── 2. JWT TOKEN RETRIEVER ────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') ?? '';
}

function authHeaders(extra?: Record<string, string>): HeadersInit {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...extra };
}

// ── 3. CORE REQUEST INTERCEPTOR ───────────────────────────────────────────────
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
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

  const res = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  // Step A: Handle session expiry (401 Unauthorized)
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized - session expired. Please sign in again.');
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
};

// ── 5. MEDIA & DOCUMENT URL RESOLVER ──────────────────────────────────────────
export function resolveUrl(path: string) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/uploads')) return path;
  return buildUrl(path);
}
