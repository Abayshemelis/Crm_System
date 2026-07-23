// Runtime-configurable API base. In Vite dev, prefer the same-origin proxy so requests
// work without requiring a separate backend host. An explicit VITE_API_BASE override still wins.
const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) ?? '';

function buildUrl(path: string) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/uploads')) return path;
  if (API_BASE) {
    return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

function getToken() {
  return localStorage.getItem('token') ?? '';
}

function authHeaders(extra?: Record<string, string>): HeadersInit {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...extra };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };

  // Only set Content-Type for JSON requests (not FormData)
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`API Request: ${API_BASE}${path}`, { token: token ? 'present' : 'missing', headers });

  const res = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  console.log(`API Response: ${res.status} ${res.statusText}`);

  if (res.status === 401) {
    // Clear invalid token and redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized - token cleared');
  }

  if (!res.ok) {
    const err = await res.text();
    console.error(`API Error: ${err}`);
    throw new Error(err || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET', headers: authHeaders() }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE', headers: authHeaders() }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form }),
};

export function resolveUrl(path: string) {
  if (!path) return path;
  // If already absolute, return as-is
  if (/^https?:\/\//i.test(path)) return path;
  // If this is a static upload path, return a relative path so the dev server
  // proxy (or same-origin hosting) serves it. This avoids mixed-content or
  // insecure-download blocking when the frontend is served over HTTPS.
  if (path.startsWith('/uploads')) return path;
  return buildUrl(path);
}
