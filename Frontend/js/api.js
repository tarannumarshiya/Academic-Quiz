// api.js — Low-level HTTP fetch wrapper with JWT auto-refresh
// All other JS modules import apiFetch() from here instead of using fetch() directly.

const API_BASE = 'http://localhost:5000/api';

// ─── Token storage helpers ────────────────────────────────────────────────────
export const Token = {
  getAccess:  ()     => localStorage.getItem('aq_access_token'),
  getRefresh: ()     => localStorage.getItem('aq_refresh_token'),
  setAccess:  (t)    => localStorage.setItem('aq_access_token', t),
  setRefresh: (t)    => localStorage.setItem('aq_refresh_token', t),
  setTokens:  (a, r) => { Token.setAccess(a); Token.setRefresh(r); },
  clearAll:   ()     => {
    localStorage.removeItem('aq_access_token');
    localStorage.removeItem('aq_refresh_token');
    localStorage.removeItem('aq_current_user');
  },
  saveUser: (u) => localStorage.setItem('aq_current_user', JSON.stringify(u)),
  loadUser: ()  => {
    try { return JSON.parse(localStorage.getItem('aq_current_user')); } catch { return null; }
  },
};

// ─── Internal: silently try to refresh the access token ───────────────────────
async function tryRefresh() {
  const refreshToken = Token.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    Token.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ─── Internal: extract error message from response ────────────────────────────
async function extractError(res) {
  try {
    const body = await res.json();
    return new Error(body.message || body.errors?.[0]?.msg || `HTTP ${res.status}`);
  } catch {
    return new Error(`HTTP ${res.status}`);
  }
}

// ─── Public: fetch wrapper ────────────────────────────────────────────────────
// Automatically attaches the Bearer token and retries once after a token refresh.
export async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const token = Token.getAccess();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Auto-refresh on TOKEN_EXPIRED and retry the original request
  if (res.status === 401) {
    const body = await res.clone().json().catch(() => ({}));
    if (body.code === 'TOKEN_EXPIRED') {
      const refreshed = await tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${Token.getAccess()}`;
        const retryRes = await fetch(`${API_BASE}${path}`, { ...options, headers });
        if (!retryRes.ok) throw await extractError(retryRes);
        return retryRes.json();
      }
    }
    // 401 and refresh failed — force sign-out
    Token.clearAll();
    window.dispatchEvent(new CustomEvent('auth:signedOut'));
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) throw await extractError(res);
  return res.json();
}