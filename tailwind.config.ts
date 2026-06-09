import type { Config } from 'tailwindcss'

// "Purposeful Intelligence" brand refresh (June 2026) — Type-First Dark.
//
// Semantic tokens (background/surface/text/primary/...) are what pages
// use; the named brand tokens (midnight/teal/spark/...) are the approved
// palette. spark green is RESERVED for match scores, success states and
// the wordmark — interactive elements use Trust Teal.
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- Core palette ---
        midnight: '#1A1A2E',
        'midnight-2': '#23233B',
        'midnight-3': '#2C2C48',
        teal: '#00897B',
        chalk: '#F5F3F0',
        spark: '#19E88F',

        // --- Accent palette ---
        action: '#E65100', // Apply badges, deadline urgency
        gold: '#D4A017', // Consider state
        rose: '#C62828', // Skip state, errors
        purple: '#4A148C', // premium tier indicators
        slate: '#546E7A', // secondary text (badges/metadata)

        // --- Semantic mappings ---
        background: '#1A1A2E',
        surface: '#23233B',
        'surface-2': '#2C2C48',
        border: '#32324F',
        'border-strong': '#3E3E5E',
        text: '#F5F3F0',
        // slate lightened two steps for body-copy contrast on midnight;
        // raw slate (#546E7A) stays for low-emphasis metadata.
        'text-secondary': '#9DAEB8',
        muted: '#6E8694',

        primary: '#00897B',
        'primary-hover': '#00A693',
        'primary-soft': '#10332F',

        accent: '#D4A017',
        'accent-hover': '#E8B52E',
        'accent-soft': '#332B10',

        success: '#19E88F',
        'success-soft': '#10362A',
        warning: '#E65100',
        'warning-soft': '#36210F',
        danger: '#E05656',
        'danger-soft': '#391A1F',

        // --- Legacy aliases (older components reference these) ---
        ink: '#32324F',
        warn: '#E65100',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightish: '-0.02em',
        tightest: '-0.03em',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0, 0, 0, 0.3)',
        card: '0 1px 2px rgba(0, 0, 0, 0.25), 0 6px 20px -4px rgba(0, 0, 0, 0.35)',
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
