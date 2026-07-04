const API_BASE = '';

function getToken() {
  return localStorage.getItem('token') ?? '';
}

function authHeaders(extra?: Record<string, string>): HeadersInit {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...extra };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: options?.headers ?? authHeaders(),
  });
  if (!res.ok) {
    const err = await res.text();
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
