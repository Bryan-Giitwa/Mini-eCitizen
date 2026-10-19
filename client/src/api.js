const TOKEN_KEY = 'psrs_token';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://hudumahubapi.jmatecsystems.com')
  .replace(/\/+$/, '');

export function apiUrl(path) {
  return new URL(path, `${API_BASE_URL}/`).toString();
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/**
 * Thin fetch wrapper: adds the auth header, handles JSON or FormData bodies,
 * and throws an Error carrying the server's message on any non-2xx response.
 */
export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(apiUrl(`/api${path}`), {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}
