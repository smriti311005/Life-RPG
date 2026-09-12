import { useState } from 'react';
/**
 * House heraldry, drawn rather than downloaded.
 *
 * These are original silhouettes in the heraldic tradition — a lion rampant, a
 * coiled serpent, an eagle displayed, a badger passant — not reproductions of
 * anyone's film artwork. Practically that also makes them better assets: they
 * take their colour from the live theme tokens, stay sharp at any size, and
 * cost about a kilobyte each instead of a PNG per house per resolution.
 */

/* -------------------------------------------------------------------------- */
/* Beasts                                                                     */
/* -------------------------------------------------------------------------- */

/* Each beast is a single path on a 48×48 grid, filled with `currentColor` so
 * the shield below can tint it without knowing anything about the shape. */
const BEASTS = {
  gryffindor: {
    label: 'a lion rampant',
    path: 'M31 9c2.6 0 4.4 1.5 5.2 3.6 2 .5 3.3 2 3.3 3.9 0 1.4-.7 2.5-1.8 3.2.5 1 .8 2.2.8 3.4 0 2.4-1.1 4.4-2.9 5.6l2.4 8.9-4.2-2.2-1.2 4.6-3.1-3.9-2.6 4.3-1.5-5-3.3 3.1.1-4.9-4.4 1.6 1.8-4.4-4.8-.4 3.2-3.2-4.3-2.2 4.1-1.7-2.6-3.6 4.3.4-.7-4.2 3.7 2 1-4.3 2.6 3.3 2.3-3.6.6 4.1zM26 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6.5 8.5c.9 1 2 1.5 3.2 1.5s2.3-.5 3.2-1.5c-1 .4-2.1.6-3.2.6s-2.2-.2-3.2-.6z',
  },
  slytherin: {
    label: 'a serpent coiled',
    path: 'M24 6c7.7 0 14 5.2 14 11.7 0 5.3-4 9.4-9.6 10.9-3.4.9-5.4 1.9-5.4 3.4 0 1.3 1.2 2.2 3 2.2 1.6 0 2.9-.6 4.2-1.7l3 3.3C31.2 37.7 28.7 39 25.5 39c-4.9 0-8.5-2.8-8.5-6.8 0-4 3-6.2 8.2-7.5 4.1-1 6.3-2.8 6.3-5.3 0-3.2-3.3-5.7-7.5-5.7-3.6 0-6.4 1.7-7.6 4.3l-4.6-1.8C13.4 9.4 18.2 6 24 6zm7.5 6.6a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM19 11.5l-3.6-2.2 1 3.9z',
  },
  ravenclaw: {
    label: 'an eagle displayed',
    path: 'M24 7l3.4 5.6L33 9.4l-.6 6.3 6.2-1.3-3.3 5.4 6 1.6-5.2 3.4 4.7 3.9-6.1.7 2.6 5.6-5.9-1.9-.3 6.2-4.6-4-4.6 4-.3-6.2-5.9 1.9 2.6-5.6-6.1-.7 4.7-3.9L5.7 21l6-1.6-3.3-5.4 6.2 1.3-.6-6.3 5.6 3.2zm0 8.6-2.2 5.2 2.2 9.4 2.2-9.4z',
  },
  hufflepuff: {
    label: 'a badger passant',
    path: 'M17 14c1.4 0 2.6.6 3.4 1.6h7.2c.8-1 2-1.6 3.4-1.6 2.5 0 4.5 1.9 4.5 4.3 0 .9-.3 1.7-.7 2.4 2.4 1.6 4.2 3.9 4.2 6.6 0 4.7-5.6 7.7-14 7.7s-14-3-14-7.7c0-2.7 1.8-5 4.2-6.6a4.2 4.2 0 0 1-.7-2.4c0-2.4 2-4.3 4.5-4.3zm2.6 8.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zm8.8 0a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM24 28.4c-1.5 0-2.8.7-3.4 1.7h6.8c-.6-1-1.9-1.7-3.4-1.7z',
  },
  /* The school itself: a tower, for the default palette. */
  hogwarts: {
    label: 'a castle tower',
    path: 'M24 6l3.6 4.8V8h4v6.2l3.4 4.6V38H13V18.8l3.4-4.6V8h4v2.8zm-2 16h-4v6h4zm8 0h-4v6h4zm-4 10h-4v6h4z',
  },
};

/* -------------------------------------------------------------------------- */
/* Crest                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A shield bearing one house's beast.
 *
 * `house` picks the charge; the colours always come from the live palette, so
 * a Gryffindor crest shown while Slytherin is equipped is green — which is the
 * correct behaviour for a shop preview sitting in the current theme, and the
 * Emporium passes explicit colours when it wants the true house tincture.
 */
export function HouseCrest({
  house = 'hogwarts',
  className = 'h-10 w-10',
  field,
  charge,
  id,
}) {
  const beast = BEASTS[house] ?? BEASTS.hogwarts;
  const uid = id ?? `crest-${house}`;

  return (
    <svg viewBox="0 0 48 54" className={className} role="img" aria-label={beast.label}>
      <defs>
        <linearGradient id={`${uid}-field`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={field ?? 'rgb(var(--c-primary-soft))'} />
          <stop offset="100%" stopColor={field ?? 'rgb(var(--c-surface))'} />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <path d="M24 1 46 7v22.5C46 41 35.6 49.4 24 53 12.4 49.4 2 41 2 29.5V7z" />
        </clipPath>
      </defs>

      {/* Field */}
      <path
        d="M24 1 46 7v22.5C46 41 35.6 49.4 24 53 12.4 49.4 2 41 2 29.5V7z"
        fill={`url(#${uid}-field)`}
      />

      {/* A diagonal shine, clipped to the shield, so it reads as metal. */}
      <g clipPath={`url(#${uid}-clip)`}>
        <path d="M-6 34 22-8h12L6 40z" fill="rgb(255 255 255 / 0.07)" />
      </g>

      {/* Charge */}
      <g
        transform="translate(4.8 6) scale(0.8)"
        style={{ color: charge ?? 'rgb(var(--c-accent))' }}
      >
        <path d={beast.path} fill="currentColor" />
      </g>

      {/* Border last, so it sits over the charge and the shine. */}
      <path
        d="M24 1 46 7v22.5C46 41 35.6 49.4 24 53 12.4 49.4 2 41 2 29.5V7z"
        fill="none"
        stroke={charge ?? 'rgb(var(--c-accent))'}
        strokeWidth="1.6"
        opacity="0.85"
      />
    </svg>
  );
}

/** The true tinctures, for previews that must not follow the equipped theme. */
export const HOUSE_COLORS = {
  hogwarts: { field: '#11263a', charge: '#ffb052' },
  gryffindor: { field: '#5a1512', charge: '#f7c862' },
  slytherin: { field: '#0b3527', charge: '#c6d6dc' },
  ravenclaw: { field: '#12224a', charge: '#d0965e' },
  hufflepuff: { field: '#3a2f0e', charge: '#f6ca4e' },
};

export const HOUSES = Object.keys(BEASTS);

/* -------------------------------------------------------------------------- */
/* Medallion                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A palette, shown as a crest that turns over to reveal its colours.
 *
 * A row of three swatches tells you what a palette contains but nothing about
 * what it *is*; a crest is identity but hides the colours. Putting them on two
 * faces of one card gives both without spending twice the space — and the flip
 * is the rare 3D flourish that carries real information rather than decorating
 * a state change.
 *
 * Driven by hover, focus and click together: hover alone strands touch and
 * keyboard users on the front face forever.
 */
export function ThemeMedallion({ theme, swatches = [], name, size = 'h-16 w-16' }) {
  const [flipped, setFlipped] = useState(false);
  const tincture = HOUSE_COLORS[theme];
  const isHouse = Boolean(BEASTS[theme]);

  // Non-house palettes have no beast of their own, so they borrow the castle
  // and are tinted from their own swatches instead of a house's tinctures.
  const field = tincture?.field ?? swatches[0];
  const charge = tincture?.charge ?? swatches[2] ?? swatches[1];

  return (
    <button
      type="button"
      aria-label={`${name}: ${flipped ? 'showing colours' : 'showing crest'}. Turn it over.`}
      aria-pressed={flipped}
      onClick={() => setFlipped((v) => !v)}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      className={`stage-near shrink-0 rounded-xl ${size}`}
    >
      <span className={`flip block h-full w-full`} data-face={flipped ? 'back' : 'front'}>
        {/* Front: the crest */}
        <span className="flip__face flex h-full w-full items-center justify-center">
          <HouseCrest
            house={isHouse ? theme : 'hogwarts'}
            id={`med-${theme}`}
            field={field}
            charge={charge}
            className="h-full w-auto drop-shadow"
          />
        </span>

        {/* Back: the palette itself */}
        <span className="flip__face flip__face--back flex overflow-hidden rounded-xl ring-1 ring-line">
          {swatches.map((color) => (
            <span key={color} className="h-full flex-1" style={{ background: color }} />
          ))}
        </span>
      </span>
    </button>
  );
}
