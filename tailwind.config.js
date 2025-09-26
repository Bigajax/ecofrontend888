/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'SF Pro Display',
          'SF Pro Text',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'system-ui',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        surface: {
          DEFAULT: 'var(--surface)',
          strong: 'var(--surface-strong)',
        },
      },
      boxShadow: {
        'soft-xs': 'var(--shadow-xs)',
        'soft-lg': 'var(--shadow-lg)',
      },
      maxWidth: {
        'chat-container': 'var(--max-chat-width)',
      },
      spacing: {
        safe: 'var(--safe-bottom)',
      },
      transitionTimingFunction: {
        'swift-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
