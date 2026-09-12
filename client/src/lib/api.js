import { getIdToken } from './firebase';
import { getToken } from './session';
import { DEV_BYPASS, DEV_UID } from './devAuth';

// In dev, Vite proxies /api to Express. In production the client is pointed at
// its deployed API host via VITE_API_URL.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status, details, offline = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.offline = offline;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One call to the API.
 *
 * Attaches a fresh Firebase ID token, retries once on an expired token with a
 * forced refresh, and retries transient network/5xx failures with a short
 * backoff so a flaky connection does not surface as a hard error.
 */
export async function request(path, { method = 'GET', body, signal, retries = 2 } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('You are offline. Your progress is safe — reconnect to sync.', {
      offline: true,
    });
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      /* A local session token wins. Only when there is none do we ask the
       * Firebase SDK, which is optional and may not be configured at all.
       * Force a refresh on the retry that follows a 401. */
      const token =
        getToken() ?? (await getIdToken(attempt > 0 && lastError?.status === 401));

      const response = await fetch(`${BASE}/api${path}`, {
        method,
        signal,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(DEV_BYPASS ? { 'x-dev-uid': DEV_UID } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (response.status === 204) return null;

      const text = await response.text();
      let payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        const error = new ApiError(
          payload?.error?.message || `Request failed (${response.status})`,
          { status: response.status, details: payload?.error?.details },
        );

        // Retry only what is worth retrying: a stale token, or the server
        // having a bad moment. A 409 or 422 will fail identically next time.
        const retryable = response.status === 401 || response.status >= 500;
        if (retryable && attempt < retries) {
          lastError = error;
          await sleep(220 * 2 ** attempt);
          continue;
        }
        throw error;
      }

      return payload;
    } catch (error) {
      if (error.name === 'AbortError') throw error;

      if (error instanceof ApiError && !(error.status === 401 || error.status >= 500)) {
        throw error;
      }

      lastError = error;

      if (attempt < retries) {
        await sleep(220 * 2 ** attempt);
        continue;
      }

      if (error instanceof ApiError) throw error;

      throw new ApiError(
        'Could not reach the server. Check your connection and try again.',
        { offline: true },
      );
    }
  }

  throw lastError;
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

export const api = {
  health: () => request('/health'),
  rules: () => request('/rules'),

  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload, retries: 0 }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, retries: 0 }),
  authMe: () => request('/auth/me', { retries: 0 }),
  changePassword: (payload) =>
    request('/auth/password', { method: 'POST', body: payload, retries: 0 }),

  sync: (payload) => request('/me/sync', { method: 'POST', body: payload }),
  onboardingOptions: () => request('/me/onboarding'),
  completeOnboarding: (payload) =>
    request('/me/onboarding', { method: 'POST', body: payload }),
  me: () => request('/me'),
  updateMe: (payload) => request('/me', { method: 'PATCH', body: payload }),

  listTasks: (status = 'active') => request(`/tasks?status=${status}`),
  createTask: (payload) => request('/tasks', { method: 'POST', body: payload }),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: payload }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  completeTask: (id) => request(`/tasks/${id}/complete`, { method: 'POST', body: {} }),
  undoTask: (id) => request(`/tasks/${id}/undo`, { method: 'POST', body: {} }),

  shop: () => request('/shop'),
  buyItem: (id) => request(`/shop/${id}/buy`, { method: 'POST', body: {} }),
  useItem: (id) => request(`/shop/${id}/use`, { method: 'POST', body: {} }),

  stats: (days = 91) => request(`/stats?days=${days}`),
  character: () => request('/character'),
  achievements: () => request('/achievements'),
};
