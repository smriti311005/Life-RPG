import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { api, ApiError } from '../lib/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const GameContext = createContext(null);

const THEME_KEY = 'liferpg:theme';
const MOTION_KEY = 'liferpg:reduced-motion';
const MODE_KEY = 'liferpg:mode';

/** localStorage is unavailable in some privacy modes; never let that throw. */
const safeStore = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};

export function GameProvider({ children }) {
  const { user, checking } = useAuth();
  const toast = useToast();

  const [character, setCharacter] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [today, setToday] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [isNewCharacter, setIsNewCharacter] = useState(false);

  /** Queue of celebrations for the overlay to play through. */
  const [celebration, setCelebration] = useState(null);
  /** Transient `+XP` numbers keyed by task id, for the floating rewards. */
  const [floaters, setFloaters] = useState([]);
  /** Achievements unlocked but not yet shown. */
  const [unlockedQueue, setUnlockedQueue] = useState([]);

  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  // Guards against a late response from a previous account overwriting state.
  const loadToken = useRef(0);

  /* ----------------------------- theme plumbing ---------------------------- */

  const applyTheme = useCallback((theme) => {
    if (!theme) return;
    document.documentElement.setAttribute('data-theme', theme);
    safeStore.set(THEME_KEY, theme);
  }, []);

  /**
   * Light / dark / system.
   *
   * "system" removes the attribute entirely rather than writing a value, so the
   * `prefers-color-scheme` media query in the stylesheet is what decides — and
   * the page keeps following the OS if it changes while the tab is open.
   */
  const applyMode = useCallback((mode) => {
    const root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-mode', mode);
    else root.removeAttribute('data-mode');
    safeStore.set(MODE_KEY, mode ?? 'system');
  }, []);

  const applyMotion = useCallback((reduced) => {
    const root = document.documentElement;
    if (reduced) root.setAttribute('data-motion', 'reduced');
    else root.removeAttribute('data-motion');
    safeStore.set(MOTION_KEY, String(Boolean(reduced)));
  }, []);

  useEffect(() => {
    if (character?.equipped?.theme) applyTheme(character.equipped.theme);
    if (character?.settings) {
      applyMotion(character.settings.reducedMotion);
      applyMode(character.settings.mode ?? 'system');
    }
  }, [
    character?.equipped?.theme,
    character?.settings?.reducedMotion,
    character?.settings?.mode,
    applyTheme,
    applyMotion,
    applyMode,
  ]);

  /* ------------------------------ connectivity ----------------------------- */

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      toast.success('Back online. Syncing your progress.');
    };
    const goOffline = () => {
      setOnline(false);
      toast.error('You are offline. Changes will not be saved until you reconnect.', {
        duration: 8000,
      });
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [toast]);

  /* --------------------------------- loading -------------------------------- */

  const load = useCallback(async () => {
    const token = ++loadToken.current;
    setStatus('loading');
    setLoadError(null);

    try {
      const sync = await api.sync({ timezoneOffset: new Date().getTimezoneOffset() });
      if (token !== loadToken.current) return;

      const board = await api.listTasks('active');
      if (token !== loadToken.current) return;

      setCharacter(sync.character);
      setIsNewCharacter(sync.isNewCharacter);
      setToday(board.today ?? sync.today);
      setTasks(board.tasks);
      setStatus('ready');
    } catch (error) {
      if (token !== loadToken.current) return;
      setLoadError(error.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (checking) return;

    if (!user) {
      loadToken.current += 1; // cancel anything in flight for the old account
      setCharacter(null);
      setTasks([]);
      setStatus('idle');
      setIsNewCharacter(false);
      return;
    }

    load();
  }, [user, checking, load]);

  /* ------------------------------- task writes ------------------------------ */

  const createTask = useCallback(
    async (input) => {
      // Optimistic insert: the card appears the instant the form is submitted.
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        ...input,
        notes: input.notes ?? '',
        difficulty: input.difficulty ?? 'normal',
        cadence: input.cadence ?? 'once',
        status: 'active',
        lastCompletedDay: null,
        completionCount: 0,
        pending: true,
        createdAt: new Date().toISOString(),
      };
      setTasks((list) => [optimistic, ...list]);

      try {
        const { task } = await api.createTask(input);
        setTasks((list) => list.map((t) => (t.id === tempId ? task : t)));
        return task;
      } catch (error) {
        setTasks((list) => list.filter((t) => t.id !== tempId));
        throw error;
      }
    },
    [],
  );

  const updateTask = useCallback(
    async (id, patch) => {
      const before = tasks.find((t) => t.id === id);
      setTasks((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));

      try {
        const { task } = await api.updateTask(id, patch);
        setTasks((list) => list.map((t) => (t.id === id ? task : t)));
        return task;
      } catch (error) {
        if (before) setTasks((list) => list.map((t) => (t.id === id ? before : t)));
        throw error;
      }
    },
    [tasks],
  );

  const deleteTask = useCallback(
    async (id) => {
      const before = tasks;
      const index = tasks.findIndex((t) => t.id === id);
      setTasks((list) => list.filter((t) => t.id !== id));

      try {
        await api.deleteTask(id);
      } catch (error) {
        setTasks(before); // put it back exactly where it was
        throw error;
      }
      return index;
    },
    [tasks],
  );

  /* ------------------------------- completion ------------------------------- */

  const completeTask = useCallback(
    async (id) => {
      const before = tasks.find((t) => t.id === id);
      if (!before || before.pending) return null;

      const beforeCharacter = character;

      /* Optimistic: mark the quest done immediately. The XP number is the
       * server's to decide, so the bar is left alone until it answers — the
       * card state is what the player is actually watching. */
      setTasks((list) =>
        list.map((t) =>
          t.id === id
            ? {
                ...t,
                pending: true,
                lastCompletedDay: today,
                status: t.cadence === 'once' ? 'done' : t.status,
              }
            : t,
        ),
      );

      try {
        const result = await api.completeTask(id);

        setCharacter(result.character);
        setTasks((list) =>
          list.map((t) => (t.id === id ? { ...result.task, pending: false } : t)),
        );

        setFloaters((list) => [
          ...list,
          { key: `${id}-${Date.now()}`, taskId: id, xp: result.reward.xp, gold: result.reward.gold },
        ]);

        if (result.reward.leveledUp || result.reward.streak.milestone) {
          setCelebration({ ...result.reward, at: Date.now() });
        }

        /* Achievements are queued separately: a completion can level you up
         * *and* unlock two badges, and stacking those into one overlay would
         * bury the thing the player actually did. */
        if (result.achievementsUnlocked?.length) {
          setUnlockedQueue((queue) => [...queue, ...result.achievementsUnlocked]);
        }

        return result;
      } catch (error) {
        setTasks((list) => list.map((t) => (t.id === id ? before : t)));
        if (beforeCharacter) setCharacter(beforeCharacter);
        throw error;
      }
    },
    [tasks, character, today],
  );

  const undoTask = useCallback(
    async (id) => {
      const before = tasks.find((t) => t.id === id);
      const beforeCharacter = character;

      setTasks((list) => list.map((t) => (t.id === id ? { ...t, pending: true } : t)));

      try {
        const result = await api.undoTask(id);
        setCharacter(result.character);
        setTasks((list) =>
          list.map((t) => (t.id === id ? { ...result.task, pending: false } : t)),
        );
        return result;
      } catch (error) {
        if (before) setTasks((list) => list.map((t) => (t.id === id ? before : t)));
        if (beforeCharacter) setCharacter(beforeCharacter);
        throw error;
      }
    },
    [tasks, character],
  );

  const dismissFloater = useCallback((key) => {
    setFloaters((list) => list.filter((f) => f.key !== key));
  }, []);

  /* --------------------------------- profile -------------------------------- */

  const updateProfile = useCallback(async (patch) => {
    // Theme, mode and motion switches are applied before the request so the UI
    // answers the click instantly; the server confirms a beat later.
    if (patch.equip?.theme) applyTheme(patch.equip.theme);
    if (typeof patch.reducedMotion === 'boolean') applyMotion(patch.reducedMotion);
    if (patch.mode) applyMode(patch.mode);

    const { character: next } = await api.updateMe(patch);
    setCharacter(next);
    return next;
  }, [applyTheme, applyMotion, applyMode]);

  const refreshCharacter = useCallback(async () => {
    const { character: next } = await api.me();
    setCharacter(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({
      character,
      tasks,
      today,
      status,
      loadError,
      online,
      isNewCharacter,
      dismissOnboarding: () => setIsNewCharacter(false),

      celebration,
      clearCelebration: () => setCelebration(null),
      unlockedQueue,
      shiftUnlocked: () => setUnlockedQueue((queue) => queue.slice(1)),
      floaters,
      dismissFloater,

      reload: load,
      createTask,
      updateTask,
      deleteTask,
      completeTask,
      undoTask,
      updateProfile,
      refreshCharacter,
      setCharacter,
      applyTheme,
      applyMode,
    }),
    [
      character, tasks, today, status, loadError, online, isNewCharacter,
      celebration, unlockedQueue, floaters, dismissFloater, load, createTask, updateTask,
      deleteTask, completeTask, undoTask, updateProfile, refreshCharacter, applyTheme,
      applyMode,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>.');
  return ctx;
}

export { ApiError };
