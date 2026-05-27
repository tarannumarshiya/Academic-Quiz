import express from 'express';
import { body } from 'express-validator';
import {
  createQuiz,
  getQuizByCode,
  getMyQuizzes,
  deleteQuiz,
} from '../controllers/quizController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All quiz routes require a valid JWT
router.use(protect);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Quiz title is required'),
    body('questions').isArray({ min: 1 }).withMessage('At least 1 question is required'),
    body('questions.*.questionText').notEmpty().withMessage('Each question must have text'),
    body('questions.*.options').isArray({ min: 4, max: 4 }).withMessage('Each question must have exactly 4 options'),
    body('questions.*.correctOption').isInt({ min: 0, max: 3 }).withMessage('correctOption must be 0-3'),
  ],
  createQuiz
);

router.get('/my',         getMyQuizzes);
router.get('/code/:code', getQuizByCode);
router.delete('/:id',     deleteQuiz);

export default router;