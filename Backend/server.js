import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import authRoutes        from './routes/authRoutes.js';
import quizRoutes        from './routes/quizRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// ─── Environment & DB ─────────────────────────────────────────────────────────
dotenv.config();
connectDB();

const app = express();

// ─── Security & Logging ───────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5500',  // Live Server default port
    credentials: true,
  })
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date() })
);

// ─── API Routes ───────────────────────────────────────────────────────────────
//  Public:    POST /api/auth/register  POST /api/auth/login  POST /api/auth/refresh
//  Protected: everything else (Bearer JWT required)
app.use('/api/auth',        authRoutes);
app.use('/api/quiz',        quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`\n🚀 Server running on http://localhost:${PORT}  [${process.env.NODE_ENV}]\n`)
);