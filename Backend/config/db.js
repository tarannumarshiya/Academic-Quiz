// database.js — Quiz & Score data service
// Replaces the old Firebase Realtime Database calls with Express REST API calls.

import { apiFetch } from './api.js';

class DatabaseService {
  init() {
    // No setup needed for REST — apiFetch handles auth headers automatically.
  }

  // ── Create a quiz and its questions ─────────────────────────────────────────
  // Returns the quiz code (string) so the UI can display it.
  async saveQuiz(quizData, user) {
    const quiz = await apiFetch('/quiz', {
      method: 'POST',
      body: JSON.stringify({
        title:       quizData.title,
        description: quizData.description || '',
        genre:       quizData.genre,
        timeLimit:   parseInt(quizData.timeLimit) || 30,
        questions:   quizData.questions,  // [{ questionText, options, correctOption }]
      }),
    });
    // Return the quiz code so the SPA can display it / redirect to leaderboard
    return quiz.code;
  }

  // ── Fetch quiz + its questions by room code ──────────────────────────────────
  async getQuiz(code) {
    const quiz = await apiFetch(`/quiz/code/${encodeURIComponent(code.toUpperCase())}`);
    // Normalise: expose quiz.id for legacy template code that reads quiz.id
    quiz.id = quiz.code;
    return quiz;
  }

  // ── Fetch all quizzes created by the current user ────────────────────────────
  async getMyQuizzes() {
    return apiFetch('/quiz/my');
  }

  // ── Delete a quiz (creator only) ─────────────────────────────────────────────
  async deleteQuiz(quizId) {
    return apiFetch(`/quiz/${quizId}`, { method: 'DELETE' });
  }

  // ── Save a quiz attempt (score calculated server-side) ───────────────────────
  // quizId    : MongoDB _id of the quiz
  // selections: array of selected option indices per question (-1 = skipped / timed out)
  async saveAttempt(quizId, _quizTitle, _genre, _score, _total, _user, selections = [], timeTaken = 0) {
    return apiFetch('/leaderboard/scores', {
      method: 'POST',
      body: JSON.stringify({ quizId, selections, timeTaken }),
    });
  }

  // ── Fetch the current user's score history ───────────────────────────────────
  async getUserAttempts() {
    const scores = await apiFetch('/leaderboard/my');
    // Normalise field names to match what the profile template expects
    return scores.map(s => ({
      ...s,
      id:        s._id,
      quizId:    s.quizCode,
      timestamp: new Date(s.createdAt).getTime(),
    }));
  }

  // ── Quiz-specific leaderboard (top score per player) ─────────────────────────
  // Returns an array; call the callback once (no real-time push — use polling if needed).
  listenToQuizLeaderboard(quizCode, callback) {
    apiFetch(`/leaderboard/quiz/${encodeURIComponent(quizCode.toUpperCase())}`)
      .then(entries => {
        const normalised = entries.map((e, i) => ({
          ...e,
          rank:      i + 1,
          username:  e.username,
          percentage: e.percentage,
          timestamp: new Date(e.createdAt).getTime(),
        }));
        callback(normalised);
      })
      .catch(err => {
        console.error('Quiz leaderboard fetch failed:', err);
        callback([]);
      });

    // Return a no-op unsubscribe function (REST has no persistent socket)
    return () => {};
  }

  // ── Global leaderboard (top users by total score) ────────────────────────────
  async getGlobalLeaderboard() {
    return apiFetch('/leaderboard/global');
  }
}

export const dbService = new DatabaseService();