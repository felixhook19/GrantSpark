import type { Config } from 'tailwindcss'

// "Purposeful Intelligence" — Type-First Dark (UI rebuild, June 2026).
//
// Two tiers of tokens:
//  1. Brand tokens (midnight/teal/spark/...) — used by the rebuilt pages.
//  2. Legacy semantic aliases (background/surface/text/primary/...) —
//     kept so pages outside the rebuild (billing, portfolio, saved,
//     admin, legal) stay styled. Map onto the same palette.
//
// spark green is RESERVED for scoring, success states and the logo mark.
// Interactive elements use teal / teal-light.
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- Brand tokens ---
        midnight: '#1A1A2E', // primary background
        'midnight-2': '#16162A', // card/panel background
        'midnight-3': '#0F0F20', // deepest background, hero sections
        'midnight-4': '#12122A', // alternate section background
        teal: '#00897B', // PRIMARY ACCENT — buttons, links, CTAs
        'teal-light': '#00BFA5', // teal hover/highlight state
        spark: '#19E88F', // scoring only: high scores, success, logo mark
        chalk: '#F5F3F0', // primary text on dark
        slate: '#546E7A', // secondary/muted text
        muted: '#3D4E5C', // tertiary text, placeholders
        orange: '#E65100', // "Apply" decision badge, urgent CTAs
        gold: '#D4A017', // "Consider" decision badge
        rose: '#C62828', // "Skip" decision badge, errors
        purple: '#4A148C', // premium tier indicators
        ink: '#1E2A3A', // hover states on interactive elements

        // --- Legacy semantic aliases (pages outside the rebuild) ---
        background: '#1A1A2E',
        surface: '#16162A',
        'surface-2': '#12122A',
        border: '#2A2A44',
        'border-strong': '#3A3A58',
        text: '#F5F3F0',
        'text-secondary': '#9DAEB8',
        primary: '#00897B',
        'primary-hover': '#00BFA5',
        'primary-soft': '#0E2E2B',
        accent: '#D4A017',
        'accent-hover': '#E8B52E',
        'accent-soft': '#2E2710',
        success: '#19E88F',
        'success-soft': '#0E2E22',
        warning: '#E65100',
        'warning-soft': '#301E0E',
        danger: '#E05656',
        'danger-soft': '#341920',
        action: '#E65100',
        warn: '#E65100',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'], // headings — weight 800 only
        body: ['"DM Sans"', 'sans-serif'], // body — 400/500/600
        sans: ['"DM Sans"', 'sans-serif'], // alias (layout body class)
        mono: ['"JetBrains Mono"', 'monospace'], // scores, amounts, labels
      },
      letterSpacing: {
        tightish: '-0.02em',
        tightest: '-0.04em',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0, 0, 0, 0.3)',
        card: '0 1px 2px rgba(0, 0, 0, 0.25), 0 6px 20px -4px rgba(0, 0, 0, 0.4)',
        focus: '0 0 0 4px rgba(0, 137, 123, 0.35)',
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
