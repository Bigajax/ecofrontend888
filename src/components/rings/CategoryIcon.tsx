import type { ReactNode } from 'react';

interface CategoryIconProps {
  categoryId: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function CategoryIcon({
  categoryId,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.5,
}: CategoryIconProps): ReactNode {
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

  // Focus reasons
  if (categoryId === 'redes_sociais') {
    return (
      <svg {...iconProps}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 8H16M8 12H16M8 16H12" />
      </svg>
    );
  }
  if (categoryId === 'sono') {
    return (
      <svg {...iconProps}>
        <path d="M3 12c0 6 4 9 9 9s9-3 9-9" />
        <path d="M9 6v6M12 4v8M15 6v6" />
      </svg>
    );
  }
  if (categoryId === 'ansiedade') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 10l4 4M14 10l-4 4" />
      </svg>
    );
  }
  if (categoryId === 'interrupcoes') {
    return (
      <svg {...iconProps}>
        <path d="M12 2v8M12 14v8" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }

  // Adjustment types
  if (categoryId === 'ambiente') {
    return (
      <svg {...iconProps}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M15 3v18" />
      </svg>
    );
  }
  if (categoryId === 'rotina') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  }
  if (categoryId === 'corpo') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="6" r="3" />
        <path d="M12 9v6M9 12h6M9 15l1.5 3M15 15l-1.5 3" />
      </svg>
    );
  }
  if (categoryId === 'relacoes') {
    return (
      <svg {...iconProps}>
        <circle cx="8" cy="8" r="2.5" />
        <circle cx="16" cy="8" r="2.5" />
        <path d="M8 10.5v4M16 10.5v4M10 16h4" />
      </svg>
    );
  }

  // Emotions
  if (categoryId === 'raiva') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 9L8 7M14 9L16 7M8 15h8" />
      </svg>
    );
  }
  if (categoryId === 'frustracao') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9L10 10M15 9L14 10M9 15h6" />
      </svg>
    );
  }
  if (categoryId === 'culpa') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 9v3M12 15v2" />
        <path d="M9 14h6" />
      </svg>
    );
  }
  if (categoryId === 'tristeza') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9h1M14 9h1M8 15h8" strokeLinecap="round" />
      </svg>
    );
  }

  // Learning sources
  if (categoryId === 'erro_proprio') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9l6 6M15 9l-6 6" />
      </svg>
    );
  }
  if (categoryId === 'outra_pessoa') {
    return (
      <svg {...iconProps}>
        <circle cx="9" cy="6" r="2" />
        <path d="M9 8v4M7 10h4" />
        <circle cx="16" cy="12" r="3" />
        <path d="M16 15v2M15 18h2" />
      </svg>
    );
  }
  if (categoryId === 'conteudo') {
    return (
      <svg {...iconProps}>
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }
  if (categoryId === 'trabalho_estudo') {
    return (
      <svg {...iconProps}>
        <rect x="3" y="6" width="18" height="14" rx="1" />
        <path d="M3 10h18M8 6V4M16 6V4" />
      </svg>
    );
  }

  // Identity keywords
  if (categoryId === 'mais_disciplinado') {
    return (
      <svg {...iconProps}>
        <path d="M12 2l2 6h6l-5 3 2 6-6-4-6 4 2-6-5-3h6z" fill={color} />
      </svg>
    );
  }
  if (categoryId === 'mais_calmo') {
    return (
      <svg {...iconProps}>
        <path d="M6 14c2-3 4-4 6-4s4 1 6 4" />
        <circle cx="9" cy="10" r="1" fill={color} />
        <circle cx="15" cy="10" r="1" fill={color} />
      </svg>
    );
  }
  if (categoryId === 'mais_presente') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" fill={color} />
      </svg>
    );
  }
  if (categoryId === 'mais_forte') {
    return (
      <svg {...iconProps}>
        <path d="M6 8l3-4h6l3 4v8l-12 0z" />
        <path d="M9 10v6M15 10v6" />
      </svg>
    );
  }
  if (categoryId === 'menos_impulsivo') {
    return (
      <svg {...iconProps}>
        <rect x="4" y="8" width="5" height="8" rx="1" />
        <rect x="15" y="8" width="5" height="8" rx="1" />
        <path d="M9 12h6" />
      </svg>
    );
  }

  // Default/outro
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}
