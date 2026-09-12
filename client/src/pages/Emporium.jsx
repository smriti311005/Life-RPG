import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { api } from '../lib/api';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { EmptyState, Skeleton } from '../components/Primitives';
import { fmt } from '../lib/game';

const SECTIONS = [
  {
    kind: 'theme',
    title: 'Palettes',
    blurb:
      'Re-skin the whole keep. Each comes in both light and dark — the swatches show the dark set.',
  },
  { kind: 'title', title: 'Titles', blurb: 'Worn under your name.' },
  { kind: 'badge', title: 'Badges', blurb: 'A small mark beside your name.' },
  {
    kind: 'consumable',
    title: 'Provisions',
    blurb: 'Bought in stacks, spent when you invoke them.',
  },
];

/* Preview swatches so a palette is judged before it is bought. Ground, primary
 * and accent from each palette's dark set — the blurb says so, and mixing one
 * light row in among four dark ones would misrepresent it. */
const THEME_SWATCHES = {
  obsidian: ['#09070f', '#a782ff', '#f0c26a'],
  emberfall: ['#120906', '#ff8a4c', '#ffd08a'],
  tidewatch: ['#040f19', '#4cc9f0', '#8fe3d0'],
  verdant: ['#07100b', '#6ee7a8', '#d9f99d'],
  goldleaf: ['#16110a', '#e2b260', '#f0d28c'],
};

function ItemCard({ item, gold, onBuy, onUse, onEquip, equipped, busy }) {
  const swatches = item.payload?.theme ? THEME_SWATCHES[item.payload.theme] : null;
  const shortfall = item.price - gold;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className={`panel-raised flex flex-col p-4 transition-colors ${
        equipped ? 'border-primary/50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">
            {item.kind === 'title' ? (
              <span className="font-display italic text-accent">{item.name}</span>
            ) : (
              item.name
            )}
            {item.payload?.badge ? (
              <span aria-hidden="true" className="ml-1.5">
                {item.payload.badge}
              </span>
            ) : null}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{item.description}</p>
        </div>

        {swatches ? (
          <span
            aria-hidden="true"
            className="flex shrink-0 overflow-hidden rounded-lg ring-1 ring-line"
          >
            {swatches.map((color) => (
              <span key={color} className="h-8 w-4" style={{ background: color }} />
            ))}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {item.locked ? (
          <span className="chip border-line text-faint">Level {item.requiresLevel}</span>
        ) : null}
        {item.owned && item.charges ? (
          <span className="chip border-primary/40 text-primary">×{item.charges} held</span>
        ) : null}
        {equipped ? <span className="chip border-primary/50 text-primary">Equipped</span> : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span
          className={`numeric text-sm font-semibold ${
            item.price === 0 ? 'text-faint' : 'text-accent'
          }`}
        >
          {item.price === 0 ? 'Free' : `◉ ${fmt(item.price)}`}
        </span>

        {/* The action adapts: buy, buy more, equip, or invoke. */}
        {item.kind === 'consumable' && item.owned && item.charges > 0 ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs"
              disabled={busy || !item.purchasable}
              onClick={() => onBuy(item)}
            >
              Buy more
            </button>
            <button
              type="button"
              className="btn-primary px-3 py-1.5 text-xs"
              disabled={busy}
              onClick={() => onUse(item)}
            >
              Invoke
            </button>
          </div>
        ) : item.owned && !item.stackable ? (
          equipped ? (
            <span className="text-xs font-medium text-primary">In use</span>
          ) : (
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs"
              disabled={busy}
              onClick={() => onEquip(item)}
            >
              Equip
            </button>
          )
        ) : (
          <button
            type="button"
            className="btn-primary px-3 py-1.5 text-xs"
            disabled={busy || !item.purchasable}
            onClick={() => onBuy(item)}
            title={
              item.locked
                ? `Unlocks at level ${item.requiresLevel}`
                : shortfall > 0
                  ? `${fmt(shortfall)} more gold needed`
                  : undefined
            }
          >
            {item.locked
              ? 'Locked'
              : shortfall > 0
                ? `Need ${fmt(shortfall)} ◉`
                : 'Purchase'}
          </button>
        )}
      </div>
    </motion.li>
  );
}

export default function Emporium() {
  const { character, setCharacter, updateProfile, applyTheme } = useGame();
  const toast = useToast();

  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api
      .shop()
      .then((result) => setItems(result.items))
      .catch((err) => setError(err.message));
  }, []);

  const handleBuy = async (item) => {
    setBusy(item.id);
    try {
      const result = await api.buyItem(item.id);
      setCharacter(result.character);
      setItems(result.items);
      if (item.payload?.theme) applyTheme(item.payload.theme);

      toast.gold(`${item.name} acquired for ${fmt(item.price)} gold.`, { duration: 3400 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleUse = async (item) => {
    setBusy(item.id);
    try {
      const result = await api.useItem(item.id);
      setCharacter(result.character);
      setItems(result.items);
      toast.success(result.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleEquip = async (item) => {
    setBusy(item.id);
    try {
      const equip = {};
      if (item.payload?.theme) equip.theme = item.payload.theme;
      if (item.payload?.title) equip.title = item.payload.title;
      if (item.payload?.badge) equip.badge = item.payload.badge;

      await updateProfile({ equip });
      toast.success(`${item.name} equipped.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const isEquipped = (item) =>
    (item.payload?.theme && character?.equipped.theme === item.payload.theme) ||
    (item.payload?.title && character?.equipped.title === item.payload.title) ||
    (item.payload?.badge && character?.equipped.badge === item.payload.badge);

  if (error) {
    return (
      <EmptyState glyph="⚠" title="The shutters are down">
        {error}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-faint">
            Spend what you have earned
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold text-ink">Emporium</h1>
        </div>

        <motion.div
          key={character?.gold}
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          className="numeric flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-lg font-semibold text-accent"
        >
          <span aria-hidden="true">◉</span>
          <span>
            <span className="sr-only">Your purse holds </span>
            {fmt(character?.gold ?? 0)}
          </span>
        </motion.div>
      </header>

      {!items ? (
        <div className="space-y-6" aria-busy="true">
          {Array.from({ length: 2 }).map((_, s) => (
            <div key={s} className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((__, i) => (
                  <Skeleton key={i} className="h-[168px] rounded-card" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        SECTIONS.map((section) => {
          const sectionItems = items.filter((i) => i.kind === section.kind);
          if (!sectionItems.length) return null;

          return (
            <section key={section.kind} aria-labelledby={`shop-${section.kind}`}>
              <div className="mb-3">
                <h2 id={`shop-${section.kind}`} className="text-base font-semibold text-ink">
                  {section.title}
                </h2>
                <p className="mt-0.5 text-xs text-muted">{section.blurb}</p>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence initial={false}>
                  {sectionItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      gold={character?.gold ?? 0}
                      equipped={isEquipped(item)}
                      busy={busy === item.id}
                      onBuy={handleBuy}
                      onUse={handleUse}
                      onEquip={handleEquip}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
