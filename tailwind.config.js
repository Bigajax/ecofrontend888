/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin'
import tokens from './tokens.json' assert { type: 'json' }

const glassStroke = tokens.stroke.glass
const glassBackground = tokens.colors.bg.surface
const glassBlur = tokens.blur.glass
const glassBlurStrong = tokens.blur.glassStrong
const minimalShadow = tokens.shadows.minimal
const subtleShadow = tokens.shadows.subtle

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],

  // 🚀 PERFORMANCE: Disable unused Tailwind core plugins
  corePlugins: {
    container: false,        // Not used in codebase
    columns: false,          // Not used in codebase
    breakAfter: false,       // Not used in codebase
    breakBefore: false,      // Not used in codebase
    breakInside: false,      // Not used in codebase
    placeholderColor: false, // Deprecated in Tailwind 3.0
    placeholderOpacity: false, // Deprecated in Tailwind 3.0
  },

  theme: {
    extend: {
      /* Tipografia — Inter (primária) + Playfair Display (display) */
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system','BlinkMacSystemFont',
          'Segoe UI','system-ui','Roboto',
          'Helvetica Neue','Arial','sans-serif'
        ],
        display: [
          'Playfair Display',
          'Georgia', 'serif'
        ],
      },

      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600, // 🚀 OPT#8: Added - used 187 times
        bold: 700,     // 🚀 OPT#8: Added - used 93 times
      },

      colors: {
        accent: tokens.colors.accent,
        success: tokens.colors.success,
        warn: tokens.colors.warn,
        danger: tokens.colors.danger,
        'bg-base': tokens.colors.bg.base,
        'glass-surface': glassBackground,
        'text-primary': tokens.colors.text.primary,
        'text-muted': tokens.colors.text.muted,
        'bubble-eco': tokens.colors.bubble.eco,
        'bubble-user': tokens.colors.bubble.user,
        'line': tokens.colors.line,
        eco: {
          bg: '#FAF9F7',
          line: '#E8E3DD',
          text: '#38322A',
          muted: '#9C938A',
          user: '#A7846C',
          bubble: '#F3EEE7',
          accent: '#C6A995',
          baby: '#6EC8FF',
          babyDark: '#36B3FF',
          babySoft: '#E9F6FF',
        },
      },

      backgroundImage: {
        'eco-gradient': tokens.colors.bg.gradient,
        'orb-pearl': 'radial-gradient(circle at 30% 30%, #E6EBEF, #F3EEE7)',
      },

      backdropBlur: {
        glass: glassBlur,
        'glass-strong': glassBlurStrong,
      },

      borderRadius: {
        'bubble': tokens.radius.bubble,
        'input': tokens.radius.input,
        'card': tokens.radius.card,
        xl: tokens.radius.xl,
        '2xl': tokens.radius['2xl'],
        eco: '12px',
        pill: '999px',
      },

      boxShadow: {
        minimal: minimalShadow,
        subtle: subtleShadow,
        glow: tokens.shadows.glow,
        'eco-glow': '0 0 20px rgba(163, 145, 126, 0.25)',
        eco: '0 4px 30px rgba(0,0,0,0.04)',
        ecoSm: '0 2px 12px rgba(0,0,0,0.04)',
        ecoHover: '0 6px 16px rgba(0,0,0,0.06)',
      },

      transitionDuration: {
        calm: tokens.motion.calm,
        breath: tokens.motion.breath,
      },

      transitionTimingFunction: {
        calm: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      /* Animações Soft Minimal */
      keyframes: {
        ecoPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
        wave: {
          '0%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0.9' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.95' },
          '50%': { transform: 'scale(1.02)', opacity: '1' },
        },
        fadeExpand: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // 🚀 REMOVED: ripple, pulseListen, pulseTalk (unused animations)
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        kenBurns: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeftFade: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideRightFade: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'eco-pulse': 'ecoPulse 6s ease-in-out infinite',
        'wave': 'wave 3s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'fade-expand': 'fadeExpand 300ms ease-out',
        // 🚀 REMOVED: ripple, pulseListen, pulseTalk animations (unused)
        float: 'float 9s ease-in-out infinite',
        'ken-burns': 'kenBurns 8s ease-in-out infinite',
        'fade-in': 'fadeIn 600ms ease-out',
        'slide-up-fade': 'slideUpFade 600ms ease-out',
        'slide-left-fade': 'slideLeftFade 600ms ease-out',
        'slide-right-fade': 'slideRightFade 600ms ease-out',
        'slide-down': 'slideDown 400ms ease-out',
      },
    },
  },

  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.glass-shell': {
          'background': 'rgba(250, 249, 247, 0.85)',
          'border': glassStroke,
          'backdrop-filter': `blur(${glassBlur})`,
          '-webkit-backdrop-filter': `blur(${glassBlur})`,
          'box-shadow': minimalShadow,
          'position': 'relative',
          'overflow': 'hidden',
        },
        '.glass-shell::before': {
          'content': '""',
          'position': 'absolute',
          'inset': '0',
          'border-radius': 'inherit',
          'background': 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
          'opacity': '0.75',
          'pointer-events': 'none',
        },
        '.glass-shell-strong': {
          'background': 'rgba(250, 249, 247, 0.95)',
          'border': glassStroke,
          'backdrop-filter': `blur(${glassBlurStrong})`,
          '-webkit-backdrop-filter': `blur(${glassBlurStrong})`,
          'box-shadow': subtleShadow,
        },
      })
    }),
  ],
}
