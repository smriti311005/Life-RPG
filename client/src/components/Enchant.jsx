import { forwardRef, useCallback, useRef } from 'react';

import { useCalm, useFinePointer } from '../hooks/useAmbience';

/* -------------------------------------------------------------------------- */
/* Tilt                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A surface that leans toward the pointer, with a candle-glare that slides
 * across it as it turns.
 *
 * The rotation is written to CSS custom properties on the node rather than
 * held in React state. A card under the cursor gets a pointermove event on
 * every frame the mouse moves, and re-rendering a quest card sixty times a
 * second to move it four degrees would cost far more than the effect is worth.
 *
 * Children can be pushed off the face with `.pop-1/2/3`, which is what turns a
 * flat rotation into something that reads as actual depth.
 *
 * The card's own background comes in through `surface` rather than on the
 * element itself, and is rendered as a sibling layer behind the content. That
 * is not decoration: `backdrop-filter` — which is what `.glass` is for —
 * forces `transform-style: flat` on the element carrying it, so a blurred
 * wrapper would silently collapse every `.pop-*` inside it back onto the face.
 */
export const Tilt3D = forwardRef(function Tilt3D(
  {
    as: Element = 'div',
    max = 8,
    lift = -4,
    depth = 0,
    glare = true,
    surface = '',
    radius = 'rounded-card',
    // Tilts the card as a single plane, with no depth inside it. Use it for
    // any card holding an absolutely-positioned popover: inside a preserve-3d
    // context, siblings paint in z-position order and `z-index` stops
    // deciding, so a dropdown can end up behind the next card in the list.
    flat = false,
    className = '',
    children,
    ...props
  },
  forwardedRef,
) {
  const localRef = useRef(null);
  const liveRef = useRef(false);
  const frameRef = useRef(0);
  const calm = useCalm();
  const fine = useFinePointer();
  const active = !calm && fine;

  const setRef = useCallback(
    (node) => {
      localRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!active) return;
      const node = localRef.current;
      if (!node) return;

      // Cache the pointer position; the read of the element's box and every
      // style write happen together in the next frame, so a burst of moves
      // cannot interleave reads and writes and force repeated layout.
      const { clientX, clientY } = event;
      if (frameRef.current) return;

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        const box = node.getBoundingClientRect();
        if (!box.width || !box.height) return;

        const px = (clientX - box.left) / box.width;
        const py = (clientY - box.top) / box.height;

        if (!liveRef.current) {
          liveRef.current = true;
          node.dataset.live = 'true';
        }

        // Away from the pointer on Y, toward it on X — the way a real panel
        // hinged at its centre would turn under a finger.
        node.style.setProperty('--tilt-y', `${(px - 0.5) * 2 * max}deg`);
        node.style.setProperty('--tilt-x', `${(0.5 - py) * 2 * max}deg`);
        node.style.setProperty('--tilt-lift', `${lift}px`);
        node.style.setProperty('--tilt-z', `${depth}px`);
        node.style.setProperty('--glare-x', `${px * 100}%`);
        node.style.setProperty('--glare-y', `${py * 100}%`);
        node.style.setProperty('--glare', '1');
      });
    },
    [active, max, lift, depth],
  );

  const onPointerLeave = useCallback(() => {
    const node = localRef.current;
    if (!node) return;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    // Hand the easing back before resetting, so it settles rather than snaps.
    liveRef.current = false;
    node.dataset.live = 'false';
    node.style.setProperty('--tilt-y', '0deg');
    node.style.setProperty('--tilt-x', '0deg');
    node.style.setProperty('--tilt-lift', '0px');
    node.style.setProperty('--tilt-z', '0px');
    node.style.setProperty('--glare', '0');
  }, []);

  return (
    <Element
      ref={setRef}
      className={`tilt relative ${radius} ${flat ? 'tilt--flat' : ''} ${className}`}
      onPointerMove={active ? onPointerMove : undefined}
      onPointerLeave={active ? onPointerLeave : undefined}
      {...props}
    >
      {surface ? (
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-[inherit] ${surface}`}
        />
      ) : null}

      {/* Content sits above the surface layer and stays in the 3D context, so
          `.pop-*` children really do come off the face. A div, not a span:
          these cards hold headings, and a heading inside phrasing content is
          invalid even where a browser lets it pass. */}
      {surface ? (
        <div className={`relative ${flat ? '' : 'preserve-3d'}`}>{children}</div>
      ) : (
        children
      )}

      {glare && active ? <span className="tilt__glare" aria-hidden="true" /> : null}
    </Element>
  );
});

/* -------------------------------------------------------------------------- */
/* Crest                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The house crest mark: a shield with an inner sigil, drawn from theme tokens
 * so it re-colours with the palette instead of shipping five PNGs.
 */
export function Crest({ className = 'h-7 w-7', id = 'crest' }) {
  return (
    <svg viewBox="0 0 32 34" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-primary))" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path
        d="M16 1.5 29 5.5v11.2c0 7.6-5.2 13-13 16.3C9.2 29.7 4 24.3 4 16.7V5.5z"
        fill={`url(#${id}-body)`}
        opacity="0.9"
      />
      <path
        d="M16 1.5 29 5.5v11.2c0 7.6-5.2 13-13 16.3C9.2 29.7 4 24.3 4 16.7V5.5z"
        fill="none"
        stroke="rgb(var(--c-accent))"
        strokeWidth="1.1"
        opacity="0.7"
      />
      {/* Lightning sigil */}
      <path
        d="M18.4 8.5 11 18.6h4.3L13.6 26l7.6-10.4h-4.4z"
        fill="rgb(var(--c-void))"
        opacity="0.85"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Divider                                                                    */
/* -------------------------------------------------------------------------- */

/** A hairline with a diamond struck through it — a section break with a seal. */
export function RuneRule({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line" />
      <span className="text-2xs text-accent/70">✦</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line" />
    </div>
  );
}
