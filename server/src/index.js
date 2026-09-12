import 'dotenv/config';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import { connectDatabase } from './config/db.js';
import { initFirebase } from './config/firebase.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import taskRoutes from './routes/tasks.js';
import shopRoutes from './routes/shop.js';
import statsRoutes from './routes/stats.js';
import achievementRoutes from './routes/achievements.js';
import characterRoutes from './routes/character.js';

import { xpForNextLevel, streakMilestones } from './game/rules.js';
import {
  loadGameData,
  getAttributes,
  getDifficulties,
  getClasses,
  getAchievementDefs,
} from './services/gameData.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

/* --------------------------------- hardening ------------------------------- */

app.set('trust proxy', 1); // correct client IPs behind Render/Railway/Heroku
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '64kb' }));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: curl, health checks, same-origin server rendering.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  }),
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

/* A generous ceiling: enough that honest play never notices, low enough that a
 * script cannot hammer the completion endpoint. */
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Slow down a moment — too many requests.' } },
});

/* ---------------------------------- public --------------------------------- */

app.get('/api/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    ok: mongoose.connection.readyState === 1,
    service: 'life-rpg-api',
    database: states[mongoose.connection.readyState] ?? 'unknown',
    uptime: Math.round(process.uptime()),
  });
});

/**
 * The rulebook, served to the client so the UI can label difficulties and draw
 * progress bars without hardcoding a second copy of the game's constants.
 */
app.get('/api/rules', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({
    attributes: getAttributes(),
    difficulties: getDifficulties(),
    classes: getClasses(),
    achievementCount: getAchievementDefs().length,
    streakMilestones: streakMilestones(),
    sampleCurve: Array.from({ length: 20 }, (_, i) => ({
      level: i + 1,
      xpToNext: xpForNextLevel(i + 1),
    })),
  });
});

/* -------------------------------- protected -------------------------------- */

app.use('/api', apiLimiter);

// Auth mounts before requireAuth: signup and login are how you get a token.
app.use('/api/auth', authRoutes);

app.use('/api/me', requireAuth, meRoutes);
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/shop', requireAuth, shopRoutes);
app.use('/api/stats', requireAuth, statsRoutes);
app.use('/api/achievements', requireAuth, achievementRoutes);
app.use('/api/character', requireAuth, characterRoutes);

app.use(notFound);
app.use(errorHandler);

/* ---------------------------------- boot ----------------------------------- */

async function start() {
  initFirebase(); // warns rather than throws when unconfigured
  await connectDatabase(process.env.MONGODB_URI);

  // Definitions must be in memory before any route validates an id against
  // them, so this blocks the listen() below.
  await loadGameData();

  const server = app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
    console.log(`[api] cors origins: ${allowedOrigins.join(', ')}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} received, closing`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[api] failed to start:', err.message);
  process.exit(1);
});

export default app;
