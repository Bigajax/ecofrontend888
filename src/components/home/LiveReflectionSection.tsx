import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Avatar data with varied sizes, positions, images and colors - Cada avatar aparece apenas 1 vez
// Posições responsivas: mobile (default) e desktop (md)
const AVATARS = [
  // Row 1 - Top
  {
    id: 1, size: 'small', image: '/images/avatars/avatar-1.webp',
    mobile: { left: '10%', top: '10%' }, desktop: { left: '8%', top: '12%' },
    delay: 0, color: '#FF6B6B' // Vermelho coral
  },
  {
    id: 2, size: 'medium', image: '/images/avatars/avatar-2.webp',
    mobile: { left: '22%', top: '6%' }, desktop: { left: '18%', top: '8%' },
    delay: 0.2, color: '#4ECDC4' // Turquesa
  },
  {
    id: 3, size: 'large', image: '/images/avatars/avatar-3.webp',
    mobile: { left: '40%', top: '4%' }, desktop: { left: '38%', top: '6%' },
    delay: 0.4, color: '#FFD93D' // Amarelo dourado
  },
  {
    id: 4, size: 'large', image: '/images/avatars/avatar-4.webp',
    mobile: { left: '58%', top: '4%' }, desktop: { left: '60%', top: '6%' },
    delay: 0.6, color: '#6BCF7F' // Verde menta
  },
  {
    id: 5, size: 'medium', image: '/images/avatars/avatar-5.webp',
    mobile: { left: '76%', top: '6%' }, desktop: { left: '80%', top: '8%' },
    delay: 0.8, color: '#A78BFA' // Roxo lavanda
  },
  {
    id: 6, size: 'small', image: '/images/avatars/avatar-6.webp',
    mobile: { left: '88%', top: '10%' }, desktop: { left: '90%', top: '12%' },
    delay: 1, color: '#F472B6' // Rosa pink
  },

  // Row 2 - Middle-Top
  {
    id: 7, size: 'medium', image: '/images/avatars/avatar-7.webp',
    mobile: { left: '30%', top: '26%' }, desktop: { left: '28%', top: '28%' },
    delay: 0.3, color: '#FBBF24' // Âmbar/ouro
  },
  {
    id: 8, size: 'medium', image: '/images/avatars/avatar-8.webp',
    mobile: { left: '68%', top: '26%' }, desktop: { left: '72%', top: '28%' },
    delay: 0.9, color: '#34D399' // Verde esmeralda
  },

  // Row 3 - Middle-Bottom
  {
    id: 11, size: 'medium', image: '/images/avatars/avatar-11.webp',
    mobile: { left: '18%', top: '70%' }, desktop: { left: '15%', top: '68%' },
    delay: 1.1, color: '#FB923C' // Laranja vibrante
  },
  {
    id: 12, size: 'medium', image: '/images/avatars/avatar-12.webp',
    mobile: { left: '80%', top: '70%' }, desktop: { left: '85%', top: '68%' },
    delay: 1.3, color: '#0EA5E9' // Azul céu
  },

  // Row 4 - Bottom
  {
    id: 9, size: 'medium', image: '/images/avatars/avatar-9.webp',
    mobile: { left: '40%', top: '86%' }, desktop: { left: '38%', top: '82%' },
    delay: 0.5, color: '#EC4899' // Rosa magenta
  },
  {
    id: 10, size: 'medium', image: '/images/avatars/avatar-10.webp',
    mobile: { left: '58%', top: '86%' }, desktop: { left: '62%', top: '82%' },
    delay: 0.7, color: '#8B5CF6' // Roxo violeta
  }
];

const SIZE_MAP = {
  small: 'w-6 h-6 md:w-10 md:h-10',
  medium: 'w-8 h-8 md:w-14 md:h-14',
  large: 'w-10 h-10 md:w-16 md:h-16'
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
    <section className="relative mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
      {/* White Background Container */}
      <div className="relative overflow-hidden rounded-[32px] bg-white px-6 py-16 sm:px-8 sm:py-20 md:px-16 md:py-32">

        {/* Floating Avatars Container */}
        <div className="pointer-events-none absolute inset-0">
          {AVATARS.map((avatar) => {
            const position = isMobile ? avatar.mobile : avatar.desktop;
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
                  className={`${SIZE_MAP[avatar.size as keyof typeof SIZE_MAP]} rounded-full object-cover opacity-60 sm:opacity-80 md:opacity-90 shadow-md md:shadow-lg transition-all duration-300 hover:scale-110 hover:opacity-100`}
                  style={{
                    boxShadow: `0 0 0 3px ${avatar.color}, 0 4px 20px rgba(0, 0, 0, 0.08)`,
                    border: `3px solid ${avatar.color}`
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Central Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-8 sm:px-2">
          {/* Main message */}
          <p className="text-base sm:text-lg font-medium text-gray-600 md:text-xl mb-6 max-w-xs">
            Você nunca medita sozinho no Ecotopia.
          </p>

          {/* Counter and Live Badge */}
          <div className="mb-3 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-gray-800 md:text-7xl">
              {count.toLocaleString('pt-BR')}
            </h2>
            <div className="flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-lg">
              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 animate-pulse rounded-full bg-white"></div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white">
                AO VIVO
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg font-medium text-gray-600 md:text-xl mb-8">
            pessoas estão aqui agora.
          </p>

          {/* CTA */}
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--eco-user)] px-6 py-3 text-[15px] font-semibold text-white shadow-md transition-all duration-300 hover:bg-[var(--eco-user)]/90 hover:scale-105 active:scale-95"
          >
            Junte-se a elas →
          </button>
        </div>

        {/* Keyframes for floating animations */}
        <style>{`
          ${AVATARS.map((avatar) => `
            @keyframes float-${avatar.id} {
              0%, 100% {
                transform: translateY(0px) translateX(0px);
              }
              33% {
                transform: translateY(-6px) translateX(4px);
              }
              66% {
                transform: translateY(4px) translateX(-4px);
              }
            }
          `).join('\n')}
        `}</style>
      </div>
    </section>
  );
}
