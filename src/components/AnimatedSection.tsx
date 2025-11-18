import { ReactNode, CSSProperties } from 'react';
import { useInView } from '@/hooks/useInView';

type AnimationType = 'fade-in' | 'slide-up-fade' | 'slide-left-fade' | 'slide-right-fade';

interface AnimatedSectionProps {
  children: ReactNode;
  animation?: AnimationType;
  className?: string;
  delay?: number;
}

const animationMap: Record<AnimationType, string> = {
  'fade-in': 'fadeInAnimation',
  'slide-up-fade': 'slideUpFadeAnimation',
  'slide-left-fade': 'slideLeftFadeAnimation',
  'slide-right-fade': 'slideRightFadeAnimation',
};

export default function AnimatedSection({
  children,
  animation = 'fade-in',
  className = '',
  delay = 0,
}: AnimatedSectionProps) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const animationName = animationMap[animation];

  // Use inline style with direct animation property
  const style: CSSProperties = isInView
    ? {
        animation: `${animationName} 900ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
        animationDelay: `${delay}ms`,
      }
    : {
        opacity: 0,
        pointerEvents: 'none',
      };

  return (
    <div
      ref={ref}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}
