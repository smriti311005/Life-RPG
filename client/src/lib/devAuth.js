/**
 * Development-only authentication bypass.
 *
 * Lets the full signed-in UI be run and reviewed before a Firebase project
 * exists. It pairs with `AUTH_DEV_BYPASS=true` in `server/.env`, which makes the
 * API trust an `x-dev-uid` header instead of verifying an ID token.
 *
 * Two independent guards, both of which must hold:
 *
 *   1. `import.meta.env.DEV` — Vite substitutes the literal `false` here when
 *      building for production, so `DEV_BYPASS` is compiled to a constant
 *      `false` and every branch guarded by it becomes unreachable. No
 *      environment variable can switch it back on at deploy time.
 *   2. `VITE_AUTH_DEV_BYPASS=true` — an explicit opt-in, absent by default.
 *
 * (Verified against a production build: the flag minifies to `false`, so the
 * `x-dev-uid` header can never be attached.)
 *
 * Never enable this against a database holding real accounts: anyone who can
 * reach the API can name any uid they like.
 */
export const DEV_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_DEV_BYPASS === 'true';

/** The uid the bypass presents to the API. */
export const DEV_UID = import.meta.env.VITE_AUTH_DEV_UID || 'dev-user';

/** A stand-in for a Firebase `User`, shaped like the bits the app reads. */
export const DEV_USER = DEV_BYPASS
  ? {
      uid: DEV_UID,
      email: `${DEV_UID}@local.dev`,
      displayName: 'Dev Wanderer',
      photoURL: null,
      getIdToken: async () => null,
    }
  : null;
