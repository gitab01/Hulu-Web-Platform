// Base URL: production points at the Render API via VITE_API_BASE; local dev uses
// the Vite /api proxy so there are no CORS surprises.
const BASE = import.meta.env.VITE_API_BASE || '/api';

let accessToken = null;

const store = {
  get refresh() {
    return localStorage.getItem('refreshToken');
  },
  set refresh(v) {
    if (v) localStorage.setItem('refreshToken', v);
    else localStorage.removeItem('refreshToken');
  },
};

export function setAccessToken(token) {
  accessToken = token;
}
export function clearSession() {
  accessToken = null;
  store.refresh = null;
}
export function hasSession() {
  return Boolean(store.refresh);
}

async function raw(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

async function tryRefresh() {
  if (!store.refresh) return false;
  try {
    const data = await raw('/auth/refresh', { method: 'POST', body: { refreshToken: store.refresh }, auth: false });
    accessToken = data.accessToken;
    store.refresh = data.refreshToken;
    return true;
  } catch (err) {
    // A rate limit, server fault or dropped connection leaves the token valid — keep it
    // and retry on the next call. Only the API rejecting the token ends the session.
    const rejected = err.status && err.status < 500 && err.status !== 429;
    if (rejected) clearSession();
    return false;
  }
}

/**
 * One normalized auth handler: a 401 from an expired/invalid access token triggers
 * exactly one silent refresh + retry. If that still fails, the session is cleared
 * and the caller's route guard redirects to sign-in.
 */
export async function api(path, opts = {}) {
  try {
    return await raw(path, opts);
  } catch (err) {
    const authFailed = err.status === 401 && (err.code === 'token_expired' || err.code === 'invalid_token');
    if (authFailed && !opts._retried) {
      const ok = await tryRefresh();
      if (ok) return raw(path, { ...opts, _retried: true });
    }
    throw err;
  }
}

export const auth = {
  async register(payload) {
    const data = await raw('/auth/register', { method: 'POST', body: payload, auth: false });
    accessToken = data.accessToken;
    store.refresh = data.refreshToken;
    return data;
  },
  async login(payload) {
    const data = await raw('/auth/login', { method: 'POST', body: payload, auth: false });
    accessToken = data.accessToken;
    store.refresh = data.refreshToken;
    return data;
  },
  async me() {
    return api('/auth/me');
  },
  async logout() {
    try {
      await raw('/auth/logout', { method: 'POST', body: { refreshToken: store.refresh } });
    } finally {
      clearSession();
    }
  },
  async bootstrap() {
    return tryRefresh();
  },
};

export const catalog = {
  rows: () => api('/catalog/rows'),
  title: (slug) => api(`/catalog/titles/${slug}`),
  byId: (id) => api(`/catalog/titles/id/${id}`),
  search: (q) => api(`/catalog/search?q=${encodeURIComponent(q)}`),
  channels: ({ category, kind, country, q, limit } = {}) => {
    const p = new URLSearchParams();
    if (category && category !== 'All') p.set('category', category);
    if (kind) p.set('kind', kind);
    if (country) p.set('country', country);
    if (q) p.set('q', q);
    if (limit) p.set('limit', String(limit));
    const qs = p.toString();
    return api(`/catalog/channels${qs ? `?${qs}` : ''}`);
  },
  channel: (slug) => api(`/catalog/channels/${slug}`),
  channelsLive: (slugs) => api(`/catalog/channels/live?slugs=${(slugs || []).map(encodeURIComponent).join(',')}`),
};

export const player = {
  playback: (titleId, episodeId) => api('/player/playback', { method: 'POST', body: { titleId, episodeId } }),
  progress: (payload) => api('/player/progress', { method: 'POST', body: payload }),
};

export const billing = {
  plans: () => api('/billing/plans', { auth: false }),
  status: () => api('/billing/status'),
  checkout: (plan) => api('/billing/checkout', { method: 'POST', body: { plan } }),
  mockConfirm: (plan) => api('/billing/mock/confirm', { method: 'POST', body: { plan } }),
};

export { BASE };
