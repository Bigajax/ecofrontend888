import { motion } from 'framer-motion';

export default function MinimalAnimatedBackground() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-amber-50 via-stone-50 to-white">
      {/* Subtle animated elements */}

      {/* Soft circle - bottom right, subtle glow */}
      <motion.div
        animate={{
          y: [0, 20, 0],
          scale: [1, 1.05, 1],
          opacity: [0.15, 0.25, 0.15]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-gradient-to-tl from-[var(--eco-user)]/30 blur-3xl"
      />

      {/* Soft circle - top left, subtle glow */}
      <motion.div
        animate={{
          y: [0, -15, 0],
          scale: [1, 1.08, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.3
        }}
        className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-gradient-to-br from-[var(--eco-accent)]/20 blur-3xl"
      />

      {/* Overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/40" />
    </div>
  );
}
