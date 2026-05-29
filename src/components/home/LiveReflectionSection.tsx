import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Avatar data with varied sizes, positions, images and colors - Cada avatar aparece apenas 1 vez
// Posições responsivas: mobile (default) e desktop (md)
const AVATARS = [
  // Row 1 - Top (no mobile fica nos cantos, fora da área do título)
  {
    id: 1, size: 'small', image: '/images/avatars/avatar-1.webp',
    mobile: { left: '4%', top: '6%' }, desktop: { left: '8%', top: '12%' },
    delay: 0, color: '#FF6B6B' // Vermelho coral
  },
  {
    id: 2, size: 'medium', image: '/images/avatars/avatar-2.webp',
    mobile: { left: '18%', top: '4%' }, desktop: { left: '18%', top: '8%' },
    delay: 0.2, color: '#4ECDC4' // Turquesa
  },
  {
    id: 3, size: 'large', image: '/images/avatars/avatar-3.webp',
    mobile: { left: '40%', top: '4%' }, desktop: { left: '38%', top: '6%' },
    delay: 0.4, color: '#FFD93D' // Amarelo dourado
  },
  {
    id: 4, size: 'large', image: '/images/avatars/avatar-4.webp',
    mobile: { left: '60%', top: '4%' }, desktop: { left: '60%', top: '6%' },
    delay: 0.6, color: '#6BCF7F' // Verde menta
  },
  {
    id: 5, size: 'medium', image: '/images/avatars/avatar-5.webp',
    mobile: { left: '78%', top: '4%' }, desktop: { left: '80%', top: '8%' },
    delay: 0.8, color: '#A78BFA' // Roxo lavanda
  },
  {
    id: 6, size: 'small', image: '/images/avatars/avatar-6.webp',
    mobile: { left: '90%', top: '6%' }, desktop: { left: '90%', top: '12%' },
    delay: 1, color: '#F472B6' // Rosa pink
  },

  // Row 2 - Middle-Top (escondido no mobile pra não colidir com o número)
  {
    id: 7, size: 'medium', image: '/images/avatars/avatar-7.webp',
    mobile: null, desktop: { left: '28%', top: '28%' },
    delay: 0.3, color: '#FBBF24' // Âmbar/ouro
  },
  {
    id: 8, size: 'medium', image: '/images/avatars/avatar-8.webp',
    mobile: null, desktop: { left: '72%', top: '28%' },
    delay: 0.9, color: '#34D399' // Verde esmeralda
  },

  // Row 3 - Middle-Bottom (escondido no mobile)
  {
    id: 11, size: 'medium', image: '/images/avatars/avatar-11.webp',
    mobile: null, desktop: { left: '15%', top: '68%' },
    delay: 1.1, color: '#FB923C' // Laranja vibrante
  },
  {
    id: 12, size: 'medium', image: '/images/avatars/avatar-12.webp',
    mobile: null, desktop: { left: '85%', top: '68%' },
    delay: 1.3, color: '#0EA5E9' // Azul céu
  },

  // Row 4 - Bottom (no mobile fica nos cantos inferiores)
  {
    id: 9, size: 'small', image: '/images/avatars/avatar-9.webp',
    mobile: { left: '6%', top: '88%' }, desktop: { left: '38%', top: '82%' },
    delay: 0.5, color: '#EC4899' // Rosa magenta
  },
  {
    id: 10, size: 'small', image: '/images/avatars/avatar-10.webp',
    mobile: { left: '88%', top: '88%' }, desktop: { left: '62%', top: '82%' },
    delay: 0.7, color: '#8B5CF6' // Roxo violeta
  }
];

const SIZE_MAP = {
  small: 'w-7 h-7 md:w-10 md:h-10',
  medium: 'w-9 h-9 md:w-14 md:h-14',
  large: 'w-11 h-11 md:w-16 md:h-16'
};

export default function LiveReflectionSection() {
  const navigate = useNavigate();
  const [count, setCount] = useState(4182);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update counter every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const increment = Math.random() < 0.33 ? 0 : Math.random() < 0.5 ? 1 : 2;
      setCount(prev => prev + increment);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Compact horizontal card */}
      <div
        className="relative overflow-hidden rounded-3xl bg-white px-6 pt-20 pb-20 sm:px-8 sm:py-10 md:px-12 md:py-10"
        style={{ border: '1px solid rgba(110,200,255,0.20)', boxShadow: '0 4px 32px rgba(110,200,255,0.10)' }}
      >
        {/* Floating Avatars — distribuídos nos cantos no mobile, espalhados no desktop */}
        <div className="pointer-events-none absolute inset-0">
          {AVATARS.filter((a) => (isMobile ? a.mobile : a.desktop)).map((avatar) => {
            const position = isMobile ? avatar.mobile! : avatar.desktop;
            return (
              <div
                key={avatar.id}
                className="absolute"
                style={{
                  left: position.left,
                  top: position.top,
                  animationName: `float-${avatar.id}`,
                  animationDuration: `${6 + Math.random() * 2}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${avatar.delay}s`
                }}
              >
                <img
                  src={avatar.image}
                  alt={`Avatar ${avatar.id}`}
                  loading="lazy"
                  className={`${SIZE_MAP[avatar.size as keyof typeof SIZE_MAP]} rounded-full object-cover opacity-60 sm:opacity-75 md:opacity-85 shadow-md transition-all duration-300`}
                  style={{
                    boxShadow: `0 0 0 2px ${avatar.color}, 0 4px 16px rgba(0,0,0,0.08)`,
                    border: `2px solid ${avatar.color}`
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Central Content — compact horizontal layout */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center gap-3">
          <p className="text-[15px] font-medium text-gray-500 max-w-xs">
            Você não está sozinho(a) nessa jornada.
          </p>

          <div className="flex items-center gap-3">
            <h2 className="font-display text-3xl sm:text-4xl font-bold" style={{ color: '#1A5C8A' }}>
              {count.toLocaleString('pt-BR')}
            </h2>
            <div className="flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 shadow-md">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white">
                AO VIVO
              </span>
            </div>
          </div>

          <p className="text-[15px] font-medium text-gray-500">
            pessoas estão transformando suas vidas com a Ecotopia.
          </p>

          <button
            onClick={() => navigate('/app')}
            className="mt-1 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6EC8FF, #4BAEE8)', boxShadow: '0 4px 18px rgba(110,200,255,0.40)' }}
          >
            Junte-se a elas →
          </button>
        </div>

        <style>{`
          ${AVATARS.map((avatar) => `
            @keyframes float-${avatar.id} {
              0%, 100% { transform: translateY(0px) translateX(0px); }
              33% { transform: translateY(-5px) translateX(3px); }
              66% { transform: translateY(3px) translateX(-3px); }
            }
          `).join('\n')}
        `}</style>
      </div>
    </section>
  );
}
