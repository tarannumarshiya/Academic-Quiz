
const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);

module.exports = router;
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