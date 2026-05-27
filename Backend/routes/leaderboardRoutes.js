import express from 'express';
import {
  saveScore,
  getMyScores,
  getQuizLeaderboard,
  getGlobalLeaderboard,
} from '../controllers/leaderboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All leaderboard routes require a valid JWT
router.use(protect);

router.post('/scores',        saveScore);
router.get('/my',             getMyScores);
router.get('/global',         getGlobalLeaderboard);
router.get('/quiz/:quizCode', getQuizLeaderboard);

export default router;