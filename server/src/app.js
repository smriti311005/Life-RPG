import dotenv from 'dotenv';
dotenv.config();
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: new URL('../../server/.env', import.meta.url) });
}

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
  isGameDataLoaded,
  getAttributes,
  getDifficulties,
  getClasses,
  getAchievementDefs,
} from './services/gameData.js';

const app = express();

/* --------------------------------- hardening ------------------------------- */

app.set('trust proxy', 1); // correct client IPs behind reverse proxies / Vercel
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '64kb' }));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: same-origin, curl, health checks
      if (!origin) return callback(null, true);

      // Explicitly allowed origin or wildcard
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Automatically allow all Vercel deployment domains (preview branches & production)
      if (/^https:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) {
        return callback(null, true);
      }

      // Disallow origin cleanly without throwing an unhandled exception
      callback(null, false);
    },
    credentials: true,
  }),
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

/* Rate limiter: generous ceiling for honest gameplay, prevents hammer abuse */
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Slow down a moment — too many requests.' } },
});

/* ------------------------------ initialization ---------------------------- */

let initPromise = null;

export async function ensureInitialized() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    initFirebase();

    if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
      const uri =
        process.env.MONGODB_URI ||
        'mongodb+srv://punithvendra_db_user:punith123@cluster0.an8niov.mongodb.net/life-rpg?appName=Cluster0&retryWrites=true&w=majority';
      await connectDatabase(uri);
    }

    if (!isGameDataLoaded()) {
      await loadGameData();
    }
  })().catch((err) => {
    initPromise = null; // Clear so subsequent requests can retry
    throw err;
  });

  return initPromise;
}

/* ---------------------------------- routes --------------------------------- */

const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', async (_req, res) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await ensureInitialized();
    } catch {
      // Reported via status object below
    }
  }

  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    ok: mongoose.connection.readyState === 1,
    service: 'life-rpg-api',
    database: states[mongoose.connection.readyState] ?? 'unknown',
    uptime: Math.round(process.uptime()),
  });
});

// Ensure DB and game data are ready before any API operations
apiRouter.use(async (_req, _res, next) => {
  try {
    await ensureInitialized();
    next();
  } catch (err) {
    next(err);
  }
});

// Game rules and progression curve
apiRouter.get('/rules', (_req, res) => {
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

apiRouter.use(apiLimiter);

// Auth & user routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/me', requireAuth, meRoutes);
apiRouter.use('/tasks', requireAuth, taskRoutes);
apiRouter.use('/shop', requireAuth, shopRoutes);
apiRouter.use('/stats', requireAuth, statsRoutes);
apiRouter.use('/achievements', requireAuth, achievementRoutes);
apiRouter.use('/character', requireAuth, characterRoutes);

// Mount under both /api and root router so requests resolve regardless of rewrite stripping
app.use('/api', apiRouter);
app.use(apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
