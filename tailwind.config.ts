import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- New semantic palette ---
        background: '#FFFFFF',
        surface: '#F8FAFC',
        'surface-2': '#F1F5F9',
        border: '#E2E8F0',
        'border-strong': '#CBD5E1',
        text: '#0F172A',
        'text-secondary': '#475569',
        muted: '#94A3B8',

        primary: '#2563EB',
        'primary-hover': '#1D4ED8',
        'primary-soft': '#EFF6FF',

        success: '#10B981',
        'success-soft': '#ECFDF5',
        warning: '#F59E0B',
        'warning-soft': '#FFFBEB',
        danger: '#DC2626',
        'danger-soft': '#FEF2F2',

        // --- Legacy aliases (so any leftover classes still resolve) ---
        midnight: '#FFFFFF',
        'midnight-2': '#F8FAFC',
        'midnight-3': '#F1F5F9',
        chalk: '#0F172A',
        slate: '#475569',
        spark: '#2563EB',
        ink: '#E2E8F0',
        warn: '#F59E0B',
        rose: '#DC2626',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightish: '-0.02em',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(15, 23, 42, 0.06)',
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px -4px rgba(15, 23, 42, 0.06)',
        focus: '0 0 0 4px rgba(37, 99, 235, 0.15)',
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
