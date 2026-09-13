import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { OWL_POST } from '../../lib/dashboardData';
import { Crest } from '../Enchant';
import { DashAtmosphere } from './DashAtmosphere';

/**
 * Chrome for the authenticated dashboard: a slim navbar, a collapsible
 * sidebar, and a drawer in place of that sidebar on small screens.
 *
 * Deliberately separate from `AppShell`. The quest board and the rest of the
 * signed-in app use that one, and it has a different job — a horizontal tab
 * bar, no sidebar. Sharing one component would have meant branching it on
 * route, which is how a shell ends up serving neither page well.
 */

/* -------------------------------------------------------------------------- */
/* Navigation model                                                           */
/* -------------------------------------------------------------------------- */

/* `to` points at a route that exists; `soon` marks a destination this build
 * does not have a page for yet, so the link reads as deliberate rather than
 * broken. */
const SECTIONS = [
  {
    label: 'Home',
    items: [
      { id: 'hall', label: 'Great Hall', to: '/dashboard', icon: 'hall', end: true },
      { id: 'journey', label: 'My Journey', to: '/character', icon: 'path' },
      { id: 'continue', label: 'Continue Learning', to: '/play', icon: 'play' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { id: 'houses', label: 'Hogwarts Houses', to: '/dashboard#house', icon: 'crest' },
      { id: 'subjects', label: 'Subjects', to: '/dashboard#subjects', icon: 'book' },
      { id: 'archives', label: 'Magical Archives', to: '/chronicle', icon: 'scroll' },
      { id: 'spellbook', label: 'Spellbook', to: '/emporium', icon: 'wand' },
    ],
  },
  {
    label: 'Personal',
    items: [
      { id: 'profile', label: 'Wizard Profile', to: '/character', icon: 'user' },
      { id: 'achievements', label: 'Achievements', to: '/achievements', icon: 'medal' },
      { id: 'owl', label: 'Owl Post', to: '/dashboard#owl', icon: 'owl' },
      { id: 'settings', label: 'Settings', to: '/keep', icon: 'gear' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

/* One 24-grid path per icon, stroked with currentColor. Drawn rather than
 * pulled from an icon package: nine glyphs is not worth a dependency, and
 * these inherit the sidebar's colour transitions for free. */
const PATHS = {
  hall: 'M4 20V10l8-6 8 6v10M9 20v-6h6v6',
  path: 'M6 20c0-4 4-4 4-8s-4-4-4-8M18 4c0 4-4 4-4 8s4 4 4 8',
  play: 'M8 5.5v13l10-6.5z',
  crest: 'M12 3l8 2.5v6c0 4.6-3.4 8-8 9.5-4.6-1.5-8-4.9-8-9.5v-6z',
  book: 'M5 4.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H5zM19 4.5h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6z',
  scroll: 'M7 4h10v14a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 8h6M9 12h6',
  wand: 'M5 19L17 7M15 5l4 4M6.5 5.5l1 1M18 15l1 1',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0',
  medal: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM9 13.5L7.5 21l4.5-2.4L16.5 21 15 13.5',
  owl: 'M12 20c-4 0-7-2.7-7-7 0-3.6 1.5-6 3-8 .8 1 1.6 1.4 2 1.4h4c.4 0 1.2-.4 2-1.4 1.5 2 3 4.4 3 8 0 4.3-3 7-7 7zM9.5 10.5h.01M14.5 10.5h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2.5l1.3 2.2 2.5-.5.4 2.5 2.2 1.3-1.4 2.1 1.4 2.1-2.2 1.3-.4 2.5-2.5-.5L12 21.5l-1.3-2.2-2.5.5-.4-2.5-2.2-1.3L7 13.9l-1.4-2.1L7.8 10.5l.4-2.5 2.5.5z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4M12 17h.01',
  logout: 'M15 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9M13 12H20M17.5 8.5L21 12l-3.5 3.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16.2 16.2L21 21',
  bell: 'M12 3a5.5 5.5 0 0 0-5.5 5.5c0 4-1.5 5.5-1.5 5.5h14s-1.5-1.5-1.5-5.5A5.5 5.5 0 0 0 12 3zM10 18a2 2 0 0 0 4 0',
  chevron: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 8h16M4 16h16',
};

export function Icon({ name, className = 'h-[1.15rem] w-[1.15rem]' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <path
        d={PATHS[name] ?? PATHS.hall}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Dropdown plumbing                                                          */
/* -------------------------------------------------------------------------- */

/** Closes a popover on outside pointer-down and on Escape. */
function useDismiss(open, close) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

const POP = {
  initial: { opacity: 0, y: -8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.985 },
  transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
};

/* -------------------------------------------------------------------------- */
/* Owl Post                                                                   */
/* -------------------------------------------------------------------------- */

function OwlPostButton() {
  const [open, setOpen] = useState(false);
  const [letters, setLetters] = useState(OWL_POST);
  const ref = useDismiss(open, () => setOpen(false));
  const unread = letters.filter((l) => l.unread).length;

  const markAllRead = () => setLetters((list) => list.map((l) => ({ ...l, unread: false })));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={unread ? `Owl Post, ${unread} unread` : 'Owl Post'}
        className="dash-iconbtn"
      >
        <Icon name="bell" />
        {unread ? <span className="dash-dot" aria-hidden="true" /> : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div {...POP} role="menu" className="dash-pop dash-pop--wide">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="dash-pop__title">Owl Post</p>
              {unread ? (
                <button type="button" onClick={markAllRead} className="dash-pop__action">
                  Mark all read
                </button>
              ) : null}
            </div>

            <ul className="space-y-0.5">
              {letters.map((letter) => (
                <li key={letter.id}>
                  <button type="button" className="dash-letter" data-unread={letter.unread}>
                    <span className="dash-letter__from">{letter.from}</span>
                    <span className="dash-letter__text">{letter.text}</span>
                    <span className="dash-letter__when">{letter.when}</span>
                  </button>
                </li>
              ))}
            </ul>

            <a href="#owl" onClick={() => setOpen(false)} className="dash-pop__more">
              View all →
            </a>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

function ProfileMenu({ name, initial, photo, house }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="dash-profile"
      >
        <span className="dash-avatar" aria-hidden="true">
          {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" /> : initial}
        </span>
        <span className="hidden text-left sm:block">
          <span className="dash-profile__name">{name}</span>
          <span className="dash-profile__house">{house}</span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div {...POP} role="menu" className="dash-pop">
            <NavLink to="/character" role="menuitem" onClick={() => setOpen(false)} className="dash-pop__item">
              <Icon name="user" /> Wizard Profile
            </NavLink>
            <NavLink to="/achievements" role="menuitem" onClick={() => setOpen(false)} className="dash-pop__item">
              <Icon name="medal" /> Achievements
            </NavLink>
            <NavLink to="/keep" role="menuitem" onClick={() => setOpen(false)} className="dash-pop__item">
              <Icon name="gear" /> Settings
            </NavLink>
            <div className="dash-pop__rule" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
                navigate('/');
              }}
              className="dash-pop__item dash-pop__item--danger"
            >
              <Icon name="logout" /> Log out
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

function ArchiveSearch() {
  const [query, setQuery] = useState('');
  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      className="dash-search"
    >
      <Icon name="search" className="h-4 w-4 shrink-0 opacity-70" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the Archives"
        aria-label="Search the Archives"
      />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                    */
/* -------------------------------------------------------------------------- */

function SidebarNav({ collapsed, onNavigate }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav aria-label="Dashboard" className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed ? <p className="dash-sidebar__label">{section.label}</p> : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `dash-navitem ${isActive && !item.to.includes('#') ? 'is-active' : ''}`
                    }
                  >
                    <Icon name={item.icon} />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[rgb(var(--dash-line))] px-3 py-3">
        <NavLink to="/keep" onClick={onNavigate} className="dash-navitem" title={collapsed ? 'Help' : undefined}>
          <Icon name="help" />
          {!collapsed ? <span>Help</span> : null}
        </NavLink>
        <button
          type="button"
          onClick={() => {
            signOut();
            navigate('/');
          }}
          className="dash-navitem dash-navitem--danger w-full"
          title={collapsed ? 'Log out' : undefined}
        >
          <Icon name="logout" />
          {!collapsed ? <span>Log out</span> : null}
        </button>
      </div>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

export function DashboardShell({ children }) {
  const { character } = useGame();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const name = character?.displayName ?? 'Witch or Wizard';
  const initial = name.trim().charAt(0).toUpperCase();
  const house = character?.characterClass ? HOUSE_LABEL[character.characterClass] : 'Unsorted';

  // A drawer left open behind a navigation is a classic phone annoyance.
  useEffect(() => {
    if (!drawer) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [drawer]);

  return (
    <div className="dash" data-collapsed={collapsed}>
      <DashAtmosphere />

      <header className="dash-nav">
        <button
          type="button"
          className="dash-iconbtn dash-iconbtn--drawer"
          onClick={() => setDrawer(true)}
          aria-label="Open navigation"
        >
          <Icon name="menu" />
        </button>

        <button
          type="button"
          className="dash-iconbtn dash-iconbtn--rail"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
        >
          <Icon name="menu" />
        </button>

        <NavLink to="/dashboard" className="dash-brand" aria-label="Wizarding Archives">
          <Crest id="dash-crest" className="h-6 w-6" />
          <span>Wizarding Archives</span>
        </NavLink>

        <ArchiveSearch />

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <OwlPostButton />
          <ProfileMenu name={name} initial={initial} photo={character?.photoURL} house={house} />
        </div>
      </header>

      <div className="dash-body">
        <aside className="dash-sidebar" aria-label="Dashboard navigation">
          <SidebarNav collapsed={collapsed} />
        </aside>

        {/* Drawer, for anything narrower than a laptop. */}
        <AnimatePresence>
          {drawer ? (
            <>
              <motion.div
                className="dash-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawer(false)}
                aria-hidden="true"
              />
              <motion.aside
                className="dash-drawer"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 420, damping: 40 }}
                aria-label="Dashboard navigation"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="dash-brand">
                    <Crest id="drawer-crest" className="h-6 w-6" />
                    <span>Wizarding Archives</span>
                  </span>
                  <button
                    type="button"
                    className="dash-iconbtn"
                    onClick={() => setDrawer(false)}
                    aria-label="Close navigation"
                  >
                    <Icon name="close" />
                  </button>
                </div>
                <SidebarNav collapsed={false} onNavigate={() => setDrawer(false)} />
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <main id="dash-main" className="dash-main">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Class ids are the stored value; these are what a player should read. */
export const HOUSE_LABEL = {
  warrior: 'Gryffindor',
  scholar: 'Ravenclaw',
  explorer: 'Slytherin',
  guardian: 'Hufflepuff',
};
