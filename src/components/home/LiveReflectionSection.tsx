import { useState, useEffect } from 'react';

// Avatar data with varied sizes, positions and images
const AVATARS = [
  // Row 1 - Top
  { id: 1, size: 'small', image: '/images/avatars/avatar-1.png', left: '5%', top: '8%', delay: 0 },
  { id: 2, size: 'medium', image: '/images/avatars/avatar-2.png', left: '15%', top: '5%', delay: 0.2 },
  { id: 3, size: 'large', image: '/images/avatars/avatar-3.png', left: '38%', top: '3%', delay: 0.4 },
  { id: 4, size: 'large', image: '/images/avatars/avatar-4.png', left: '62%', top: '3%', delay: 0.6 },
  { id: 5, size: 'medium', image: '/images/avatars/avatar-5.png', left: '85%', top: '5%', delay: 0.8 },
  { id: 6, size: 'small', image: '/images/avatars/avatar-6.png', left: '95%', top: '8%', delay: 1 },

  // Row 2 - Middle-Top
  { id: 7, size: 'medium', image: '/images/avatars/avatar-6.png', left: '25%', top: '25%', delay: 0.3 },
  { id: 8, size: 'medium', image: '/images/avatars/avatar-4.png', left: '75%', top: '25%', delay: 0.9 },

  // Row 3 - Middle-Bottom
  { id: 9, size: 'medium', image: '/images/avatars/avatar-2.png', left: '10%', top: '70%', delay: 0.5 },
  { id: 10, size: 'medium', image: '/images/avatars/avatar-5.png', left: '90%', top: '70%', delay: 1.1 },

  // Row 4 - Bottom
  { id: 11, size: 'small', image: '/images/avatars/avatar-1.png', left: '35%', top: '88%', delay: 0.7 },
  { id: 12, size: 'small', image: '/images/avatars/avatar-3.png', left: '65%', top: '88%', delay: 1.3 }
];

const SIZE_MAP = {
  small: 'w-10 h-10',
  medium: 'w-14 h-14',
  large: 'w-16 h-16'
};

export default function LiveReflectionSection() {
  const [count, setCount] = useState(4182);

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
      <div className="relative overflow-hidden rounded-[32px] bg-white px-8 py-20 md:px-16 md:py-32">

        {/* Floating Avatars Container */}
        <div className="pointer-events-none absolute inset-0">
          {AVATARS.map((avatar) => (
            <div
              key={avatar.id}
              className="absolute"
              style={{
                left: avatar.left,
                top: avatar.top,
                animation: `float-${avatar.id} ${6 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${avatar.delay}s`
              }}
            >
              <img
                src={avatar.image}
                alt={`Avatar ${avatar.id}`}
                className={`${SIZE_MAP[avatar.size as keyof typeof SIZE_MAP]} rounded-full object-cover opacity-90 shadow-lg transition-all duration-300 hover:scale-110 hover:opacity-100`}
                style={{
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
                }}
              />
            </div>
          ))}
        </div>

        {/* Central Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          {/* Counter and Live Badge */}
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-display text-5xl font-bold text-gray-800 md:text-7xl">
              {count.toLocaleString('pt-BR')}
            </h2>
            <div className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 shadow-lg">
              <div className="h-2 w-2 animate-pulse rounded-full bg-white"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white">
                AO VIVO
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-lg font-medium text-gray-600 md:text-xl">
            Pessoas refletindo com a Eco agora
          </p>
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
