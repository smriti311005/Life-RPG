import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { HeroPanel } from '../components/HeroPanel';
import { QuestCard } from '../components/QuestCard';
import { QuestComposer } from '../components/QuestComposer';
import { EmptyState, Modal, Skeleton } from '../components/Primitives';
import { ATTRIBUTES, STARTER_QUESTS } from '../lib/game';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still awake';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function TodayPulse({ character, tasks, openCount, doneToday }) {
  const total = tasks.length;
  const completionRate = total ? Math.round((doneToday / total) * 100) : 0;
  const nextLevel = character?.xpToNext ? Math.round((character.xp / character.xpToNext) * 100) : 0;
  const activeAttributes = character?.attributes?.filter((attribute) =>
    tasks.some((task) => task.attribute === attribute.id && task.status !== 'done'),
  ) ?? [];

  return (
    <section aria-label="Today at a glance" className="mb-6 grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
      <div className="panel bg-aurora p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-primary">Today at a glance</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Make the next move count.</h2>
          </div>
          <span className="chip border-primary/30 text-primary">{completionRate}% complete</span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-void/60" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${completionRate}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted">{doneToday} of {total} quests cleared today.</p>
      </div>

      <div className="panel p-5">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-faint">Next level</p>
        <p className="mt-3 numeric text-3xl font-semibold text-ink">{nextLevel}%</p>
        <p className="mt-1 text-sm text-muted">{character ? Math.max(0, character.xpToNext - character.xp).toLocaleString() : 0} XP remaining</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-void/60">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${nextLevel}%` }} />
        </div>
      </div>

      <div className="panel p-5">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-faint">Streak energy</p>
        <p className="mt-3 numeric text-3xl font-semibold text-ink">{character?.streak.current ?? 0} days</p>
        <p className="mt-1 text-sm text-muted">{character?.streak.multiplier?.toFixed(2) ?? '1.00'}x reward multiplier</p>
        <p className="mt-4 text-xs font-medium text-primary">{openCount ? 'One clear quest at a time.' : 'Your board is clear.'}</p>
      </div>

      <div className="panel p-5">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-faint">Attributes in play</p>
        {activeAttributes.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeAttributes.map((attribute) => (
              <span key={attribute.id} className="chip" style={{ borderColor: `var(--attr-${attribute.id})`, color: `var(--attr-${attribute.id})` }}>
                <span aria-hidden="true">{attribute.glyph}</span> {attribute.short}
              </span>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-muted">Complete a quest to train an attribute.</p>}
        <p className="mt-4 text-xs text-faint">Your real-world actions shape this sheet.</p>
      </div>
    </section>
  );
}

export default function Quests() {
  const {
    character, tasks, today, status, loadError, reload,
    createTask, updateTask, deleteTask, completeTask, undoTask,
    floaters, dismissFloater, isNewCharacter, dismissOnboarding,
  } = useGame();
  const toast = useToast();

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filter, setFilter] = useState('all');
  const [attrFilter, setAttrFilter] = useState('all');

  const loading = status === 'loading' || status === 'idle';

  const isDone = (task) =>
    task.cadence === 'daily' ? task.lastCompletedDay === today : task.status === 'done';

  const visible = useMemo(() => {
    let list = tasks;

    if (attrFilter !== 'all') list = list.filter((t) => t.attribute === attrFilter);

    if (filter === 'open') list = list.filter((t) => !isDone(t));
    else if (filter === 'done') list = list.filter(isDone);
    else if (filter === 'today') list = list.filter((t) => t.cadence === 'daily');

    // Open quests rise to the top; completed ones settle underneath.
    return [...list].sort((a, b) => Number(isDone(a)) - Number(isDone(b)));
  }, [tasks, filter, attrFilter, today]);

  const openCount = tasks.filter((t) => !isDone(t)).length;
  const doneToday = tasks.filter(isDone).length;

  /* ------------------------------- handlers ------------------------------- */

  const handleComplete = async (task) => {
    try {
      const result = await completeTask(task.id);
      if (result && !result.reward.leveledUp && !result.reward.streak.milestone) {
        toast.success(`${task.title} — +${result.reward.xp} XP, +${result.reward.gold} gold.`, {
          duration: 2600,
        });
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleUndo = async (task) => {
    try {
      await undoTask(task.id);
      toast.info('Completion undone. The rewards were returned.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmit = async (form) => {
    if (editing) {
      await updateTask(editing.id, form);
      toast.success('Quest updated.');
      setEditing(null);
    } else {
      await createTask(form);
      toast.success('Quest posted to your log.');
    }
  };

  const handleDelete = async () => {
    const task = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteTask(task.id);
      toast.info(`"${task.title}" was struck from the log.`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  /* --------------------------------- error -------------------------------- */

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-md py-20">
        <EmptyState
          glyph="⚠"
          title="The keep is not answering"
          action={
            <button type="button" className="btn-primary" onClick={reload}>
              Try again
            </button>
          }
        >
          {loadError ?? 'Something went wrong loading your character.'}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <TodayPulse character={character} tasks={tasks} openCount={openCount} doneToday={doneToday} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-20">
        <HeroPanel character={character} loading={loading} />
      </div>

      <section aria-labelledby="quests-heading" className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-faint">
              {greeting()}
              {character ? `, ${character.displayName.split(' ')[0]}` : ''}
            </p>
            <h2 id="quests-heading" className="mt-0.5 text-xl font-semibold text-ink">
              Quest log
            </h2>
            {!loading ? (
              <p className="mt-1 text-sm text-muted">
                {openCount === 0 && tasks.length > 0
                  ? 'Every quest is done. The day is yours.'
                  : `${openCount} open · ${doneToday} completed`}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setComposerOpen(true);
            }}
          >
            <span aria-hidden="true">+</span> New quest
          </button>
        </div>

        {/* Filters */}
        {tasks.length > 0 ? (
          <div className="mb-4 space-y-2">
            <div
              role="group"
              aria-label="Filter by state"
              className="flex flex-wrap gap-1.5"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`chip transition-colors ${
                    filter === f.id
                      ? 'border-primary/60 bg-primary/12 text-primary'
                      : 'hover:text-ink'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="Filter by attribute"
              className="flex flex-wrap gap-1.5"
            >
              <button
                type="button"
                aria-pressed={attrFilter === 'all'}
                onClick={() => setAttrFilter('all')}
                className={`chip transition-colors ${
                  attrFilter === 'all' ? 'border-primary/60 text-primary' : 'hover:text-ink'
                }`}
              >
                Every attribute
              </button>
              {ATTRIBUTES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={attrFilter === a.id}
                  onClick={() => setAttrFilter(attrFilter === a.id ? 'all' : a.id)}
                  className={`chip transition-colors ${
                    attrFilter === a.id ? 'border-primary/60 text-primary' : 'hover:text-ink'
                  }`}
                >
                  <span aria-hidden="true">{a.glyph}</span> {a.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Board */}
        {loading ? (
          <ul className="space-y-2.5" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-[104px] rounded-card" />
              </li>
            ))}
          </ul>
        ) : tasks.length === 0 ? (
          <EmptyState
            glyph="⚔"
            title="Your log is empty"
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => setComposerOpen(true)}
              >
                Post your first quest
              </button>
            }
          >
            Start with something small enough that you will actually do it today. The
            levelling curve rewards showing up more than it rewards heroics.
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState glyph="◌" title="Nothing matches that filter">
            Try a different filter, or clear it to see the whole log.
          </EmptyState>
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((task) => (
                <QuestCard
                  key={task.id}
                  task={task}
                  today={today}
                  floater={floaters.find((f) => f.taskId === task.id)}
                  onFloaterDone={dismissFloater}
                  onComplete={handleComplete}
                  onUndo={handleUndo}
                  onEdit={(t) => {
                    setEditing(t);
                    setComposerOpen(true);
                  }}
                  onDelete={setConfirmDelete}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      </div>

      {/* Composer */}
      <QuestComposer
        open={composerOpen}
        editing={editing}
        suggestions={tasks.length === 0 ? STARTER_QUESTS : []}
        onClose={() => {
          setComposerOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      {/* Delete confirmation — a destructive action should never be one click */}
      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Strike this quest from the log?"
        description="The XP and gold you already earned from it are yours to keep. The quest itself is gone for good."
        size="max-w-md"
      >
        <p className="rounded-xl border border-line bg-void/50 px-3.5 py-3 text-sm text-ink">
          {confirmDelete?.title}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(null)}>
            Keep it
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="btn border border-danger/50 bg-danger/15 text-danger hover:bg-danger/25"
          >
            Delete quest
          </button>
        </div>
      </Modal>

      {/* First-run welcome */}
      <Modal
        open={isNewCharacter && status === 'ready'}
        onClose={dismissOnboarding}
        title="Your character is rolled"
        description="Here is the whole game in four lines."
        size="max-w-md"
      >
        <ul className="space-y-3 text-sm text-muted">
          {[
            ['⚔', 'Post quests for things you actually mean to do. Each one names an attribute it trains.'],
            ['★', 'Completing a quest pays XP and gold. Levels get more expensive as you climb.'],
            ['🔥', 'Finish something every day to build a streak — it multiplies every reward you earn.'],
            ['◉', 'Spend gold in the Emporium on themes, titles and badges for your keep.'],
          ].map(([glyph, text]) => (
            <li key={text} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 text-primary">
                {glyph}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <motion.button
          type="button"
          className="btn-primary mt-6 w-full"
          onClick={() => {
            dismissOnboarding();
            setComposerOpen(true);
          }}
          whileTap={{ scale: 0.97 }}
        >
          Post my first quest
        </motion.button>
      </Modal>
    </div>
  );
}
