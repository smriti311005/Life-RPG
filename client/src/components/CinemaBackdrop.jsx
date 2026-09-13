import { useEffect, useRef, useState } from 'react';

import { useCalm, useFinePointer, useLowData } from '../hooks/useAmbience';

/* -------------------------------------------------------------------------- */
/* Cuts                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Three cuts of the same eight-second flyover, all encoded as forward-then-
 * reversed loops so they return to frame one without a jump.
 *
 *   wide     — the hero cut, for the public routes where the film is the point
 *   portrait — the same shot blur-padded to 9:16, so a phone is not showing a
 *              letterboxed sliver of a landscape plate
 *   veil     — heavily blurred and pushed down, for the signed-in routes where
 *              there is real content to read and the film is only atmosphere
 */
const CUTS = {
  wide: { src: '/media/hogwarts-wide', poster: '/media/hogwarts-wide.jpg' },
  portrait: { src: '/media/hogwarts-portrait', poster: '/media/hogwarts-portrait.jpg' },
  veil: { src: '/media/hogwarts-veil', poster: '/media/hogwarts-veil.jpg' },
};

/* -------------------------------------------------------------------------- */
/* Parallax                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Drives the plate's drift from the pointer and the scroll position.
 *
 * Writes CSS custom properties on the container rather than setting React
 * state, so a mouse move never re-renders the tree underneath. Coalesced into
 * one rAF tick, because pointermove fires far more often than the screen
 * refreshes.
 */
function useParallax(ref, enabled) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return undefined;

    let frame = 0;
    // The pointer and the scroll contribute to the same drift independently,
    // so they are tracked apart and summed — otherwise whichever fired last
    // would erase the other's contribution.
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    // Scrolling pushes the castle down slowly, so the page feels like it is
    // rising past the shot rather than sliding over a static image.
    const scrollOffset = () => Math.min(window.scrollY * 0.06, 70);

    const retarget = () => {
      target.x = pointer.x;
      target.y = pointer.y + scrollOffset();
    };

    const tick = () => {
      frame = 0;
      // Ease toward the target so the plate glides instead of snapping.
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;

      node.style.setProperty('--pan-x', `${current.x.toFixed(2)}px`);
      node.style.setProperty('--pan-y', `${current.y.toFixed(2)}px`);
      // The moon glow rides at roughly double the plate's rate, which is what
      // reads as depth between the two layers.
      node.style.setProperty('--pan-x2', `${(current.x * -2.1).toFixed(2)}px`);
      node.style.setProperty('--pan-y2', `${(current.y * -1.8).toFixed(2)}px`);

      // Keep animating while there is still distance to cover.
      if (Math.abs(target.x - current.x) > 0.05 || Math.abs(target.y - current.y) > 0.05) {
        frame = requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onPointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * -34;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * -22;
      retarget();
      schedule();
    };

    const onScroll = () => {
      retarget();
      schedule();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, enabled]);
}

/* -------------------------------------------------------------------------- */
/* Backdrop                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The film the whole app sits on: a fixed, muted, looping plate of the castle
 * at midnight, under a mode-aware scrim.
 *
 * It degrades in stages rather than all at once. Reduced motion, Data Saver
 * and a failed autoplay each fall back to the poster still, which is the same
 * first frame — so the composition never changes, only whether it moves.
 */
export function CinemaBackdrop({ variant = 'veil', candles = false }) {
  const calm = useCalm();
  const lowData = useLowData();
  const fine = useFinePointer();
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Always the requested cut, cropped by `object-fit: cover`.
  //
  // Phones used to get the 9:16 blur-padded cut. That was right when the film
  // was a faint wash behind content, but as a full-bleed hero its padded top
  // and bottom thirds read as two black bands with a letterboxed strip of
  // castle between them. Cropping the landscape fills the screen with actual
  // picture instead, which is what a full-bleed video wants.
  const cut = CUTS[variant];
  const playFilm = !calm && !lowData;

  useParallax(wrapRef, !calm && fine);

  // Tell the stylesheet a film is mounted, so the page ground moves to <html>
  // and panels thicken enough to stay readable over moving picture.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-backdrop', 'on');
    return () => root.removeAttribute('data-backdrop');
  }, []);

  // Decoding video for a tab nobody is looking at is pure battery drain.
  useEffect(() => {
    if (!playFilm) return undefined;
    const onVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) video.pause();
      else video.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [playFilm]);

  // Autoplay is allowed for muted inline video, but a browser is still free to
  // refuse. If it does, stay on the poster rather than showing a dead frame.
  useEffect(() => {
    if (!playFilm) {
      setReady(false);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => setReady(false));
  }, [playFilm, cut.src]);

  return (
    <>
      <div ref={wrapRef} className="cinema" aria-hidden="true">
        {/* The still is always painted, and the film fades in over it once it
            has a frame to show. Gating the *only* plate on `canplay` meant a
            browser that could not decode either file — or a headless one that
            never paints video at all — showed a black page instead of a
            castle. The poster is 29KB; a guaranteed backdrop is worth it. */}
        <img
          className="cinema__plate"
          // Dropped from the tree once the film has a frame up. It is fully
          // covered at that point, and leaving it in means the compositor
          // blends two viewport-sized layers on every frame for nothing.
          data-covered={playFilm && ready ? 'true' : 'false'}
          src={cut.poster}
          alt=""
        />

        {playFilm ? (
          <video
            // Re-mount on a cut change so the browser picks up the new sources.
            key={cut.src}
            ref={videoRef}
            className="cinema__plate cinema__plate--film"
            data-ready={ready ? 'true' : 'false'}
            poster={cut.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            tabIndex={-1}
            onPlaying={() => setReady(true)}
            onCanPlay={() => setReady(true)}
            onError={() => setReady(false)}
          >
            {/* VP9 first: it is 30-40% smaller than the H.264 at matching
                quality, and anything that cannot read it falls to the mp4. */}
            <source src={`${cut.src}.webm`} type="video/webm" />
            <source src={`${cut.src}.mp4`} type="video/mp4" />
          </video>
        ) : null}

        {/* Only on the sharp cuts. The veil is blurred past the point where
            the moon is a locatable object, so a bloom pinned to where it used
            to be reads as a light leak rather than moonlight. */}
        {variant === 'veil' ? null : <div className="cinema__moon" />}
        <div className="cinema__mist cinema__mist--far" />
        <div className="cinema__mist" />
        <div className="cinema__scrim" />
      </div>

      {/* Outside the film, not inside it: `.cinema` is a paint-contained,
          clipped box, and the candles need to hang in front of the scrim. */}
      {candles ? <FloatingCandles /> : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Floating candles                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The Great Hall's candles, hung at different depths.
 *
 * The layout is a fixed table rather than `Math.random()` so it is identical
 * on every render and every reload — a candle that jumps to a new spot on a
 * hot reload, or drifts on a re-render, reads as a bug.
 */
const CANDLES = [
  { left: 7, top: 16, h: 26, z: -220, dur: 15, delay: 0.0, dx: 8, dy: -26 },
  { left: 18, top: 8, h: 18, z: -340, dur: 19, delay: 1.6, dx: -6, dy: -18 },
  { left: 27, top: 30, h: 34, z: -90, dur: 13, delay: 0.7, dx: 10, dy: -30 },
  { left: 39, top: 12, h: 22, z: -280, dur: 17, delay: 2.4, dx: -9, dy: -22 },
  { left: 52, top: 24, h: 30, z: -150, dur: 14, delay: 1.1, dx: 7, dy: -28 },
  { left: 61, top: 6, h: 16, z: -400, dur: 21, delay: 3.2, dx: -5, dy: -16 },
  { left: 71, top: 22, h: 28, z: -190, dur: 16, delay: 0.4, dx: 9, dy: -24 },
  { left: 82, top: 13, h: 20, z: -320, dur: 18, delay: 2.0, dx: -7, dy: -20 },
  { left: 91, top: 32, h: 32, z: -110, dur: 12, delay: 1.4, dx: 6, dy: -32 },
  { left: 46, top: 42, h: 24, z: -60, dur: 20, delay: 2.8, dx: -8, dy: -19 },
];

export function FloatingCandles({ count = CANDLES.length }) {
  const calm = useCalm();
  if (calm) return null;

  return (
    <div className="candles">
      {CANDLES.slice(0, count).map((candle, i) => (
        <span
          key={i}
          className="candle"
          style={{
            left: `${candle.left}%`,
            top: `${candle.top}%`,
            '--candle-z': `${candle.z}px`,
            '--candle-dur': `${candle.dur}s`,
            '--candle-delay': `${candle.delay}s`,
            '--candle-dx': `${candle.dx}px`,
            '--candle-dy': `${candle.dy}px`,
            // Each flame gets its own rhythm; shared timing reads as a strobe.
            '--flicker-dur': `${1.7 + (i % 5) * 0.34}s`,
          }}
        >
          <span className="candle__flame" />
          <span className="candle__stick" style={{ height: `${candle.h}px` }} />
        </span>
      ))}
    </div>
  );
}
