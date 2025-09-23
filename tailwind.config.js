/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /* Tipografia — SF Pro com fallbacks (Inter fica como fallback também) */
      fontFamily: {
        sans: [
          'SF Pro Display','SF Pro Text',       // macOS/iOS
          '-apple-system','BlinkMacSystemFont', // Apple stack
          'Segoe UI','Inter','system-ui','Roboto',
          'Helvetica Neue','Arial','sans-serif'
        ],
      },

      /* Sua paleta azul mantida */
      colors: {
        blue: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#bae1fd',
          300: '#7dcefc',
          400: '#38b7f8',
          500: '#0e9de9',
          600: '#0280c7',
          700: '#0267a1',
          800: '#065786',
          900: '#0a4970',
        },
      },

      /* Gradientes de fundo “Visa vibe” (opcional de usar) */
      backgroundImage: {
        'eco-vibe':
          'radial-gradient(1200px_600px_at_20%_-10%,#E9E8FF,transparent_55%),' +
          'radial-gradient(900px_600px_at_85%_-5%,#FFE7E1,transparent_60%),' +
          'linear-gradient(120deg,#EEF3FF_0%,#FFF8F3_70%)',
      },

      /* Animações já existentes */
      keyframes: {
        ripple: {
          '0%':   { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        pulseListen: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.08)', opacity: '0.85' },
        },
        pulseTalk: {
          '0%':   { transform: 'scale(1)', opacity: '1' },
          '25%':  { transform: 'scale(1.06)', opacity: '0.85' },
          '50%':  { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        ripple: 'ripple 1.5s infinite ease-in-out',
        pulseListen: 'pulseListen 1.2s ease-in-out infinite',
        pulseTalk: 'pulseTalk 3s ease-in-out infinite',
      },
    },
  },

  /* Utilitários prontos de vidro */
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        /* cartão de vidro forte (para sidebar/topbar/cards principais) */
        '.glass': {
          'background-color': 'rgba(255,255,255,0.10)',
          'backdrop-filter': 'blur(24px)',
          '-webkit-backdrop-filter': 'blur(24px)',
          'border': '1px solid rgba(255,255,255,0.30)',
          'box-shadow':
            '0 10px 30px rgba(16,24,40,0.10), inset 0 1px 0 rgba(255,255,255,0.35)',
        },
        /* vidro suave (para botões/chips) */
        '.glass-soft': {
          'background-color': 'rgba(255,255,255,0.12)',
          'backdrop-filter': 'blur(18px)',
          '-webkit-backdrop-filter': 'blur(18px)',
          'border': '1px solid rgba(255,255,255,0.25)',
          'box-shadow':
            '0 6px 20px rgba(16,24,40,0.08), inset 0 1px 0 rgba(255,255,255,0.30)',
        },
      })
    }),
  ],
}
