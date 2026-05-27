import Score from '../models/Score.js';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import User from '../models/User.js';

// ─── @POST /api/leaderboard/scores  (protected) ───────────────────────────────
// Score is always calculated server-side from stored questions — never trust the client.
export const saveScore = async (req, res) => {
  try {
    const { quizId, selections, timeTaken } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const questions = await Question.find({ quiz: quiz._id }).sort({ order: 1 });
    if (questions.length === 0)
      return res.status(400).json({ message: 'This quiz has no questions' });

    let score = 0;
    selections.forEach((sel, i) => {
      if (questions[i] && sel === questions[i].correctOption) score++;
    });

    const percentage = Math.round((score / questions.length) * 100);

    const savedScore = await Score.create({
      quiz:           quiz._id,
      quizTitle:      quiz.title,
      quizCode:       quiz.code,
      genre:          quiz.genre,
      user:           req.user._id,
      username:       req.user.username,
      score,
      totalQuestions: questions.length,
      percentage,
      selections,
      timeTaken:      timeTaken || 0,
    });

    // Atomically increment user aggregate stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalQuizzesTaken: 1, totalScore: score },
    });

    res.status(201).json(savedScore);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── @GET /api/leaderboard/my  (protected) ────────────────────────────────────
export const getMyScores = async (req, res) => {
  try {
    const scores = await Score.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(scores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── @GET /api/leaderboard/quiz/:quizCode  (protected) ────────────────────────
// Returns best score per user for the given quiz, sorted by % then earliest time.
export const getQuizLeaderboard = async (req, res) => {
  try {
    const scores = await Score.find({
      quizCode: req.params.quizCode.toUpperCase(),
    })
      .sort({ percentage: -1, createdAt: 1 })
      .limit(100)
      .select('username score totalQuestions percentage timeTaken createdAt');

    // Keep only each player's best attempt (array is already sorted best-first)
    const seen = new Set();
    const leaderboard = [];
    for (const s of scores) {
      if (!seen.has(s.username)) {
        seen.add(s.username);
        leaderboard.push(s);
        if (leaderboard.length === 20) break;
      }
    }

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── @GET /api/leaderboard/global  (protected) ────────────────────────────────
export const getGlobalLeaderboard = async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ totalScore: -1, totalQuizzesTaken: -1 })
      .limit(20)
      .select('username totalScore totalQuizzesTaken');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};