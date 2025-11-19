import { ReactNode } from 'react';
import { useInView } from '@/hooks/useInView';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type AnimationType = 'fade-in' | 'slide-up-fade' | 'slide-left-fade' | 'slide-right-fade';

interface AnimatedSectionProps {
  children: ReactNode;
  animation?: AnimationType;
  className?: string;
  delay?: number;
}

const animationClassMap: Record<AnimationType, string> = {
  'fade-in': 'animate-fade-in',
  'slide-up-fade': 'animate-slide-up-fade',
  'slide-left-fade': 'animate-slide-left-fade',
  'slide-right-fade': 'animate-slide-right-fade',
};

const delayClassMap: Record<number, string> = {
  0: 'delay-0',
  100: 'delay-100',
  200: 'delay-200',
  300: 'delay-300',
  400: 'delay-400',
  500: 'delay-500',
};

export default function AnimatedSection({
  children,
  animation = 'fade-in',
  className = '',
  delay = 0,
}: AnimatedSectionProps) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const prefersReducedMotion = useReducedMotion();

  const animationClass = animationClassMap[animation];
  const delayClass = delayClassMap[delay as keyof typeof delayClassMap] || '';

  // Respeitar prefers-reduced-motion: mostrar sem animação se preferido
  const finalClassName = [
    className,
    prefersReducedMotion
      ? '' // Sem animação, apenas mostrar normalmente
      : isInView
        ? [animationClass, delayClass].filter(Boolean).join(' ')
        : 'opacity-0 pointer-events-none',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={ref} className={finalClassName}>
      {children}
    </div>
  );
}
