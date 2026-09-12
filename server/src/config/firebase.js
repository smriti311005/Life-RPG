import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let auth = null;
let warnedAboutConfig = false;

/**
 * Initialise Firebase Admin from environment variables.
 *
 * Returns `null` when credentials are absent — the server still boots so that
 * a fresh clone can run `npm run dev` and see a clear error on the first
 * authenticated request rather than a crash at startup.
 */
export function initFirebase() {
  if (auth) return auth;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // .env files can't hold real newlines, so the key is stored with \n escapes.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    // Firebase is optional now that email + password is built in, so say this
    // once at boot rather than on every request that falls through to it.
    if (!warnedAboutConfig) {
      warnedAboutConfig = true;
      console.log(
        '[auth] Firebase is not configured — running on local email + password only. ' +
          'Add the FIREBASE_* values to server/.env to also offer Google sign-in.',
      );
    }
    return null;
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

  auth = getAuth(app);
  console.log(`[auth] Firebase Admin ready for project "${projectId}"`);
  return auth;
}

export const getFirebaseAuth = () => auth;
