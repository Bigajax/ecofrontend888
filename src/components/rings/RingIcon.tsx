import type { RingType } from '@/types/rings';

interface RingIconProps {
  ringId: RingType;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function RingIcon({
  ringId,
  size = 32,
  color = 'currentColor',
  strokeWidth = 1.5,
}: RingIconProps) {
  const iconProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (ringId) {
    case 'earth':
      return (
        <svg {...iconProps}>
          {/* Square inside circle - represents grounding/foundation */}
          <circle cx="12" cy="12" r="10" />
          <rect x="8" y="8" width="8" height="8" />
        </svg>
      );

    case 'water':
      return (
        <svg {...iconProps}>
          {/* Wave/water lines */}
          <circle cx="12" cy="12" r="10" />
          <path d="M 6 12 Q 8 10, 10 12 T 14 12 T 18 12" />
          <path d="M 6 16 Q 8 14, 10 16 T 14 16 T 18 16" />
        </svg>
      );

    case 'fire':
      return (
        <svg {...iconProps}>
          {/* Triangle (flame-like) inside circle */}
          <circle cx="12" cy="12" r="10" />
          <path d="M 12 7 L 16 16 L 8 16 Z" />
        </svg>
      );

    case 'wind':
      return (
        <svg {...iconProps}>
          {/* Arc/wind lines */}
          <circle cx="12" cy="12" r="10" />
          <path d="M 8 10 Q 12 8, 16 10" />
          <path d="M 8 14 Q 12 12, 16 14" />
        </svg>
      );

    case 'void':
      return (
        <svg {...iconProps}>
          {/* Empty circle (void/emptiness) */}
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" fill="none" stroke="none" />
        </svg>
      );

    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}
