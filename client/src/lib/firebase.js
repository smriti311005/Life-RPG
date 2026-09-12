import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when the .env has actually been filled in. */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

let app = null;
let auth = null;

if (isFirebaseConfigured) {
  app = initializeApp(config);
  auth = getAuth(app);
  // Survive a refresh and a closed tab; this is the whole point of sync.
  setPersistence(auth, browserLocalPersistence).catch(() => {
    /* Safari private mode blocks this; session persistence still works. */
  });
} else {
  // Optional now: email + password runs against the app's own API. Firebase
  // only adds Google sign-in.
  console.info(
    '[auth] Firebase is not configured — email and password sign-in still works. ' +
      'Add the VITE_FIREBASE_* values to client/.env to also offer Google.',
  );
}

export { auth };

/**
 * Turn Firebase error codes into something a person would actually say.
 * Note the deliberate vagueness on wrong-password / user-not-found: telling an
 * attacker which half was wrong is an account-enumeration gift.
 */
export function describeAuthError(error) {
  const code = error?.code ?? '';
  const map = {
    'auth/invalid-email': 'That email address does not look right.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists for that email. Try signing in.',
    'auth/weak-password': 'Choose a password of at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
    'auth/popup-closed-by-user': 'The sign-in window was closed.',
    'auth/cancelled-popup-request': 'The sign-in window was closed.',
    'auth/popup-blocked': 'Your browser blocked the popup — redirecting instead.',
    'auth/network-request-failed': 'Network unreachable. Check your connection.',
    'auth/operation-not-allowed':
      'That sign-in method is switched off in the Firebase console.',
    'auth/unauthorized-domain':
      'This domain is not in the Firebase authorised-domains list.',
  };
  return map[code] ?? error?.message ?? 'Sign-in failed. Please try again.';
}

const requireAuth = () => {
  if (!auth) throw new Error('Firebase is not configured on this deployment.');
  return auth;
};

export async function signUpWithEmail({ email, password, displayName }) {
  const a = requireAuth();
  const credential = await createUserWithEmailAndPassword(a, email, password);
  if (displayName?.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim().slice(0, 40) });
  }
  return credential.user;
}

export async function signInWithEmail({ email, password }) {
  const a = requireAuth();
  const credential = await signInWithEmailAndPassword(a, email, password);
  return credential.user;
}

export async function signInWithGoogle() {
  const a = requireAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const credential = await signInWithPopup(a, provider);
    return credential.user;
  } catch (error) {
    // Popups are blocked in embedded browsers and some mobile contexts;
    // redirect is the reliable fallback rather than a dead end.
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(a, provider);
      return null;
    }
    throw error;
  }
}

export const resetPassword = (email) => sendPasswordResetEmail(requireAuth(), email);

export const signOut = () => fbSignOut(requireAuth());

/** Fresh ID token for the API call about to be made. */
export async function getIdToken(forceRefresh = false) {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
