import { useEffect, useRef } from 'react';

import { useCalm, useFinePointer } from '../hooks/useAmbience';

/**
 * A room, not a picture of a room.
 *
 * Four flat layers are pushed to different `translateZ` depths inside one
 * `preserve-3d` box, and the box itself turns a few degrees toward the
 * pointer. The parallax then falls out of the perspective projection for
 * free — near layers sweep, far layers barely move — which is what separates
 * this from the usual trick of translating background images at different
 * speeds. Nothing here is a parallax *simulation*; the browser is doing the
 * actual projection.
 *
 * Each layer is scaled by `(P - z) / P` to cancel the shrink that pushing it
 * back would otherwise cause, so all four cover the viewport identically and
 * only their *motion* betrays the depth.
 */

const PERSPECTIVE = 1400;

/* -------------------------------------------------------------------------- */
/* Layer art                                                                  */
/* -------------------------------------------------------------------------- */

/** The far wall: gothic windows with the moon behind them. */
function WindowWall() {
  return (
    <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" className="hall__svg">
      <defs>
        <linearGradient id="hall-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-primary))" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {[150, 400, 650, 900].map((x) => (
        <g key={x}>
          {/* A lancet window: pointed arch over a rectangle. */}
          <path
            d={`M${x} 620 V300 a70 70 0 0 1 140 0 V620 Z`}
            fill="url(#hall-glass)"
          />
          {/* Tracery — the stone ribs that stop it reading as a lit slab. */}
          <path
            d={`M${x + 70} 620 V232 M${x} 430 h140 M${x} 520 h140`}
            stroke="rgb(var(--c-void))"
            strokeWidth="9"
            fill="none"
            opacity="0.85"
          />
        </g>
      ))}
    </svg>
  );
}

/** House banners, hung between the windows and the columns. */
function Banners() {
  const houses = [
    { x: 90, c: '235 98 88' },
    { x: 350, c: '86 214 158' },
    { x: 700, c: '130 164 250' },
    { x: 960, c: '246 202 78' },
  ];

  return (
    <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" className="hall__svg">
      {houses.map((h, i) => (
        <g key={h.x} className="hall__banner" style={{ '--sway-delay': `${i * 1.7}s` }}>
          {/* Pennant: a rectangle with a notched foot. */}
          <path
            d={`M${h.x} 0 h150 v300 l-75 -46 -75 46 Z`}
            fill={`rgb(${h.c})`}
            opacity="0.22"
          />
          <path
            d={`M${h.x} 0 h150 v300 l-75 -46 -75 46 Z`}
            fill="none"
            stroke={`rgb(${h.c})`}
            strokeWidth="3"
            opacity="0.4"
          />
        </g>
      ))}
    </svg>
  );
}

/** Stone columns down both sides of the hall. */
function Columns() {
  return (
    <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" className="hall__svg">
      {[40, 190, 870, 1020].map((x) => (
        <g key={x} fill="rgb(var(--c-void))" opacity="0.82">
          <rect x={x} y="0" width="88" height="700" />
          {/* Capital and base, so it is a column and not a bar. */}
          <rect x={x - 14} y="150" width="116" height="26" />
          <rect x={x - 14} y="600" width="116" height="30" />
        </g>
      ))}
    </svg>
  );
}

/** The arch you are standing under — the only layer in front of the content. */
function ForegroundArch() {
  return (
    <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" className="hall__svg">
      {/* One path: a full-bleed rectangle with an arched hole punched in it,
          using evenodd so the middle stays open. */}
      <path
        d="M0 0 H1200 V700 H0 Z M170 700 V270 a430 300 0 0 1 860 0 V700 Z"
        fillRule="evenodd"
        fill="rgb(var(--c-void))"
        opacity="0.9"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

/* Opacities are deliberately low. At full strength the hall is a picture the
 * app happens to sit on; at these values it is a room the app sits in, which
 * is the difference between decoration and depth. */
const LAYERS = [
  { z: -900, Art: WindowWall, opacity: 0.3 },
  { z: -620, Art: Banners, opacity: 0.4 },
  { z: -340, Art: Columns, opacity: 0.45 },
  { z: 130, Art: ForegroundArch, opacity: 0.6 },
];

export function GreatHall() {
  const worldRef = useRef(null);
  const calm = useCalm();
  const fine = useFinePointer();
  const live = !calm && fine;

  useEffect(() => {
    const node = worldRef.current;
    if (!node || !live) return undefined;

    let frame = 0;
    const target = { yaw: 0, pitch: 0 };
    const current = { yaw: 0, pitch: 0 };

    const tick = () => {
      frame = 0;
      current.yaw += (target.yaw - current.yaw) * 0.055;
      current.pitch += (target.pitch - current.pitch) * 0.055;
      node.style.setProperty('--yaw', `${current.yaw.toFixed(3)}deg`);
      node.style.setProperty('--pitch', `${current.pitch.toFixed(3)}deg`);
      if (
        Math.abs(target.yaw - current.yaw) > 0.002 ||
        Math.abs(target.pitch - current.pitch) > 0.002
      ) {
        frame = requestAnimationFrame(tick);
      }
    };

    const onMove = (event) => {
      // Small angles on purpose. Past about four degrees the flat layers stop
      // reading as a room and start reading as sheets of paper on strings.
      target.yaw = (event.clientX / window.innerWidth - 0.5) * 7;
      target.pitch = (0.5 - event.clientY / window.innerHeight) * 3.4;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [live]);

  return (
    <div className="hall" aria-hidden="true">
      <div ref={worldRef} className="hall__world">
        {LAYERS.map(({ z, Art, opacity }) => (
          <div
            key={z}
            className="hall__layer"
            style={{ '--z': z, '--p': PERSPECTIVE, opacity }}
          >
            <Art />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Snitch                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One golden snitch, on a long irregular circuit through the scene.
 *
 * The whole thing is a single CSS keyframe on a 34-second clock, so it costs
 * nothing per frame on the main thread — the compositor owns it. It is not
 * interactive and never will be: something that darts away from the cursor is
 * a delight for four seconds and an obstacle forever after.
 */
export function Snitch() {
  const calm = useCalm();
  if (calm) return null;

  return (
    <div className="snitch" aria-hidden="true">
      <span className="snitch__wing snitch__wing--l" />
      <span className="snitch__wing snitch__wing--r" />
      <span className="snitch__body" />
    </div>
  );
}
