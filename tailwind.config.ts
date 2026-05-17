import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#0B1220',
        'midnight-2': '#0F1729',
        'midnight-3': '#141E33',
        spark: '#19E88F',
        chalk: '#F4F1EA',
        slate: '#8892A0',
        ink: '#1E2A3A',
        warn: '#FFB454',
        rose: '#FF6B7A',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
