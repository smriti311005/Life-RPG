import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { createMusic } from '../lib/music';

/**
 * The floating bar on the front page: sound on the left, the wordmark in the
 * middle, the menu on the right.
 *
 * One pill rather than a full-width rule, so the painting runs behind it
 * uninterrupted and the bar reads as an object resting on the scene.
 */

const MUSIC_KEY = 'liferpg:music';

/* -------------------------------------------------------------------------- */
/* Sound                                                                      */
/* -------------------------------------------------------------------------- */

function SoundToggle() {
  const musicRef = useRef(null);
  const [on, setOn] = useState(false);

  // Deliberately not restored from storage on load. Audio needs a gesture in
  // every current browser, so a remembered "on" would either silently fail or
  // start sound the moment someone clicked anything — which is worse than
  // asking them to press the button again.
  useEffect(() => {
    return () => musicRef.current?.stop();
  }, []);

  // A tab in the background should not be making noise.
  useEffect(() => {
    const onVisibility = () => musicRef.current?.duck(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const toggle = async () => {
    if (!musicRef.current) musicRef.current = createMusic();
    if (on) {
      musicRef.current.stop();
      setOn(false);
    } else {
      await musicRef.current.start();
      setOn(true);
    }
    try {
      localStorage.setItem(MUSIC_KEY, on ? 'off' : 'on');
    } catch {
      /* private mode */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Turn the music off' : 'Turn the music on'}
      className="archive__icon"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
        <path d="M4 9v6h3.6L13 19.2V4.8L7.6 9z" />
        {on ? (
          <>
            <path
              d="M16.2 8.4a4.6 4.6 0 0 1 0 7.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path
              d="M18.6 5.8a8.2 8.2 0 0 1 0 12.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              opacity="0.65"
            />
          </>
        ) : (
          <path
            d="M16.4 9.6l5 4.8M21.4 9.6l-5 4.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Menu                                                                       */
/* -------------------------------------------------------------------------- */

function Menu({ links }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close the menu' : 'Open the menu'}
        className="archive__icon"
      >
        {/* Two rules, as on the reference — not three. */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 9.5h16M4 14.5h16'}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div role="menu" className="archive__menu">
          {links.map((link) =>
            link.to ? (
              <Link
                key={link.label}
                to={link.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="archive__menu-item"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="archive__menu-item"
              >
                {link.label}
              </a>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bar                                                                        */
/* -------------------------------------------------------------------------- */

export function ArchiveBar({ name, tagline }) {
  return (
    <header className="archive__barwrap">
      <div className="archive__pillbar">
        <SoundToggle />

        <div className="min-w-0 text-center">
          <p className="archive__wordmark">{name}</p>
          <p className="archive__wordmark-sub">{tagline}</p>
        </div>

        <Menu
          links={[
            { label: 'The curriculum', href: '#subjects' },
            { label: 'The houses', href: '#houses' },
            { label: 'Sign in', to: '/enter' },
          ]}
        />
      </div>
    </header>
  );
}
