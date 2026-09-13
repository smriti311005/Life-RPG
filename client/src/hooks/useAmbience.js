import { useEffect, useState } from 'react';

/* -------------------------------------------------------------------------- */
/* Motion                                                                     */
/* -------------------------------------------------------------------------- */

function calmNow() {
  if (typeof window === 'undefined') return true;
  const os = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const inApp = document.documentElement.getAttribute('data-motion') === 'reduced';
  return os || inApp;
}

/**
 * True when this player should not be given motion.
 *
 * Two sources, watched live: the OS setting, and the in-app toggle, which
 * writes `data-motion="reduced"` onto <html> for people whose OS says nothing.
 * The CSS honours both already — this is for the parts that only JS can stop,
 * like the pointer tilt and the video itself.
 */
export function useCalm() {
  const [calm, setCalm] = useState(calmNow);

  useEffect(() => {
    const sync = () => setCalm(calmNow());
    sync();

    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    query?.addEventListener('change', sync);

    // The in-app toggle is an attribute change, not an event, so watch for it.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    return () => {
      query?.removeEventListener('change', sync);
      observer.disconnect();
    };
  }, []);

  return calm;
}

/* -------------------------------------------------------------------------- */
/* Input                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * True for a mouse or trackpad.
 *
 * Pointer tilt is meaningless on a touchscreen — there is no hover, so the
 * card would only ever tilt under the finger already covering it.
 */
export function useFinePointer() {
  const [fine, setFine] = useState(
    () => window.matchMedia?.('(pointer: fine)').matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia?.('(pointer: fine)');
    if (!query) return undefined;
    const onChange = (event) => setFine(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return fine;
}

/* -------------------------------------------------------------------------- */
/* Connection                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * True when a megabyte of decorative video would be rude: Data Saver is on,
 * or the connection reports itself as 2G/3G.
 *
 * `navigator.connection` is Chromium-only. Everywhere else this is false,
 * which is the right guess — Safari and Firefox users get the video.
 */
export function useLowData() {
  const [low, setLow] = useState(false);

  useEffect(() => {
    const connection = navigator.connection;
    if (!connection) return undefined;

    const sync = () => {
      const slow = /(^|-)(2g|3g)$/.test(connection.effectiveType ?? '');
      setLow(Boolean(connection.saveData) || slow);
    };
    sync();

    connection.addEventListener?.('change', sync);
    return () => connection.removeEventListener?.('change', sync);
  }, []);

  return low;
}

/* -------------------------------------------------------------------------- */
/* Viewport                                                                   */
/* -------------------------------------------------------------------------- */

/** True when the viewport is taller than it is wide — pick the portrait cut. */
export function useTallViewport() {
  const [tall, setTall] = useState(
    () => window.matchMedia?.('(max-aspect-ratio: 10/9)').matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia?.('(max-aspect-ratio: 10/9)');
    if (!query) return undefined;
    const onChange = (event) => setTall(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return tall;
}

/* -------------------------------------------------------------------------- */
/* Appearance                                                                 */
/* -------------------------------------------------------------------------- */

function lightNow() {
  if (typeof document === 'undefined') return false;
  const mode = document.documentElement.getAttribute('data-mode');
  if (mode === 'light') return true;
  if (mode === 'dark') return false;
  // No attribute means "follow the OS".
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
}

/**
 * True when the app is currently rendering light.
 *
 * The plate needs this in JS rather than CSS because the two modes use two
 * different paintings. Swapping them with `content:` on the <img> worked in
 * Chrome but downloaded both files and did nothing at all in Firefox, which
 * does not support `content` on a replaced element. Choosing the `srcSet` in
 * render fetches exactly one and works everywhere.
 */
export function useLightMode() {
  const [light, setLight] = useState(lightNow);

  useEffect(() => {
    const sync = () => setLight(lightNow());
    sync();

    const query = window.matchMedia?.('(prefers-color-scheme: light)');
    query?.addEventListener('change', sync);

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mode'],
    });

    return () => {
      query?.removeEventListener('change', sync);
      observer.disconnect();
    };
  }, []);

  return light;
}
