import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { fmt } from '../lib/game';
import { ModeToggle } from './ModeToggle';

const NAV = [
  { to: '/play', label: 'Quests', glyph: '⚔', mobile: true },
  { to: '/character', label: 'Character', glyph: '☗', mobile: true },
  { to: '/achievements', label: 'Achievements', glyph: '🏆', mobile: true },
  { to: '/chronicle', label: 'Chronicle', glyph: '❧', mobile: true },
  { to: '/emporium', label: 'Emporium', glyph: '◉', mobile: true },
  // Six tabs will not fit a phone; the Keep stays reachable from the avatar menu.
  { to: '/keep', label: 'Keep', glyph: '⌂', mobile: false },
];

const MOBILE_NAV = NAV.filter((item) => item.mobile);

/* -------------------------------------------------------------------------- */
/* Brand                                                                      */
/* -------------------------------------------------------------------------- */

function Mark() {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <defs>
          <linearGradient id="mark-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-primary))" />
            <stop offset="100%" stopColor="rgb(var(--c-accent))" />
          </linearGradient>
        </defs>
        <path
          d="M16 3l2.9 8.1L27 14l-8.1 2.9L16 25l-2.9-8.1L5 14l8.1-2.9z"
          fill="url(#mark-grad)"
        />
      </svg>
      <span className="font-display text-base font-bold tracking-wide text-ink">
        LIFE<span className="text-primary">RPG</span>
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Account menu                                                               */
/* -------------------------------------------------------------------------- */

function AccountMenu() {
  const { signOut, user } = useAuth();
  const { character } = useGame();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const initial = (character?.displayName || user?.email || 'W').charAt(0).toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-line bg-raised text-sm font-semibold text-ink transition-colors hover:border-primary/60"
      >
        {character?.photoURL ? (
          <img
            src={character.photoURL}
            alt=""
            width="36"
            height="36"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          initial
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="panel absolute right-0 top-12 z-50 w-60 p-2"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-ink">
                {character?.displayName ?? 'Wanderer'}
              </p>
              <p className="truncate text-2xs text-faint">{user?.email}</p>
            </div>

            <div className="hairline my-1" />

            <NavLink
              to="/keep"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-raised"
            >
              The Keep
            </NavLink>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
            >
              Sign out
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

export function AppShell({ children }) {
  const { character, online } = useGame();
  const location = useLocation();
  const mainRef = useRef(null);

  // Move focus to the main region on navigation so a keyboard or screen-reader
  // user lands on the new content instead of the top of the nav every time.
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const navClass = ({ isActive }) =>
    `relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
      isActive ? 'text-ink' : 'text-muted hover:text-ink'
    }`;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <a href="#main" className="sr-only-focusable btn-primary fixed left-4 top-4 z-[100]">
        Skip to content
      </a>

      {!online ? (
        <div
          role="status"
          className="sticky top-0 z-50 bg-danger/90 px-4 py-1.5 text-center text-2xs font-semibold text-void"
        >
          Offline — changes will not be saved until you reconnect
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink to="/play" aria-label="Life RPG home">
            <Mark />
          </NavLink>

          {/* Desktop nav */}
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-0.5">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={navClass}>
                    {({ isActive }) => (
                      <>
                        <span aria-hidden="true" className="text-xs opacity-70">
                          {item.glyph}
                        </span>
                        {item.label}
                        {isActive ? (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute inset-0 -z-10 rounded-xl border border-line bg-raised/70"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2.5">
            {character ? (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="numeric chip border-accent/35 text-accent">
                  ◉ {fmt(character.gold)}
                </span>
                <span
                  className={`numeric chip ${character.streak.current > 0 ? 'border-primary/35 text-primary' : ''}`}
                  title={`Longest streak: ${character.streak.longest} days`}
                >
                  🔥 {character.streak.current}
                </span>
              </div>
            ) : null}
            <ModeToggle />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 md:pb-16"
      >
        {children}
      </main>

      {/* Mobile tab bar — thumb-reachable, with a safe-area inset for notched
          phones so the last row is never under the home indicator. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-void/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto flex max-w-md">
          {MOBILE_NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[0.625rem] font-medium leading-tight transition-colors ${
                    isActive ? 'text-primary' : 'text-faint'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span aria-hidden="true" className="text-base leading-none">
                      {item.glyph}
                    </span>
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={`h-0.5 w-6 rounded-full transition-colors ${
                        isActive ? 'bg-primary' : 'bg-transparent'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
