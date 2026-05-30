const API_URL = 'http://localhost:5000/api';

class DatabaseService {
  constructor() {
    this._token = null;
  }

  init() {
    this._token = localStorage.getItem('bq_token');
  }

  _getHeaders() {
    const token = localStorage.getItem('bq_token');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Normalize a raw Score document from the API into the shape the frontend expects
  _normalizeAttempt(raw) {
    const score = parseInt(raw.score) || 0;
    const totalQuestions = parseInt(raw.totalQuestions) || 1;
    const percentage = Math.round((score / totalQuestions) * 100);

    return {
      id: raw._id || raw.id,
      quizId: raw.quiz || raw.quizId || '',  // quiz ObjectId or code
      quizTitle: raw.quizTitle || 'Untitled Quiz',
      genre: raw.genre || 'Other',
      score,
      totalQuestions,
      percentage,
      username: raw.username || '',
      timestamp: raw.createdAt || raw.timestamp || new Date().toISOString(),
    };
  }

  // Fetch all players sorted by overall stats
  async getGlobalLeaderboard() {
    try {
      const response = await fetch(`${API_URL}/leaderboard`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch global leaderboard');
      }
      return await response.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  // Get a single quiz room details and questions by code or ID
  async getQuiz(code) {
    try {
      const response = await fetch(`${API_URL}/quizzes/${code}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to find quiz room');
      }
      return await response.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  // Fetch all quizzes (for lecturer dashboard statistics)
  async getAllQuizzes() {
    try {
      const response = await fetch(`${API_URL}/quizzes`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch quizzes list');
      }
      return await response.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  // Save new quiz created by user in Quiz Studio
  async saveQuiz(quizData, currentUser) {
    try {
      const response = await fetch(`${API_URL}/quizzes`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(quizData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create quiz');
      }

      const result = await response.json();
      return result.id; // Returns the code as the quizId/room code
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  // Save quiz completion score attempt
  async saveAttempt(quizId, quizTitle, genre, score, totalQuestions, user) {
    try {
      const response = await fetch(`${API_URL}/scores`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify({
          quizId,
          quizTitle,
          genre,
          score,
          totalQuestions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit score');
      }

      // Proactively sync user profile details in localStorage
      const savedUser = localStorage.getItem('bq_current_user');
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser);
          userObj.totalQuizzesTaken = (userObj.totalQuizzesTaken || 0) + 1;
          userObj.totalScore = (userObj.totalScore || 0) + Number(score);
          localStorage.setItem('bq_current_user', JSON.stringify(userObj));
        } catch (e) {
          console.error('Failed to sync score in localStorage:', e);
        }
      }

      return await response.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  // Real-time listener using 3s polling for active quiz rooms
  listenToQuizLeaderboard(quizCode, callback) {
    let intervalId;

    const runPoll = async () => {
      try {
        const response = await fetch(`${API_URL}/leaderboard/${quizCode}`);
        if (response.ok) {
          const data = await response.json();
          // Normalize each attempt entry
          const normalized = data.map(entry => this._normalizeAttempt(entry));
          callback(normalized);
        }
      } catch (err) {
        console.error('Leaderboard poll error:', err);
      }
    };

    runPoll();
    intervalId = setInterval(runPoll, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }

  // Retrieve past attempts for active profile dashboard and history analytics
  async getUserAttempts(userId) {
    try {
      const response = await fetch(`${API_URL}/scores/user/${userId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch user history');
      }
      const data = await response.json();
      // Normalize all attempt documents
      return data.map(entry => this._normalizeAttempt(entry));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

export const dbService = new DatabaseService();
