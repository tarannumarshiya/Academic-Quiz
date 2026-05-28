const API_URL = 'http://localhost:5000/api';

class AuthService {
  constructor() {
    this._authStateCallbacks = [];
    this._currentUser = null;
  }

  init() {
    // Restore session from localStorage on init
    const saved = localStorage.getItem('bq_current_user');
    if (saved) {
      try {
        this._currentUser = JSON.parse(saved);
      } catch {
        this._currentUser = null;
      }
    }
  }

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
  }

  _notifyAuthStateChange(user) {
    this._authStateCallbacks.forEach(cb => cb(user));
  }
}

export const authService = new AuthService();