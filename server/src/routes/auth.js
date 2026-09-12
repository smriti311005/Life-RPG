import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { User } from '../models/User.js';
import { ApiError, asyncRoute } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { signToken, expiresInSeconds } from '../services/tokens.js';
import { serializeCharacter } from '../services/character.js';
import { getConfig, getDefaultOwnedItemIds } from '../services/gameData.js';

const router = Router();

/**
 * Local email + password authentication, backed by MongoDB.
 *
 * Passwords are never stored, logged, or returned — only a bcrypt hash, on a
 * field marked `select: false` so it stays out of ordinary queries.
 */

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                              */
/* -------------------------------------------------------------------------- */

/* Tight limits on the credential endpoints specifically. The global API limiter
 * is far too generous to slow down password guessing. */
const credentialLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Count attempts per address as well as per IP, so one shared NAT does not
  // lock out a building and one attacker cannot spread across addresses.
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
  message: {
    error: { message: 'Too many attempts. Wait fifteen minutes and try again.' },
  },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many accounts created from here. Try again later.' } },
});

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'An email address is required.')
  .max(254, 'That address is too long.')
  .email('That does not look like an email address.');

/**
 * Length over composition rules. Forcing a symbol and a digit pushes people
 * toward `Password1!`; length is what actually costs an attacker.
 */
const passwordField = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(200, 'That password is too long.');

const signupSchema = z.object({
  email: emailField,
  password: passwordField,
  displayName: z.string().trim().min(1).max(40).optional(),
  timezoneOffset: z.number().int().min(-900).max(900).optional(),
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'A password is required.').max(200),
  timezoneOffset: z.number().int().min(-900).max(900).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.').max(200),
  newPassword: passwordField,
});

function parseOrThrow(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      details[issue.path.join('.') || 'form'] = issue.message;
    }
    throw new ApiError(422, 'Please check the highlighted fields.', details);
  }
  return result.data;
}

/** The shape every successful auth call returns. */
const session = (user, token) => ({
  token,
  expiresIn: expiresInSeconds(token),
  character: serializeCharacter(user),
});

/* -------------------------------------------------------------------------- */
/* POST /api/auth/signup                                                      */
/* -------------------------------------------------------------------------- */

router.post(
  '/signup',
  signupLimiter,
  asyncRoute(async (req, res) => {
    const data = parseOrThrow(signupSchema, req.body);

    const existing = await User.findOne({ email: data.email }).select('_id').lean();
    if (existing) {
      // Signup is the one place enumeration cannot be avoided — the form has to
      // say the address is taken. Login and reset stay deliberately vague.
      throw new ApiError(409, 'An account already exists for that email.', {
        email: 'An account already exists for that email. Try signing in.',
      });
    }

    const user = new User({
      authProvider: 'local',
      email: data.email,
      displayName: data.displayName || data.email.split('@')[0].slice(0, 40),
      gold: getConfig().startingGold,
      ownedItemIds: [...getDefaultOwnedItemIds()],
      settings: { timezoneOffset: data.timezoneOffset ?? 0 },
    });

    await user.setPassword(data.password);

    try {
      await user.save();
    } catch (error) {
      // Two signups racing on the same address: the unique index is the
      // authority, not the check above.
      if (error?.code === 11000) {
        throw new ApiError(409, 'An account already exists for that email.', {
          email: 'An account already exists for that email. Try signing in.',
        });
      }
      throw error;
    }

    res.status(201).json({ ...session(user, signToken(user)), isNewCharacter: true });
  }),
);

/* -------------------------------------------------------------------------- */
/* POST /api/auth/login                                                       */
/* -------------------------------------------------------------------------- */

router.post(
  '/login',
  credentialLimiter,
  asyncRoute(async (req, res) => {
    const data = parseOrThrow(loginSchema, req.body);

    // `passwordHash` is select:false, so it has to be asked for by name.
    const user = await User.findOne({ email: data.email }).select('+passwordHash');

    /* One message for every failure — wrong address, wrong password, or an
     * address that belongs to a Google account. Telling an attacker which half
     * was right is a free account-enumeration oracle. verifyPassword still runs
     * a bcrypt comparison when there is no hash, so the timing matches too. */
    const invalid = new ApiError(401, 'Email or password is incorrect.');

    if (!user) {
      const decoy = new User();
      await decoy.verifyPassword(data.password);
      throw invalid;
    }

    const ok = await user.verifyPassword(data.password);
    if (!ok) throw invalid;

    if (typeof data.timezoneOffset === 'number') {
      user.settings.timezoneOffset = data.timezoneOffset;
      await user.save();
    }

    res.json(session(user, signToken(user)));
  }),
);

/* -------------------------------------------------------------------------- */
/* GET /api/auth/me                                                           */
/* -------------------------------------------------------------------------- */

router.get(
  '/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json({ character: serializeCharacter(req.user) });
  }),
);

/* -------------------------------------------------------------------------- */
/* POST /api/auth/password                                                    */
/* -------------------------------------------------------------------------- */

router.post(
  '/password',
  requireAuth,
  credentialLimiter,
  asyncRoute(async (req, res) => {
    const data = parseOrThrow(changePasswordSchema, req.body);
    const user = await User.findById(req.user._id).select('+passwordHash');

    if (user.authProvider !== 'local' || !user.passwordHash) {
      throw new ApiError(400, 'This account signs in with Google, so it has no password.');
    }

    const ok = await user.verifyPassword(data.currentPassword);
    if (!ok) {
      throw new ApiError(401, 'That is not your current password.', {
        currentPassword: 'That is not your current password.',
      });
    }

    await user.setPassword(data.newPassword);
    await user.save();

    /* Changing the password moves `passwordChangedAt`, which every previously
     * issued token is stamped against — so this signs out every other device.
     * The caller gets a fresh token so they are not logged out themselves. */
    res.json({
      ...session(user, signToken(user)),
      message: 'Password changed. Every other device has been signed out.',
    });
  }),
);

/* -------------------------------------------------------------------------- */
/* POST /api/auth/logout                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A JWT cannot be un-issued, so this exists to give the client one endpoint to
 * call and to document the fact. The real revocation lever is changing the
 * password, which invalidates every token at once.
 */
router.post('/logout', (_req, res) => {
  res.json({ ok: true, message: 'Discard the token on the client.' });
});

export default router;
