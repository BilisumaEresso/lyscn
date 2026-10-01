import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink:        '#121A2C',
        leaf:       '#55E6A5',
        mint:       '#A7F3D8',
        paper:      '#F5F8F7',
        'ink-muted': '#5B6B7A',
        teal: {
          ...colors.teal,
          DEFAULT: '#14B8A6',
        },
        amber: {
          ...colors.amber,
          DEFAULT: '#F59E0B',
        },
        danger: {
          ...colors.red,
          DEFAULT: '#EF4444',
        },
        slate: {
          ...colors.slate,
          DEFAULT: '#94A3B8',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
