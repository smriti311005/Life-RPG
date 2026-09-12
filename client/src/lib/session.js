const TOKEN_KEY = 'liferpg:token';

/**
 * Where the local session token lives.
 *
 * `localStorage`, sent as an `Authorization: Bearer` header — the same shape
 * the Firebase SDK already used, so the API client has one code path.
 *
 * The honest trade-off: a token in localStorage is readable by any script that
 * achieves XSS on this origin. An httpOnly cookie would not be, but the client
 * and the API are deployed to different origins, which forces
 * `SameSite=None` and hands back a CSRF problem in exchange. Given the app
 * ships no user-generated HTML and React escapes by default, this is the
 * simpler risk to reason about. It is also exactly what the Firebase SDK does
 * with its own tokens, so the profile does not change by supporting both.
 */

let memoryToken = null;

export function getToken() {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = localStorage.getItem(TOKEN_KEY);
  } catch {
    memoryToken = null; // private mode, blocked storage
  }
  return memoryToken;
}

export function setToken(token) {
  memoryToken = token ?? null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* the in-memory copy still carries this tab */
  }
}

export const clearToken = () => setToken(null);
