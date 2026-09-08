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
        teal:       '#14B8A6',
        mint:       '#A7F3D8',
        paper:      '#F5F8F7',
        'ink-muted': '#5B6B7A',
        amber:      '#F59E0B',
        danger:     '#EF4444',
        slate:      '#94A3B8',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
