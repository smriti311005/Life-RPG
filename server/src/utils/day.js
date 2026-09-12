/**
 * Day keys.
 *
 * Streaks are a human concept — "did I show up yesterday?" — so they have to be
 * measured in the user's own local day, not UTC. Every user stores the UTC
 * offset their browser last reported; these helpers turn an instant into the
 * `YYYY-MM-DD` the user would call it.
 */

/**
 * @param {Date}   date        instant to convert
 * @param {number} offsetMin   `Date#getTimezoneOffset()` from the client
 *                             (minutes *behind* UTC — positive west of GMT)
 */
export function dayKey(date = new Date(), offsetMin = 0) {
  const shifted = new Date(date.getTime() - offsetMin * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Calendar days between two `YYYY-MM-DD` keys (`b - a`). */
export function daysBetween(a, b) {
  if (!a || !b) return Infinity;
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** The `count` most recent day keys, oldest first, ending at `endKey`. */
export function recentDays(endKey, count) {
  const end = Date.parse(`${endKey}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(end - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}
