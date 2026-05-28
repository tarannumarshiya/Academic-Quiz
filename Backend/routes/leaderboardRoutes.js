const express = require('express');
const router = express.Router();
const {
  submitScore,
  getGlobalLeaderboard,
  getQuizLeaderboard,
  getUserAttempts,
} = require('../controllers/leaderboardController');
const { protect } = require('../middleware/authMiddleware');

router.post('/scores', protect, submitScore);
router.get('/scores/user/:userId', getUserAttempts);
router.get('/leaderboard', getGlobalLeaderboard);
router.get('/leaderboard/:quizCode', getQuizLeaderboard);

module.exports = router;
