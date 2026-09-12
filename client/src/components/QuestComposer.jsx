import { useEffect, useId, useState } from 'react';

import { Modal, TextField } from './Primitives';
import { ATTRIBUTES, DIFFICULTIES, CADENCES, attrColor } from '../lib/game';

const BLANK = { title: '', notes: '', attribute: 'intelligence', difficulty: 'normal', cadence: 'once' };

/**
 * A segmented radio group that looks like a set of chips.
 *
 * Built on real radio inputs so arrow keys move between options and screen
 * readers announce "2 of 5" — behaviour a div-with-onClick would throw away.
 */
function ChipGroup({ legend, name, options, value, onChange, columns = 'grid-cols-3' }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className={`grid gap-1.5 ${columns}`}>
        {options.map((option) => {
          const selected = value === option.id;
          const tint = option.hue !== undefined ? attrColor(option.id) : 'rgb(var(--c-primary))';

          return (
            <label
              key={option.id}
              className={`relative flex cursor-pointer flex-col gap-0.5 rounded-xl border px-2.5 py-2 text-center transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                selected
                  ? 'border-transparent'
                  : 'border-line bg-void/40 hover:border-primary/40 hover:bg-raised/60'
              }`}
              style={
                selected
                  ? {
                      background: `color-mix(in srgb, ${tint} 16%, transparent)`,
                      boxShadow: `inset 0 0 0 1px ${tint}`,
                    }
                  : undefined
              }
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
                className="sr-only"
              />
              {option.glyph ? (
                <span aria-hidden="true" className="text-sm" style={{ color: tint }}>
                  {option.glyph}
                </span>
              ) : null}
              <span
                className="text-xs font-semibold leading-tight"
                style={{ color: selected ? tint : 'rgb(var(--c-ink))' }}
              >
                {option.name}
              </span>
              {option.sub ? (
                <span className="numeric text-[0.62rem] leading-tight text-faint">
                  {option.sub}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function QuestComposer({ open, onClose, onSubmit, editing, suggestions = [] }) {
  const id = useId();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError(null);
    setForm(
      editing
        ? {
            title: editing.title,
            notes: editing.notes ?? '',
            attribute: editing.attribute,
            difficulty: editing.difficulty,
            cadence: editing.cadence,
          }
        : BLANK,
    );
  }, [open, editing]);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const title = form.title.trim();
    if (!title) {
      setErrors({ title: 'Give the quest a name.' });
      document.getElementById(`${id}-title`)?.focus();
      return;
    }
    if (title.length > 120) {
      setErrors({ title: 'Keep it under 120 characters.' });
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      await onSubmit({ ...form, title, notes: form.notes.trim() });
      onClose();
    } catch (error) {
      // Field-level messages from the server land on the right inputs; anything
      // else shows as a form-level banner rather than vanishing into a toast.
      if (error.details) setErrors(error.details);
      else setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const preview = DIFFICULTIES.find((d) => d.id === form.difficulty) ?? DIFFICULTIES[2];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit quest' : 'Post a new quest'}
      description={
        editing
          ? 'Changes apply from your next completion.'
          : 'Name the thing, choose what it trains, and how hard it is.'
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError ? (
          <div
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
          >
            {formError}
          </div>
        ) : null}

        <TextField
          id={`${id}-title`}
          label="Quest"
          placeholder="Run 5k before sunrise"
          value={form.title}
          onChange={(e) => set('title')(e.target.value)}
          error={errors.title}
          maxLength={140}
          autoComplete="off"
          required
        />

        {!editing && suggestions.length ? (
          <div>
            <p className="label">Or start from one of these</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setForm({ ...BLANK, ...s, notes: '' })}
                  className="chip border-line hover:border-primary/60 hover:text-ink"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <ChipGroup
          legend="Trains"
          name={`${id}-attribute`}
          value={form.attribute}
          onChange={set('attribute')}
          columns="grid-cols-3 sm:grid-cols-6"
          options={ATTRIBUTES.map((a) => ({ id: a.id, name: a.name, glyph: a.glyph, hue: a.hue }))}
        />

        <ChipGroup
          legend="Difficulty"
          name={`${id}-difficulty`}
          value={form.difficulty}
          onChange={set('difficulty')}
          columns="grid-cols-3 sm:grid-cols-5"
          options={DIFFICULTIES.map((d) => ({
            id: d.id,
            name: d.name,
            sub: `${d.xp} XP`,
          }))}
        />

        <ChipGroup
          legend="Cadence"
          name={`${id}-cadence`}
          value={form.cadence}
          onChange={set('cadence')}
          columns="grid-cols-2"
          options={CADENCES.map((c) => ({ id: c.id, name: c.name }))}
        />

        <p className="-mt-1 text-2xs text-faint">
          {CADENCES.find((c) => c.id === form.cadence)?.hint}
        </p>

        <TextField
          id={`${id}-notes`}
          as="textarea"
          label="Notes (optional)"
          placeholder="Anything that makes it easier to start."
          value={form.notes}
          onChange={(e) => set('notes')(e.target.value)}
          error={errors.notes}
          maxLength={500}
          hint={`${form.notes.length}/500`}
        />

        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-void/40 px-3.5 py-2.5">
          <span className="text-2xs uppercase tracking-wider text-faint">Base reward</span>
          <span className="numeric text-sm font-semibold text-ink">
            +{preview.xp} XP <span className="text-faint">·</span>{' '}
            <span className="text-accent">+{preview.gold} ◉</span>
          </span>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Post quest'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
