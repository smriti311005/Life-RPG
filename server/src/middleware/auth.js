import { getFirebaseAuth, initFirebase } from '../config/firebase.js';
import { User } from '../models/User.js';
import { ApiError } from './error.js';
import { verifyToken, passwordStamp } from '../services/tokens.js';
import { getConfig, getDefaultOwnedItemIds } from '../services/gameData.js';

/**
 * Resolve the caller and attach their User document.
 *
 * Two providers are accepted from the same `Authorization: Bearer` header:
 *
 *   1. A local JWT issued by /api/auth — the default, backed by a bcrypt hash
 *      in MongoDB.
 *   2. A Firebase ID token — only if Firebase is configured. Optional.
 *
 * Local tokens are tried first because they are cheap to verify (a signature
 * check, no network) and are what most deployments will use.
 *
 * Everything downstream reads `req.user._id` for scoping. No route ever takes
 * a user id from a request body, so one account cannot address another's data.
 */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    /* ----------------------------- dev bypass ----------------------------- */

    if (process.env.AUTH_DEV_BYPASS === 'true') {
      const uid = req.get('x-dev-uid') || 'dev-user';
      req.user = await findOrCreateFirebaseUser(uid, {
        email: `${uid}@local.dev`,
        name: 'Dev Wanderer',
      });
      req.authProvider = 'dev';
      return next();
    }

    if (!token) throw new ApiError(401, 'Missing authentication token.');

    /* ------------------------------ local JWT ----------------------------- */

    const payload = verifyToken(token);

    if (payload?.sub) {
      /* Deliberately WITHOUT the password hash. `passwordChangedAt` is all the
       * stamp check needs, and loading the hash here once cost every user their
       * password: assigning `undefined` to it marks the path modified, so the
       * next user.save() in the request unset it in the database. */
      const user = await User.findById(payload.sub);
      if (!user) throw new ApiError(401, 'That account no longer exists.');

      /* The token is stamped with the password's last-changed time. A password
       * change moves the stamp and every older token stops verifying — which is
       * how "sign out everywhere" works without a session table. */
      if ((payload.pwd ?? 0) !== passwordStamp(user)) {
        throw new ApiError(401, 'Your password changed — please sign in again.');
      }

      req.user = user;
      req.authProvider = 'local';
      return next();
    }

    /* ---------------------------- Firebase token --------------------------- */

    const auth = getFirebaseAuth() ?? initFirebase();
    if (!auth) {
      // Not a valid local token, and no Firebase to fall back on.
      throw new ApiError(401, 'Invalid or expired session. Please sign in again.');
    }

    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (err) {
      const expired = err?.code === 'auth/id-token-expired';
      throw new ApiError(
        401,
        expired ? 'Session expired — please sign in again.' : 'Invalid authentication token.',
      );
    }

    req.user = await findOrCreateFirebaseUser(decoded.uid, decoded);
    req.firebaseClaims = decoded;
    req.authProvider = 'firebase';
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Upsert the local mirror of a Firebase account.
 *
 * Kept on one path so first login and every later request behave identically.
 * Starting gold and the free palette come from the game config rather than
 * schema defaults, so retuning them applies to new accounts immediately.
 */
async function findOrCreateFirebaseUser(uid, claims = {}) {
  const existing = await User.findOne({ firebaseUid: uid });
  if (existing) return existing;

  return User.create({
    authProvider: 'firebase',
    firebaseUid: uid,
    email: claims.email ?? null,
    displayName: claims.name || claims.email?.split('@')[0]?.slice(0, 40) || 'Wanderer',
    photoURL: claims.picture ?? null,
    gold: getConfig().startingGold,
    ownedItemIds: [...getDefaultOwnedItemIds()],
  });
}
