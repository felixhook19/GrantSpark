import type { Config } from 'tailwindcss'

// "Paper & Ink" (June 2026) — light editorial: warm paper, forest green,
// burnt sienna, ink type. Broadsheet energy, not SaaS.
//
// Every legacy token name (midnight/chalk/teal/spark/... and the older
// semantic set) is KEPT as an alias onto the new palette so pages outside
// the 13-file rebuild restyle automatically. Do not delete aliases.
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ─────────────────────────────────────────
        paper: '#FAF8F5',
        'paper-2': '#F0EDE8',
        'paper-3': '#EDE9E3',
        'paper-4': '#E8E4DD',

        // ── Primary accent — Forest Green ──────────────────────
        forest: '#1B4332',
        'forest-light': '#2D6A4F',
        'forest-dim': '#E8F5E9',

        // ── Secondary accent — Burnt Sienna ────────────────────
        sienna: '#D4580A',
        'sienna-light': '#E8711A',
        'sienna-dim': '#FEF0E6',

        // ── Type scale ──────────────────────────────────────────
        ink: '#1C1917',
        'ink-2': '#292524',
        slate: '#6B7280',
        dim: '#9CA3AF',
        rule: '#E5E0D8',

        // ── Scoring / decision ──────────────────────────────────
        'score-hi': '#16A34A',
        'score-mid': '#B45309',
        'score-lo': '#DC2626',

        // ── Legacy brand aliases (Type-First Dark names) ────────
        midnight: '#F0EDE8', // was input/deep bg → paper-2 inset
        'midnight-2': '#FFFFFF', // was cards → white cards
        'midnight-3': '#FAF8F5', // was page bg → paper
        'midnight-4': '#EDE9E3', // was alt sections → paper-3
        chalk: '#1C1917', // primary text → ink
        teal: '#1B4332', // primary accent → forest
        'teal-light': '#2D6A4F',
        muted: '#9CA3AF', // → dim
        spark: '#16A34A', // scoring green (light-safe)
        gold: '#B45309',
        rose: '#DC2626',
        orange: '#D4580A',
        action: '#D4580A',
        purple: '#4A148C',
        warn: '#B45309',

        // ── Legacy semantic aliases (billing/portfolio/admin/etc) ──
        background: '#FFFFFF',
        surface: '#F0EDE8',
        'surface-2': '#EDE9E3',
        border: '#E5E0D8',
        'border-strong': '#D6D0C6',
        text: '#1C1917',
        'text-secondary': '#6B7280',
        primary: '#1B4332',
        'primary-hover': '#2D6A4F',
        'primary-soft': '#E8F5E9',
        accent: '#B45309',
        'accent-hover': '#92400E',
        'accent-soft': '#FEF3C7',
        success: '#16A34A',
        'success-soft': '#DCFCE7',
        warning: '#D4580A',
        'warning-soft': '#FEF0E6',
        danger: '#DC2626',
        'danger-soft': '#FEE2E2',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'], // headings — weight 800 only
        body: ['"DM Sans"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        tightish: '-0.02em',
        tightest: '-0.04em',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(28, 25, 23, 0.06)',
        card: '0 1px 2px rgba(28, 25, 23, 0.04), 0 6px 20px -6px rgba(28, 25, 23, 0.10)',
        focus: '0 0 0 4px rgba(27, 67, 50, 0.18)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}

export default config
