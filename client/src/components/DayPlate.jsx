import { useEffect, useRef } from 'react';

import { useCalm, useFinePointer } from '../hooks/useAmbience';

/**
 * The painted Hogwarts plate behind the front page.
 *
 * A still, not the film: the reference art is a daylight painting and the
 * night flyover is a different world entirely. Depth comes from three things
 * moving at different rates: the painting drifts with the pointer, the dust
 * drifts faster and against it, and the vignette does not move at all.
 *
 * Translation, deliberately, not rotation. The first version rotated a
 * `preserve-3d` box and measured 45ms a frame on its own, because rotating a
 * viewport-sized raster re-rasterises it every frame. Moving a texture costs
 * almost nothing and the eye reads the same depth from the differing rates.
 */

/* Dust hanging in afternoon light. Fixed table, not random, so a hot reload
 * does not teleport every mote. */
const MOTES = [
  { x: 8, y: 22, z: 220, s: 5, d: 19 },
  { x: 19, y: 68, z: 90, s: 3, d: 26 },
  { x: 28, y: 38, z: 300, s: 6, d: 15 },
  { x: 37, y: 81, z: 40, s: 3, d: 31 },
  { x: 46, y: 17, z: 160, s: 4, d: 22 },
  { x: 57, y: 57, z: 260, s: 6, d: 17 },
  { x: 64, y: 29, z: 70, s: 3, d: 28 },
  { x: 72, y: 74, z: 200, s: 5, d: 20 },
  { x: 81, y: 44, z: 120, s: 4, d: 24 },
  { x: 89, y: 12, z: 280, s: 6, d: 16 },
  { x: 94, y: 63, z: 60, s: 3, d: 33 },
  { x: 13, y: 50, z: 340, s: 7, d: 14 },
];

export function DayPlate({ still = false }) {
  const worldRef = useRef(null);
  const calm = useCalm();
  const fine = useFinePointer();
  // `still` is for the routes behind the gate: the painting is there to
  // say where you are, not to be looked at, so it does not track the
  // pointer and does not carry dust.
  const live = !calm && fine && !still;

  useEffect(() => {
    const node = worldRef.current;
    if (!node || !live) return undefined;

    let frame = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const tick = () => {
      frame = 0;
      current.x += (target.x - current.x) * 0.05;
      current.y += (target.y - current.y) * 0.05;
      // Unitless: each layer multiplies these by its own --rate, so one pair
      // of writes drives the whole parallax.
      node.style.setProperty('--px', current.x.toFixed(2));
      node.style.setProperty('--py', current.y.toFixed(2));
      if (Math.abs(target.x - current.x) > 0.05 || Math.abs(target.y - current.y) > 0.05) {
        frame = requestAnimationFrame(tick);
      }
    };

    const onMove = (event) => {
      target.x = (event.clientX / window.innerWidth - 0.5) * -26;
      target.y = (event.clientY / window.innerHeight - 0.5) * -16;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [live]);

  return (
    <div className={`plate${still ? ' plate--still' : ''}`} aria-hidden="true">
      <div ref={worldRef} className="plate__world">
        <div className="plate__layer plate__layer--art">
          <picture>
            {/* Portrait crop for phones: the landscape plate letterboxed into a
                9:16 hole would show a sliver of mountain and no castle. */}
            <source
              media="(max-aspect-ratio: 10/9)"
              type="image/webp"
              srcSet="/media/hogwarts-day-portrait.webp"
            />
            <source
              media="(max-aspect-ratio: 10/9)"
              srcSet="/media/hogwarts-day-portrait.jpg"
            />
            <source
              type="image/webp"
              srcSet="/media/hogwarts-day-1000.webp 1000w, /media/hogwarts-day-1600.webp 1600w"
              sizes="100vw"
            />
            <img
              src="/media/hogwarts-day-1600.jpg"
              srcSet="/media/hogwarts-day-1000.jpg 1000w, /media/hogwarts-day-1600.jpg 1600w"
              sizes="100vw"
              alt=""
              // The front page's largest paint: never lazy, and decoded off
              // the main thread so it does not block first render.
              fetchPriority="high"
              decoding="async"
              className="plate__img"
            />
          </picture>
        </div>

        {still ? null : (
          <div className="plate__layer plate__layer--motes">
            {MOTES.slice(0, 6).map((m, i) => (
              <span
                key={i}
                className="mote"
                style={{
                  left: `${m.x}%`,
                  top: `${m.y}%`,
                  width: `${m.s}px`,
                  height: `${m.s}px`,
                  '--md': `${m.d}s`,
                  '--mdelay': `${i * 1.3}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="plate__layer plate__layer--veil" />
      </div>
    </div>
  );
}
