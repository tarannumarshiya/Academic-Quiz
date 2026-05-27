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

  // Register a new user
  async register(email, password, username) {
    const users = this._getAllUsers();

    const existing = Object.values(users).find(u => u.email === email);
    if (existing) throw new Error("This email is already registered. Try logging in instead.");

    if (!email.includes('@')) throw new Error("Please enter a valid email address.");
    if (password.length < 6) throw new Error("Your password should be at least 6 characters long.");

    const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    const userRecord = {
      uid,
      username,
      email,
      password, // stored locally; no sensitive backend involved
      displayName: username,
      createdAt: Date.now(),
      totalQuizzesTaken: 0,
      totalScore: 0
    };

    users[uid] = userRecord;
    localStorage.setItem('bq_users', JSON.stringify(users));

    const sessionUser = this._toSessionUser(userRecord);
    this._setCurrentUser(sessionUser);
    return sessionUser;
  }

  // Login existing user
  async login(email, password) {
    const users = this._getAllUsers();
    const userRecord = Object.values(users).find(u => u.email === email);

    if (!userRecord || userRecord.password !== password) {
      throw new Error("Invalid email or password. Please try again.");
    }

    const sessionUser = this._toSessionUser(userRecord);
    this._setCurrentUser(sessionUser);
    return sessionUser;
  }

  // Login with Google — not supported without Firebase; surface a clear message
  async loginWithGoogle() {
    throw new Error("Google Sign-In requires Firebase. Please use email & password to log in.");
  }

  // Logout user
  async logout() {
    this._currentUser = null;
    localStorage.removeItem('bq_current_user');
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

  // Helper to fetch user profile from localStorage
  async getUserProfile(uid) {
    const users = this._getAllUsers();
    return users[uid] || null;
  }

  // Update profile stats (totalScore, totalQuizzesTaken)
  async updateUserProfile(uid, updates) {
    const users = this._getAllUsers();
    if (!users[uid]) return;
    users[uid] = { ...users[uid], ...updates };
    localStorage.setItem('bq_users', JSON.stringify(users));
  }

  // -------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------

  _getAllUsers() {
    try {
      return JSON.parse(localStorage.getItem('bq_users') || '{}');
    } catch {
      return {};
    }
  }

  _toSessionUser(userRecord) {
    return {
      uid: userRecord.uid,
      displayName: userRecord.username || userRecord.displayName,
      email: userRecord.email
    };
  }

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