/** @type {import('tailwindcss').Config} */

// Every colour resolves through a CSS custom property, so swapping the
// `data-theme` attribute on <html> re-skins the entire app without a re-render
// and without shipping five copies of the utility classes.
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', 'html:not([data-mode="light"])'],
  theme: {
    extend: {
      colors: {
        void: token('--c-void'),
        surface: token('--c-surface'),
        raised: token('--c-raised'),
        line: token('--c-line'),
        ink: token('--c-ink'),
        muted: token('--c-muted'),
        faint: token('--c-faint'),
        primary: token('--c-primary'),
        'primary-soft': token('--c-primary-soft'),
        accent: token('--c-accent'),
        danger: token('--c-danger'),
        success: token('--c-success'),
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        sans: ['Outfit', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '1.125rem',
      },
      boxShadow: {
        // Driven by --c-shadow so a light theme gets a soft, warm-tinted
        // shadow instead of a near-black one that reads as dirt.
        rune: '0 0 0 1px rgb(var(--c-line) / 0.9), var(--c-shadow)',
        lift: '0 24px 60px -28px rgb(var(--c-primary) / 0.55)',
        inset: 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },
      backgroundImage: {
        'aurora':
          'radial-gradient(ellipse 80% 55% at 50% -10%, rgb(var(--c-primary) / 0.22), transparent 70%), radial-gradient(ellipse 60% 45% at 85% 15%, rgb(var(--c-accent) / 0.12), transparent 65%)',
        'sheen':
          'linear-gradient(100deg, transparent 20%, rgb(255 255 255 / 0.14) 50%, transparent 80%)',
      },
      keyframes: {
        'xp-fill': {
          from: { transform: 'scaleX(var(--from, 0))' },
          to: { transform: 'scaleX(var(--to, 1))' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'float-up': {
          '0%': { opacity: '0', transform: 'translate(-50%, 0) scale(0.8)' },
          '18%': { opacity: '1', transform: 'translate(-50%, -12px) scale(1.08)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -64px) scale(0.96)' },
        },
        'pulse-ring': {
          '0%': { opacity: '0.65', transform: 'scale(0.92)' },
          '100%': { opacity: '0', transform: 'scale(1.6)' },
        },
        'rune-spin': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s infinite',
        'float-up': 'float-up 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'pulse-ring': 'pulse-ring 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'rune-spin': 'rune-spin 22s linear infinite',
      },
    },
  },
  plugins: [],
};
