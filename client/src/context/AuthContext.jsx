import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';

import { auth, isFirebaseConfigured, signOut as fbSignOut } from '../lib/firebase';
import { getToken, setToken, clearToken } from '../lib/session';
import { DEV_BYPASS, DEV_USER } from '../lib/devAuth';
import { api } from '../lib/api';

const AuthContext = createContext(null);

/**
 * Session state for both providers.
 *
 * **Local** (the default): email + password against this app's own API, with
 * a bcrypt hash in MongoDB and a JWT held in localStorage.
 *
 * **Firebase** (optional): only offered when the VITE_FIREBASE_* values are
 * present, and only to add Google sign-in.
 *
 * A local token takes precedence: if one is stored, Firebase is not consulted.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEV_BYPASS ? DEV_USER : null);
  // Covers the moment before a stored token has been checked. Rendering routes
  // before it resolves would flash the sign-in screen at an already-signed-in
  // player on every refresh.
  const [checking, setChecking] = useState(!DEV_BYPASS);

  /* ------------------------------ local session ----------------------------- */

  const adoptLocal = useCallback((payload) => {
    if (payload?.token) setToken(payload.token);
    const character = payload?.character;
    setUser({
      uid: character?.id ?? null,
      id: character?.id ?? null,
      email: character?.email ?? null,
      displayName: character?.displayName ?? null,
      photoURL: character?.photoURL ?? null,
      provider: 'local',
    });
    return character;
  }, []);

  const signUpLocal = useCallback(
    async ({ email, password, displayName }) => {
      const result = await api.signup({
        email,
        password,
        displayName,
        timezoneOffset: new Date().getTimezoneOffset(),
      });
      return adoptLocal(result);
    },
    [adoptLocal],
  );

  const signInLocal = useCallback(
    async ({ email, password }) => {
      const result = await api.login({
        email,
        password,
        timezoneOffset: new Date().getTimezoneOffset(),
      });
      return adoptLocal(result);
    },
    [adoptLocal],
  );

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      // The server reissues a token, because changing the password invalidates
      // every token minted before it — including the one making this request.
      const result = await api.changePassword({ currentPassword, newPassword });
      if (result?.token) setToken(result.token);
      return result;
    },
    [],
  );

  /* --------------------------------- boot ---------------------------------- */

  useEffect(() => {
    if (DEV_BYPASS) return undefined;

    let cancelled = false;

    (async () => {
      // A stored token is only a claim; the server decides whether it is still
      // valid. An expired or revoked one is discarded rather than left to fail
      // every subsequent request.
      if (getToken()) {
        try {
          const { character } = await api.authMe();
          if (cancelled) return;
          setUser({
            uid: character.id,
            id: character.id,
            email: character.email,
            displayName: character.displayName,
            photoURL: character.photoURL,
            provider: 'local',
          });
          setChecking(false);
          return;
        } catch {
          clearToken();
        }
      }

      if (cancelled) return;

      if (!isFirebaseConfigured) {
        setChecking(false);
        return;
      }

      // Completes a redirect-based Google sign-in when a popup was blocked.
      getRedirectResult(auth).catch(() => {});

      onAuthStateChanged(
        auth,
        (nextUser) => {
          if (cancelled) return;
          setUser(nextUser ? { ...toPlain(nextUser), provider: 'firebase' } : null);
          setChecking(false);
        },
        () => !cancelled && setChecking(false),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------- sign out -------------------------------- */

  const signOut = useCallback(async () => {
    const wasFirebase = user?.provider === 'firebase';
    clearToken();
    setUser(null);
    if (wasFirebase && isFirebaseConfigured) {
      await fbSignOut().catch(() => {});
    }
  }, [user?.provider]);

  const value = useMemo(
    () => ({
      user,
      checking,
      provider: user?.provider ?? null,
      /** Whether Google sign-in can be offered at all. */
      googleAvailable: isFirebaseConfigured,
      signUpLocal,
      signInLocal,
      changePassword,
      adoptFirebaseUser: (fbUser) =>
        setUser(fbUser ? { ...toPlain(fbUser), provider: 'firebase' } : null),
      signOut,
    }),
    [user, checking, signUpLocal, signInLocal, changePassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Firebase User objects are exotic; keep only what the app reads. */
const toPlain = (fbUser) => ({
  uid: fbUser.uid,
  id: fbUser.uid,
  email: fbUser.email,
  displayName: fbUser.displayName,
  photoURL: fbUser.photoURL,
});

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
