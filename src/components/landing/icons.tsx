// SVG icons para a landing Ecotopia
// 24x24, viewBox 0 0 24 24, stroke #C9A961 (gold), stroke-width 1.5, fill none.
// Cada icon aceita className e size (default 24).

interface IconProps {
  className?: string;
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: '#C9A961',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

// ─── 8 features ───

export function IconEcoAI({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="12" cy="12" r="6" opacity="0.55" />
      <circle cx="12" cy="12" r="9.5" opacity="0.28" />
    </svg>
  );
}

export function IconCincoAneis({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <line x1="4.5" y1="17" x2="4.5" y2="11" />
      <line x1="8.25" y1="17" x2="8.25" y2="7" />
      <line x1="12" y1="17" x2="12" y2="4.5" />
      <line x1="15.75" y1="17" x2="15.75" y2="9" />
      <line x1="19.5" y1="17" x2="19.5" y2="13" />
    </svg>
  );
}

export function IconEcoDream({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M17.5 14.5A7 7 0 0 1 9.5 6.5a7 7 0 1 0 8 8z" />
      <circle cx="6" cy="5.5" r="0.6" fill="#C9A961" stroke="none" />
      <circle cx="19" cy="6" r="0.5" fill="#C9A961" stroke="none" />
      <circle cx="5.5" cy="11" r="0.5" fill="#C9A961" stroke="none" />
    </svg>
  );
}

export function IconDiarioEstoico({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      {/* Capitel jônico estilizado */}
      <path d="M7 6.5 Q9 5.5 12 5.5 Q15 5.5 17 6.5" />
      <line x1="6.5" y1="7.5" x2="17.5" y2="7.5" />
      <line x1="7.5" y1="9" x2="16.5" y2="9" />
      {/* Fuste */}
      <line x1="9" y1="9.5" x2="9" y2="18" />
      <line x1="15" y1="9.5" x2="15" y2="18" />
      <line x1="12" y1="9.5" x2="12" y2="18" opacity="0.6" />
      {/* Base */}
      <line x1="7" y1="18.5" x2="17" y2="18.5" />
    </svg>
  );
}

export function IconSono({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M2.5 13 Q5.5 8 8.5 13 T14.5 13 T20.5 13" />
      <path d="M2.5 17 Q6 14 9.5 17 T16.5 17 T21.5 17" opacity="0.55" />
    </svg>
  );
}

export function IconQuemPensaEnriquece({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M12 4 L20 19 L4 19 Z" />
      <line x1="8" y1="14" x2="16" y2="14" opacity="0.6" />
      <line x1="10" y1="9.5" x2="14" y2="9.5" opacity="0.45" />
    </svg>
  );
}

export function IconDispenza({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M12 12 m-1 0 a 1 1 0 1 1 2 0 a 2 2 0 1 1 -4 0 a 3 3 0 1 1 6 0 a 4 4 0 1 1 -8 0 a 5 5 0 1 1 10 0" />
    </svg>
  );
}

export function IconBiblioteca({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M4 6 Q12 5 12 7 Q12 5 20 6 L20 18 Q12 17 12 19 Q12 17 4 18 Z" />
      <line x1="12" y1="7" x2="12" y2="19" />
    </svg>
  );
}

// ─── 3 autoridade ───

export function IconFilosofia({ className, size = 24 }: IconProps) {
  // Pilastra jônica simples (versão maior do diário estoico)
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M6 5.5 Q9 4.5 12 4.5 Q15 4.5 18 5.5" />
      <line x1="5.5" y1="6.5" x2="18.5" y2="6.5" />
      <line x1="8.5" y1="7.5" x2="8.5" y2="18.5" />
      <line x1="15.5" y1="7.5" x2="15.5" y2="18.5" />
      <line x1="12" y1="7.5" x2="12" y2="18.5" opacity="0.55" />
      <line x1="5" y1="19.5" x2="19" y2="19.5" />
    </svg>
  );
}

export function IconNeurociencia({ className, size = 24 }: IconProps) {
  // Nó com 3 ramificações (sinapse estilizada)
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 9.8 L12 5" />
      <path d="M12 14.2 L12 19" />
      <path d="M10 11 L6 8" />
      <path d="M14 11 L18 8" />
      <path d="M10 13 L6 16" />
      <path d="M14 13 L18 16" />
      <circle cx="6" cy="8" r="0.9" fill="#C9A961" stroke="none" />
      <circle cx="18" cy="8" r="0.9" fill="#C9A961" stroke="none" />
      <circle cx="6" cy="16" r="0.9" fill="#C9A961" stroke="none" />
      <circle cx="18" cy="16" r="0.9" fill="#C9A961" stroke="none" />
      <circle cx="12" cy="5" r="0.9" fill="#C9A961" stroke="none" />
      <circle cx="12" cy="19" r="0.9" fill="#C9A961" stroke="none" />
    </svg>
  );
}

export function IconMetodo({ className, size = 24 }: IconProps) {
  // Cinco linhas verticais (mesmo motivo dos Anéis, mas mais sutil — representa "método" disciplinado)
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <line x1="5" y1="18" x2="5" y2="14" />
      <line x1="8.5" y1="18" x2="8.5" y2="10" />
      <line x1="12" y1="18" x2="12" y2="6" />
      <line x1="15.5" y1="18" x2="15.5" y2="10" />
      <line x1="19" y1="18" x2="19" y2="14" />
      <line x1="4" y1="19" x2="20" y2="19" opacity="0.5" />
    </svg>
  );
}
