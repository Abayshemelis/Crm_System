// Runtime-configurable API base. Set `VITE_API_BASE` in your Vite env for development (e.g. http://localhost:5000)
const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) ?? '';

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
  
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  
  console.log(`API Response: ${res.status} ${res.statusText}`);
  
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
  // Prefix with API base when path starts with '/'
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`.replace(/([^:])\/\/+/, '$1/');
}
