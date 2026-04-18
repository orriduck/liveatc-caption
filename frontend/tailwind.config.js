/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        atc: {
          bg:        '#0a0a0b',
          card:      '#151518',
          elev:      '#1d1d22',
          high:      '#27272e',
          orange:    '#FF5A1F',
          'orange-soft': 'rgba(255,90,31,0.12)',
          mint:      '#34d399',
          red:       '#ff3b30',
          text:      '#f5f5f7',
          dim:       'rgba(245,245,247,0.62)',
          faint:     'rgba(245,245,247,0.38)',
          line:      'rgba(255,255,255,0.08)',
          'line-strong': 'rgba(255,255,255,0.16)',
        }
      },
      fontFamily: {
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', '"Playfair Display"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-dot': 'pulseDot 1.6s ease-in-out infinite',
        'cap-in':    'capIn 0.4s cubic-bezier(0.2,0.6,0.2,1)',
        'caret':     'caretBlink 0.9s steps(1) infinite',
        'eq-bar':    'eqBar 0.6s ease-in-out infinite alternate',
        'wv':        'wv 0.5s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.55', transform: 'scale(0.85)' },
        },
        capIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        caretBlink: {
          '50%': { opacity: '0' },
        },
        eqBar: {
          from: { transform: 'scaleY(0.35)' },
          to:   { transform: 'scaleY(1)' },
        },
        wv: {
          from: { transform: 'scaleY(0.4)' },
          to:   { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
}
