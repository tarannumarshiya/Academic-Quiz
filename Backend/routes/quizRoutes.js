const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getAllQuizzes,
  getQuizByCode,
} = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createQuiz)
  .get(getAllQuizzes);

router.route('/:code')
  .get(getQuizByCode);

module.exports = router;
