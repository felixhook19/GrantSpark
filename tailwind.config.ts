import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- Forest Heritage palette ---
        background: '#FBFAF7',        // warm cream / parchment
        surface: '#F4F1EA',           // slightly deeper cream
        'surface-2': '#ECE8DE',
        border: '#E7E5E0',
        'border-strong': '#D6D3CC',
        text: '#1C1917',              // warm near-black
        'text-secondary': '#57534E',  // warm grey
        muted: '#A8A29E',

        primary: '#14532D',           // deep forest green (brand, CTAs)
        'primary-hover': '#166534',
        'primary-soft': '#E8EFE9',    // very soft green tint

        accent: '#CA8A04',            // mustard gold (highlights, view buttons)
        'accent-hover': '#A16207',
        'accent-soft': '#FEF3C7',

        success: '#0F6E56',           // teal-leaning emerald (90+ match)
        'success-soft': '#D8EFE5',
        warning: '#B45309',           // burnt amber (60-74 match)
        'warning-soft': '#FEF3C7',
        danger: '#B91C1C',
        'danger-soft': '#FEE2E2',

        // --- Legacy aliases (so any leftover classes still resolve) ---
        midnight: '#FBFAF7',
        'midnight-2': '#F4F1EA',
        'midnight-3': '#ECE8DE',
        chalk: '#1C1917',
        slate: '#57534E',
        spark: '#14532D',
        ink: '#E7E5E0',
        warn: '#B45309',
        rose: '#B91C1C',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightish: '-0.02em',
        tightest: '-0.03em',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(28, 25, 23, 0.06)',
        card: '0 1px 2px rgba(28, 25, 23, 0.04), 0 4px 16px -4px rgba(28, 25, 23, 0.06)',
        focus: '0 0 0 4px rgba(20, 83, 45, 0.18)',
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
