<<<<<<< HEAD
// auth.js — JWT-based AuthService
// Talks to the Express backend at /api/auth/*.

import { apiFetch, Token } from './api.js';
=======
const API_URL = 'http://localhost:5000/api';
>>>>>>> 0a0a2b78b0e52424693759705a5d78d547fe1568

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

<<<<<<< HEAD
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
=======
  // Register a new user with the backend
  async register(email, password, username) {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('bq_token', data.token);

      const sessionUser = {
        uid: data.user.id,
        displayName: data.user.username,
        email: data.user.email,
        totalQuizzesTaken: data.user.totalQuizzesTaken,
        totalScore: data.user.totalScore,
      };

      this._setCurrentUser(sessionUser);
      return sessionUser;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  // Login existing user with the backend
  async login(email, password) {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('bq_token', data.token);

      const sessionUser = {
        uid: data.user.id,
        displayName: data.user.username,
        email: data.user.email,
        totalQuizzesTaken: data.user.totalQuizzesTaken,
        totalScore: data.user.totalScore,
      };

      this._setCurrentUser(sessionUser);
      return sessionUser;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  // Login with Google — not supported without Firebase; surface a clear message
  async loginWithGoogle() {
    throw new Error("Google Sign-In requires Firebase. Please use email & password to log in.");
  }

  // Logout user and clear tokens
  async logout() {
    this._currentUser = null;
    localStorage.removeItem('bq_current_user');
    localStorage.removeItem('bq_token');
    this._notifyAuthStateChange(null);
  }

  // Set up auth state change observer
  onAuthStateChanged(callback) {
    this._authStateCallbacks.push(callback);
    // Fire immediately with current state
    setTimeout(() => callback(this._currentUser), 0);
    // Return unsubscribe function
    return () => {
      this._authStateCallbacks = this._authStateCallbacks.filter(cb => cb !== callback);
    };
  }

  // Helper to fetch user profile from the database
  async getUserProfile(uid) {
    try {
      const token = localStorage.getItem('bq_token');
      const res = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch profile');
      }
      const profile = await res.json();
      return {
        uid: profile.id,
        username: profile.username,
        email: profile.email,
        totalQuizzesTaken: profile.totalQuizzesTaken,
        totalScore: profile.totalScore,
      };
    } catch (err) {
      console.error(err);
      return this._currentUser; // fallback to session
    }
  }

  // Update profile stats (deprecated in favor of server score uploads)
  async updateUserProfile(uid, updates) {
    // Profile details are updated natively via /api/scores score submissions
  }

  // -------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------

  _setCurrentUser(user) {
    this._currentUser = user;
    localStorage.setItem('bq_current_user', JSON.stringify(user));
    this._notifyAuthStateChange(user);
>>>>>>> 0a0a2b78b0e52424693759705a5d78d547fe1568
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