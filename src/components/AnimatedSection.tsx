import { ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type AnimationType = 'fade-in' | 'slide-up-fade' | 'slide-left-fade' | 'slide-right-fade';

interface AnimatedSectionProps {
  children: ReactNode;
  animation?: AnimationType;
  className?: string;
  delay?: number;
  id?: string;
}

const variantsMap: Record<AnimationType, Variants> = {
  'fade-in': {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  },
  'slide-up-fade': {
    hidden: { opacity: 0, y: 32 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 60, damping: 20, mass: 0.9 },
    },
  },
  'slide-left-fade': {
    hidden: { opacity: 0, x: -28 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 60, damping: 20, mass: 0.9 },
    },
  },
  'slide-right-fade': {
    hidden: { opacity: 0, x: 28 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 60, damping: 20, mass: 0.9 },
    },
  },
};

export default function AnimatedSection({
  children,
  animation = 'slide-up-fade',
  className = '',
  delay = 0,
  id,
}: AnimatedSectionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className={className} id={id}>
        {children}
      </div>
    );
  }

  const base = variantsMap[animation];
  const baseVisible = base.visible as Record<string, unknown>;
  const baseTransition = (baseVisible.transition ?? {}) as Record<string, unknown>;

  const variants: Variants = {
    hidden: base.hidden,
    visible: {
      ...baseVisible,
      transition: { ...baseTransition, delay: delay / 1000 },
    },
  };

  return (
    <motion.div
      id={id}
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
    >
      {children}
    </motion.div>
  );
}
