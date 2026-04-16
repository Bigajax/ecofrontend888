import { motion } from 'framer-motion';
import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

interface EcoAIGuidanceCardProps {
  userName: string;
  totalSessions?: number;
  onStartChat: () => void;
}

function getContextualMessage(firstName: string, totalSessions: number): string {
  const now = new Date();
  const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hour = brasiliaTime.getHours();
  const dayOfWeek = brasiliaTime.getDay();

  if (dayOfWeek === 1 && hour < 15) {
    return `Segunda-feira tem esse peso. Quer começar com 5 minutos só seus?`;
  }
  if (totalSessions > 0) {
    return `Você já completou ${totalSessions} ${totalSessions === 1 ? 'sessão' : 'sessões'}. Como está indo por dentro?`;
  }
  if (hour >= 5 && hour < 12) {
    return `Como você acorda hoje, ${firstName}?`;
  } else if (hour >= 12 && hour < 18) {
    return `${firstName}, você fez uma pausa hoje? Estou aqui.`;
  } else {
    return `Como foi hoje, ${firstName}? Pode falar.`;
  }
}

export default function EcoAIGuidanceCard({
  userName,
  totalSessions = 0,
  onStartChat,
}: EcoAIGuidanceCardProps) {
  const firstName = userName.split(' ')[0];
  const message = getContextualMessage(firstName, totalSessions);

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <motion.button
        onClick={onStartChat}
        className="group relative w-full overflow-hidden rounded-3xl text-left"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ type: 'spring', stiffness: 70, damping: 20, delay: 0.1 }}
        whileHover={{ scale: 1.008 }}
        whileTap={{ scale: 0.995 }}
        style={{
          background: 'linear-gradient(135deg, #07192E 0%, #0D2E4F 35%, #103A62 65%, #0F4476 100%)',
          boxShadow: '0 20px 60px rgba(7,25,46,0.45), 0 4px 16px rgba(110,200,255,0.12)',
        }}
      >
        {/* Glow orbs */}
        <div
          className="pointer-events-none absolute"
          style={{
            top: '-60px', right: '-40px',
            width: '280px', height: '280px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(110,200,255,0.18) 0%, transparent 65%)',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            bottom: '-80px', left: '-20px',
            width: '220px', height: '220px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(75,174,232,0.12) 0%, transparent 65%)',
          }}
        />

        {/* Subtle star dots */}
        {[
          { top: '18%', left: '12%', size: 2, opacity: 0.4 },
          { top: '60%', left: '28%', size: 1.5, opacity: 0.3 },
          { top: '30%', left: '55%', size: 2, opacity: 0.25 },
          { top: '72%', left: '70%', size: 1.5, opacity: 0.35 },
          { top: '15%', left: '80%', size: 2, opacity: 0.3 },
        ].map((dot, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full bg-white"
            style={{
              top: dot.top, left: dot.left,
              width: dot.size, height: dot.size,
              opacity: dot.opacity,
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-4 px-6 py-7 sm:flex-row sm:items-center sm:gap-6 md:px-8 md:py-8">
          {/* Avatar with glow ring */}
          <div className="flex-shrink-0 self-start sm:self-auto">
            <div
              className="relative flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
              style={{
                background: 'rgba(110,200,255,0.14)',
                border: '1px solid rgba(110,200,255,0.28)',
                boxShadow: '0 0 24px rgba(110,200,255,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <EcoBubbleOneEye variant="icon" size={32} />
              {/* Pulse ring */}
              <div
                className="absolute inset-[-4px] animate-ping rounded-2xl opacity-20"
                style={{ border: '1px solid rgba(110,200,255,0.8)', animationDuration: '3s' }}
              />
            </div>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6EC8FF]/70 mb-1.5">
              ECO AI — Sua companheira de jornada
            </p>
            <p className="font-display text-[20px] font-semibold leading-snug text-white sm:text-[22px]">
              {message}
            </p>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0">
            <div
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-bold transition-all duration-200 group-hover:scale-105"
              style={{
                background: 'rgba(110,200,255,0.18)',
                border: '1px solid rgba(110,200,255,0.35)',
                color: '#E8F7FF',
                boxShadow: '0 0 16px rgba(110,200,255,0.15)',
                backdropFilter: 'blur(8px)',
              }}
            >
              Conversar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom shimmer line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(110,200,255,0.30), transparent)' }}
        />
      </motion.button>
    </section>
  );
}
