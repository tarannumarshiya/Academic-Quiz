const Score = require('../models/Score');
const User = require('../models/User');
const Quiz = require('../models/Quiz');

// @desc    Submit score attempt
// @route   POST /api/scores
// @access  Private
const submitScore = async (req, res, next) => {
  const { quizId, quizTitle, genre, score, totalQuestions } = req.body;

  try {
    if (score === undefined || !quizId || !quizTitle || !genre || !totalQuestions) {
      res.status(400);
      throw new Error('Please enter all score attempt details');
    }

    // Find quiz by room code (which is stored in quizId) or by mongoose _id
    let quiz = await Quiz.findOne({ code: quizId.toUpperCase() });
    if (!quiz && quizId.match(/^[0-9a-fA-F]{24}$/)) {
      quiz = await Quiz.findById(quizId);
    }

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    // Create Score record
    const newScore = await Score.create({
      user: req.user._id,
      username: req.user.username,
      quiz: quiz._id,
      quizTitle,
      genre,
      score: Number(score),
      totalQuestions: Number(totalQuestions),
    });

    // Update user cumulative stats (totalQuizzesTaken & totalScore)
    // Here we accumulate the score (number of correct answers) or points.
    // In app.js: syncUserDashboardStats fetches totalScore. Let's add the score to user.totalScore.
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalQuizzesTaken: 1, totalScore: Number(score) },
    });

    res.status(201).json(newScore);
  } catch (error) {
    next(error);
  }
};

// @desc    Get global leaderboard (sorted by user totalScore descending)
// @route   GET /api/leaderboard
// @access  Public
const getGlobalLeaderboard = async (req, res, next) => {
  try {
    const players = await User.find({})
      .select('username totalScore totalQuizzesTaken')
      .sort({ totalScore: -1 })
      .limit(20);

    res.json(players);
  } catch (error) {
    next(error);
  }
};

// @desc    Get leaderboard for a specific quiz room (sorted by score descending)
// @route   GET /api/leaderboard/:quizCode
// @access  Public
const getQuizLeaderboard = async (req, res, next) => {
  const { quizCode } = req.params;

  try {
    // Find quiz first
    let quiz = await Quiz.findOne({ code: quizCode.toUpperCase() });
    if (!quiz && quizCode.match(/^[0-9a-fA-F]{24}$/)) {
      quiz = await Quiz.findById(quizCode);
    }

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz room not found');
    }

    const quizScores = await Score.find({ quiz: quiz._id })
      .select('username score totalQuestions createdAt')
      .sort({ score: -1, createdAt: 1 })
      .limit(50);

    res.json(quizScores);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all score attempts for a specific user
// @route   GET /api/scores/user/:userId
// @access  Public
const getUserAttempts = async (req, res, next) => {
  const { userId } = req.params;

  try {
    const attempts = await Score.find({ user: userId })
      .sort({ createdAt: -1 });

    res.json(attempts);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitScore,
  getGlobalLeaderboard,
  getQuizLeaderboard,
  getUserAttempts,
};
