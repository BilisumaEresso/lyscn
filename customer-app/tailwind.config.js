/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:         '#121A2C',
        leaf:        '#55E6A5',
        teal:        '#14B8A6',
        mint:        '#A7F3D8',
        paper:       '#F5F8F7',
        'ink-muted': '#5B6B7A',
        amber:       '#F59E0B',
        danger:      '#EF4444',
        slate:       '#94A3B8',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'slide-up-spring': {
          '0%':   { transform: 'translateY(100%)' },
          '70%':  { transform: 'translateY(-6px)' },
          '85%':  { transform: 'translateY(3px)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      animation: {
        'slide-up':        'slide-up 250ms ease-out',
        'slide-up-spring': 'slide-up-spring 500ms cubic-bezier(0.34,1.56,0.64,1)',
        'fade-in':         'fade-in 200ms ease-out',
        'pulse-slow':      'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
