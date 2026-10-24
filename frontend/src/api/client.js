const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'ems_token';

/* ---------- token storage ----------
 * "Keep me logged in" stores the token in localStorage (survives browser restarts);
 * otherwise sessionStorage (cleared when the tab closes). */
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token, remember) {
    try {
      this.clear();
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  /** { field: message } map for showing errors under inputs */
  get fieldErrors() {
    return (this.errors || []).reduce((acc, e) => ({ ...acc, [e.field]: e.message }), {});
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/**
 * fetch wrapper: adds the bearer token, serialises JSON (FormData is sent as-is),
 * and throws ApiError for non-2xx responses.
 */
export async function request(path, { method = 'GET', body, params, headers = {}, auth = true } = {}) {
  let url = `${BASE_URL}/api${path}`;
  if (params) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    if ([...qs].length) url += `?${qs}`;
  }

  const finalHeaders = { Accept: 'application/json', ...headers };
  const token = auth ? tokenStore.get() : null;
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, { method, headers: finalHeaders, body: payload });
  } catch {
    throw new ApiError('Cannot reach the server. Make sure the API is running.', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(data.message || `Request failed (${res.status})`, res.status, data.errors);
  }
  return data;
}

/** Builds FormData from a plain object, skipping undefined/null values. */
export function toFormData(values) {
  const fd = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    fd.append(key, typeof value === 'boolean' ? String(value) : value);
  });
  return fd;
}
