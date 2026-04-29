import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MeditationAmbientScreenProps {
  visible: boolean;
  elapsedSeconds: number;
  meditationTitle: string;
  category: string;
  onDismiss: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const CATEGORY_GLOW: Record<string, string> = {
  sono:              'rgba(124,58,237,0.28)',
  abundancia:        'rgba(255,185,50,0.22)',
  dr_joe_dispenza:   'rgba(59,130,246,0.24)',
  default:           'rgba(148,136,196,0.22)',
};

const CATEGORY_ACCENT: Record<string, string> = {
  sono:              '#C4B5FD',
  abundancia:        '#FFD97D',
  dr_joe_dispenza:   '#93C5FD',
  default:           '#C0B4E0',
};

export default function MeditationAmbientScreen({
  visible,
  elapsedSeconds,
  meditationTitle,
  category,
  onDismiss,
}: MeditationAmbientScreenProps) {
  const glow   = CATEGORY_GLOW[category]   ?? CATEGORY_GLOW.default;
  const accent = CATEGORY_ACCENT[category] ?? CATEGORY_ACCENT.default;

  // Pulsing glow animation state
  const [pulse, setPulse] = useState(false);
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) {
      if (pulseRef.current) clearInterval(pulseRef.current);
      return;
    }
    pulseRef.current = setInterval(() => setPulse(p => !p), 4000);
    return () => {
      if (pulseRef.current) clearInterval(pulseRef.current);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="ambient"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9990] flex flex-col items-center justify-center cursor-pointer select-none"
          style={{ background: 'linear-gradient(160deg, #04060F 0%, #080C1E 50%, #0A0618 100%)' }}
          onClick={onDismiss}
        >
          {/* Ambient radial glow — breathing */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{ opacity: pulse ? 0.6 : 1 }}
            transition={{ duration: 4, ease: 'easeInOut' }}
            style={{
              background: `radial-gradient(ellipse 65% 55% at 50% 45%, ${glow} 0%, transparent 70%)`,
            }}
          />

          {/* Subtle star-dust noise */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'repeat',
              backgroundSize: '200px',
            }}
          />

          {/* Logo */}
          <div className="absolute top-8 left-0 right-0 flex justify-center">
            <img
              src="/images/ECOTOPIA.webp"
              alt="Ecotopia"
              className="h-9 opacity-40"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>

          {/* Timer */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-5"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            <p
              className="font-display leading-none tabular-nums"
              style={{
                fontSize: 'clamp(72px, 18vw, 96px)',
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '-0.03em',
                textShadow: `0 0 60px ${glow}, 0 2px 12px rgba(0,0,0,0.60)`,
              }}
            >
              {formatElapsed(elapsedSeconds)}
            </p>

            <p
              className="text-[15px] font-medium tracking-wide text-center px-8 leading-snug"
              style={{ color: accent, opacity: 0.70, maxWidth: '280px' }}
            >
              {meditationTitle}
            </p>
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
