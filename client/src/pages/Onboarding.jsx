import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { api } from '../lib/api';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { LoadingVeil } from '../components/Primitives';
import { CLASSES, ATTRIBUTE_MAP, attrColor } from '../lib/game';
import { CinemaBackdrop } from '../components/CinemaBackdrop';

const STEPS = ['Class', 'Focus', 'Ready'];

/* -------------------------------------------------------------------------- */
/* Progress rail                                                              */
/* -------------------------------------------------------------------------- */

function Rail({ step }) {
  return (
    <ol className="mb-10 flex items-center justify-center gap-2" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo';
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={state === 'current' ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-2xs font-semibold uppercase tracking-wider transition-colors shadow-sm ${
                state === 'todo'
                  ? 'border-line bg-surface/90 text-muted backdrop-blur-md'
                  : 'border-primary/80 bg-surface text-primary backdrop-blur-md font-bold ring-1 ring-primary/30'
              }`}
            >
              <span aria-hidden="true" className={state === 'done' ? 'text-success font-bold' : ''}>
                {state === 'done' ? '✓' : i + 1}
              </span>
              {label}
            </span>
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className={`h-0.5 w-6 rounded ${i < step ? 'bg-primary/80' : 'bg-line/90'}`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — class                                                             */
/* -------------------------------------------------------------------------- */

function ClassStep({ value, onChange, onNext }) {
  return (
    <div>
      <h1 className="spellcast text-center text-3xl font-bold text-ink">The Sorting</h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted font-medium leading-relaxed">
        Your house grants a permanent <strong className="text-ink font-semibold">+25% affinity</strong> in one
        discipline, and two free levels in it to start. Choose the one that matches what you
        actually want to become — the Hat does not offer second thoughts.
      </p>

      <fieldset className="mt-8">
        <legend className="sr-only">Your Hogwarts house</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {CLASSES.map((klass) => {
            const selected = value === klass.id;
            const color = attrColor(klass.focus);
            const attribute = ATTRIBUTE_MAP[klass.focus];

            return (
              <label
                key={klass.id}
                className={`panel-raised relative cursor-pointer p-5 transition-all shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                  selected ? 'border-transparent shadow-lg' : 'hover:border-primary/40'
                }`}
                style={
                  selected
                    ? {
                        background: `color-mix(in srgb, ${color} 14%, rgb(var(--c-surface)))`,
                        boxShadow: `inset 0 0 0 2px ${color}, 0 18px 40px -24px ${color}`,
                      }
                    : undefined
                }
              >
                <input
                  type="radio"
                  name="characterClass"
                  value={klass.id}
                  checked={selected}
                  onChange={() => onChange(klass.id)}
                  className="sr-only"
                />

                <div className="flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl shadow-sm"
                    style={{
                      color,
                      background: `color-mix(in srgb, ${color} 18%, rgb(var(--c-surface)))`,
                      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                    }}
                  >
                    {klass.glyph}
                  </span>

                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold text-ink">{klass.name}</h2>
                    <p className="text-2xs font-semibold uppercase tracking-wider" style={{ color }}>
                      {attribute.name} · {attribute.short}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted font-medium">{klass.blurb}</p>
                  </div>
                </div>

                {selected ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-4 top-4 text-sm font-bold"
                    style={{ color }}
                  >
                    ✓
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8 flex justify-center">
        <button type="button" className="btn-primary px-8 py-3 shadow-md" disabled={!value} onClick={onNext}>
          {value ? 'Continue' : 'Choose a class to continue'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 — focus areas                                                       */
/* -------------------------------------------------------------------------- */

function FocusStep({ areas, value, onToggle, onNext, onBack }) {
  return (
    <div>
      <h1 className="text-center font-display text-3xl font-bold text-ink">What do you want to improve?</h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted font-medium leading-relaxed">
        Each one you pick drops a couple of starter quests into your log, so you open the app
        to a board with something on it. Edit or delete them freely — nothing here is fixed.
      </p>

      <fieldset className="mt-8">
        <legend className="sr-only">Focus areas</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((area) => {
            const selected = value.includes(area.id);
            const color = attrColor(area.attribute);

            return (
              <label
                key={area.id}
                className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition-all shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                  selected
                    ? 'border-transparent shadow-md'
                    : 'border-line bg-surface/95 hover:border-primary/50 hover:bg-raised'
                }`}
                style={
                  selected
                    ? {
                        background: `color-mix(in srgb, ${color} 16%, rgb(var(--c-surface)))`,
                        boxShadow: `inset 0 0 0 1.5px ${color}, 0 10px 24px -10px ${color}`,
                      }
                    : undefined
                }
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(area.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-base shadow-sm"
                  style={{
                    color,
                    background: `color-mix(in srgb, ${color} 18%, rgb(var(--c-surface)))`,
                    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                  }}
                >
                  {selected ? '✓' : area.glyph}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink leading-tight">{area.name}</span>
                  <span className="block text-2xs font-medium text-muted mt-0.5">{area.attributeName}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="mt-5 text-center text-xs font-semibold text-muted">
        {value.length === 0
          ? 'You can skip this and start with an empty log.'
          : `${value.length} selected`}
      </p>

      <div className="mt-7 flex justify-center gap-3">
        <button type="button" className="btn-ghost px-6 py-2.5 shadow-xs" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-primary px-8 py-2.5 shadow-md" onClick={onNext}>
          {value.length === 0 ? 'Skip' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 3 — reveal                                                            */
/* -------------------------------------------------------------------------- */

function ReadyStep({ klass, focusCount, onEnter, busy, error, onBack }) {
  const color = attrColor(klass.focus);
  const attribute = ATTRIBUTE_MAP[klass.focus];

  return (
    <div className="text-center">
      <h1 className="font-display text-3xl font-bold">Your character is ready</h1>

      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="relative mx-auto mt-8 w-full max-w-sm"
      >
        <div className="panel bg-surface/95 px-6 py-9 shadow-xl border-line">
          <span
            aria-hidden="true"
            className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl border text-3xl shadow-sm"
            style={{
              borderColor: color,
              color,
              background: `color-mix(in srgb, ${color} 16%, rgb(var(--c-surface)))`,
            }}
          >
            {klass.glyph}
          </span>

          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-primary">
            {klass.name}
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">Level 1</p>

          <div className="mx-auto mt-4 h-2.5 w-40 overflow-hidden rounded-full bg-raised ring-1 ring-inset ring-line">
            <div className="h-full w-0 rounded-full bg-gradient-to-r from-primary to-accent" />
          </div>
          <p className="numeric mt-2 text-2xs font-medium text-muted">0 / 55 XP</p>

          <div className="mt-6 space-y-1.5 text-xs font-medium text-muted">
            <p>
              <span className="font-semibold" style={{ color }}>{attribute.name}</span> starts at level 3
            </p>
            <p>
              +25% <span className="font-semibold" style={{ color }}>{attribute.short}</span> on every quest that trains it
            </p>
            {focusCount > 0 ? <p>{focusCount} focus areas ready to seed your log</p> : null}
          </div>
        </div>
      </motion.div>

      {error ? (
        <p
          role="alert"
          className="mx-auto mt-5 max-w-sm rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex justify-center gap-3">
        <button type="button" className="btn-ghost px-6 py-2.5 shadow-sm" onClick={onBack} disabled={busy}>
          Back
        </button>
        <button type="button" className="btn-primary px-8 py-3 text-base shadow-md" onClick={onEnter} disabled={busy}>
          {busy ? 'Rolling…' : 'Enter the world'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Onboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const { setCharacter, reload } = useGame();

  const [step, setStep] = useState(0);
  const [areas, setAreas] = useState(null);
  const [chosenClass, setChosenClass] = useState(null);
  const [focus, setFocus] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .onboardingOptions()
      .then((data) => {
        setAreas(data.focusAreas);
        // Someone who already has a class should never see this flow again.
        if (!data.needsOnboarding) navigate('/play', { replace: true });
      })
      .catch((err) => setError(err.message));
  }, [navigate]);

  const toggleFocus = (id) =>
    setFocus((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.completeOnboarding({
        characterClass: chosenClass,
        focusAreas: focus,
      });
      setCharacter(result.character);
      await reload();
      toast.success(
        result.questsCreated
          ? `Character created. ${result.questsCreated} quests are waiting in your log.`
          : 'Character created. Your log is empty — post your first quest.',
      );
      navigate('/play', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (!areas && !error) return <LoadingVeil label="Preparing the ritual" />;

  const klass = CLASSES.find((c) => c.id === chosenClass);

  return (
    <>
      {/* Character creation is the ritual at the gate — it keeps the sharp cut. */}
      <CinemaBackdrop variant="wide" candles />

      <div className="above-film stage min-h-[100dvh] px-4 py-10 sm:py-16">
        <div className="gate-in relative mx-auto max-w-3xl">
          <Rail step={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22 }}
            >
              {step === 0 ? (
                <ClassStep
                  value={chosenClass}
                  onChange={setChosenClass}
                  onNext={() => setStep(1)}
                />
              ) : null}

              {step === 1 ? (
                <FocusStep
                  areas={areas ?? []}
                  value={focus}
                  onToggle={toggleFocus}
                  onNext={() => setStep(2)}
                  onBack={() => setStep(0)}
                />
              ) : null}

              {step === 2 && klass ? (
                <ReadyStep
                  klass={klass}
                  focusCount={focus.length}
                  onEnter={submit}
                  busy={busy}
                  error={error}
                  onBack={() => setStep(1)}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {error && step !== 2 ? (
            <p role="alert" className="mt-6 text-center text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
