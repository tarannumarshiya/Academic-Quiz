// auth.js — JWT-based AuthService
// Talks to the Express backend at /api/auth/*.

import { apiFetch, Token } from './api.js';

class AuthService {
  constructor() {
    this._user          = Token.loadUser();   // synchronous cache from localStorage
    this._authCallbacks = [];
    this._initPromise   = null;
  }

  init() {
    // Kick off session restore the first time init() is called
    if (!this._initPromise) {
      this._initPromise = this._restoreSession();
    }
  }

  // ── Restore session on page load ──────────────────────────────────────────────
  async _restoreSession() {
    if (!Token.getAccess() && !Token.getRefresh()) {
      this._notify(null);
      return null;
    }
    try {
      const user = await apiFetch('/auth/me');
      this._notify(this._toUser(user));
      return user;
    } catch {
      this._notify(null);
      return null;
    }
  }

  // ── Register ──────────────────────────────────────────────────────────────────
  async register(email, password, username) {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    Token.setTokens(data.accessToken, data.refreshToken);
    const user = this._toUser(data);
    this._notify(user);
    return user;
  }

  // ── Login ─────────────────────────────────────────────────────────────────────
  async login(email, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    Token.setTokens(data.accessToken, data.refreshToken);
    const user = this._toUser(data);
    this._notify(user);
    return user;
  }

  // ── Google login (not supported without Firebase) ─────────────────────────────
  async loginWithGoogle() {
    throw new Error('Google Sign-In is not available. Please use email and password.');
  }

  // ── Logout ────────────────────────────────────────────────────────────────────
  async logout() {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch { /* best-effort */ }
    this._notify(null);
  }

  // ── Auth-state observer (mirrors Firebase onAuthStateChanged API) ──────────────
  onAuthStateChanged(callback) {
    this._authCallbacks.push(callback);

    // Bootstrap session once
    if (!this._initPromise) {
      this._initPromise = this._restoreSession();
    }

    // Fire immediately with any cached user
    if (this._user !== undefined) {
      setTimeout(() => callback(this._user), 0);
    }

    return () => {
      this._authCallbacks = this._authCallbacks.filter(cb => cb !== callback);
    };
  }

  // ── Fetch fresh profile from backend ─────────────────────────────────────────
  async getUserProfile() {
    try {
      const data = await apiFetch('/auth/me');
      const user = this._toUser(data);
      this._notify(user);
      return data;   // raw server response (has totalScore, totalQuizzesTaken, etc.)
    } catch {
      return null;
    }
  }

  // ── Update profile stats — handled server-side on score save; no-op here ─────
  async updateUserProfile() {}

  getCurrentUser() {
    return this._user || null;
  }

  // ── Internal: broadcast state to all listeners ────────────────────────────────
  _notify(user) {
    this._user = user;
    if (user) Token.saveUser(user); else Token.clearAll();
    this._authCallbacks.forEach(cb => cb(user));
  }

  // ── Shape the API response into the session user object the SPA expects ───────
  _toUser(data) {
    return {
      uid:               data._id,
      _id:               data._id,
      displayName:       data.username,
      username:          data.username,
      email:             data.email,
      totalQuizzesTaken: data.totalQuizzesTaken ?? 0,
      totalScore:        data.totalScore        ?? 0,
    };
  }
}

// Force sign-out when refresh token expires (fired by apiFetch)
window.addEventListener('auth:signedOut', () => authService._notify(null));

export const authService = new AuthService();