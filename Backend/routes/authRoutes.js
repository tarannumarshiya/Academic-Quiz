import express from 'express';
import { body } from 'express-validator';
import { register, login, refresh, logout, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.post('/refresh', refresh);

// ── Protected ─────────────────────────────────────────────────────────────────
router.post('/logout', protect, logout);
router.get('/me',     protect, getMe);

export default router;