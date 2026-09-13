import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

/**
 * Signing and verification for local (non-Firebase) sessions.
 *
 * The token carries a user id, the provider, and a `pwd` stamp — the second
 * resolution of `passwordChangedAt`. Changing a password moves that stamp, so
 * every token issued before the change stops verifying. That is what makes
 * "sign out everywhere" work without a server-side session table.
 */

const DEFAULT_TTL = process.env.JWT_EXPIRES_IN || '7d';

let cachedSecret = null;

function secret() {
  if (cachedSecret) return cachedSecret;

  const configured =
    process.env.JWT_SECRET ||
    '3uHKpbE2-JImsDHO8TQyNt3SMOrkABGjR3GIi5IaPoeZTQSRzkPwHQ6HGN0vvqZ_';

  if (configured && configured.length >= 32) {
    cachedSecret = configured;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is missing or shorter than 32 characters. Generate one with:\n' +
        "  node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    );
  }

  // Development convenience only: a random secret per boot. Restarting the
  // server invalidates every session, which is a fair trade for not shipping a
  // default secret that someone forgets to change.
  cachedSecret = crypto.randomBytes(48).toString('base64url');
  console.warn(
    '[auth] JWT_SECRET is not set — using a random per-boot secret. ' +
      'Sessions will not survive a restart. Set one in server/.env.',
  );
  return cachedSecret;
}

/** Seconds-resolution stamp of the last password change. */
export const passwordStamp = (user) =>
  user.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : 0;

export function signToken(user, { expiresIn = DEFAULT_TTL } = {}) {
  return jwt.sign(
    { sub: user._id.toString(), provider: 'local', pwd: passwordStamp(user) },
    secret(),
    { expiresIn, issuer: 'life-rpg' },
  );
}

/** @returns the decoded payload, or null if the token is absent or invalid. */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, secret(), { issuer: 'life-rpg' });
  } catch {
    return null;
  }
}

/** Seconds until a signed token expires, for the client to schedule a refresh. */
export function expiresInSeconds(token) {
  const payload = verifyToken(token);
  if (!payload?.exp) return null;
  return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
}
