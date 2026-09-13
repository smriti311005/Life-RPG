import { useCalm } from '../../hooks/useAmbience';

/**
 * The dashboard's ground: radial lighting, a faint constellation, and a
 * little drifting dust.
 *
 * Explicitly *not* the castle film. This is somewhere you sit and read
 * numbers, and a moving photograph behind that is both a distraction and,
 * measured earlier in this project, about 30ms a frame. Everything here is a
 * gradient or a handful of small SVG nodes — no video, no blur filters, no
 * `backdrop-filter`.
 */

/* Fixed positions, so a hot reload does not rearrange the sky. */
const STARS = [
  [6, 14], [13, 32], [19, 9], [26, 44], [31, 20], [38, 61], [44, 12],
  [52, 37], [58, 71], [63, 22], [69, 49], [74, 8], [81, 33], [87, 66],
  [92, 18], [96, 42], [11, 78], [23, 88], [35, 82], [47, 94], [66, 86],
  [78, 91], [89, 79],
];

/* Three short lines joining a few of them. A real constellation is mostly
 * empty space; joining everything makes a net, not a sky. */
const LINES = [
  [[13, 32], [19, 9], [31, 20]],
  [[52, 37], [63, 22], [74, 8]],
  [[35, 82], [47, 94], [66, 86]],
];

export function DashAtmosphere() {
  const calm = useCalm();

  return (
    <div className="dash-atmos" aria-hidden="true">
      <div className="dash-atmos__glow" />

      <svg className="dash-atmos__sky" viewBox="0 0 100 100" preserveAspectRatio="none">
        {LINES.map((line, i) => (
          <polyline
            key={i}
            points={line.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="rgb(var(--dash-star))"
            strokeWidth="0.09"
            opacity="0.4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {STARS.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i % 5 === 0 ? 0.28 : 0.16}
            fill="rgb(var(--dash-star))"
            opacity={i % 3 === 0 ? 0.75 : 0.4}
            className={calm ? undefined : 'dash-atmos__star'}
            style={calm ? undefined : { animationDelay: `${(i % 7) * 1.1}s` }}
          />
        ))}
      </svg>

      {!calm ? (
        <div className="dash-atmos__dust">
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${8 + i * 13}%`,
                animationDelay: `${i * 4.5}s`,
                animationDuration: `${26 + i * 5}s`,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
