import { ChevronRight } from 'lucide-react';
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
  const dayOfWeek = brasiliaTime.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab

  // Segunda-feira de manhã/tarde
  if (dayOfWeek === 1 && hour < 15) {
    return `Segunda-feira tem esse peso. Quer começar com 5 minutos só seus?`;
  }

  // Usuário com sessões concluídas
  if (totalSessions > 0) {
    return `${firstName}, você já completou ${totalSessions} ${totalSessions === 1 ? 'sessão' : 'sessões'}. Como está indo por dentro?`;
  }

  // Contextual por hora
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
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Title with Progress Indicator */}
      <div className="mb-8 pb-6 flex items-start gap-3" style={{ borderBottom: '1px solid rgba(110,200,255,0.14)' }}>
        <div className="mt-1 w-1 h-6 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #6EC8FF, #4BAEE8)' }} />
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
            A Eco lembra de você.
          </h2>
          <p className="mt-1 text-[13px] text-[var(--eco-muted)]">
            Não é um chatbot. É presença de verdade.
          </p>
        </div>
      </div>

      {/* Card */}
      <motion.button
        onClick={onStartChat}
        className="group w-full max-w-xs overflow-hidden rounded-2xl bg-white p-4 md:p-5"
        style={{ border: '1px solid rgba(110,200,255,0.22)', boxShadow: '0 4px 24px rgba(110,200,255,0.10)' }}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.1 }}
        whileHover={{ y: -3, boxShadow: '0 8px 32px rgba(110,200,255,0.20)' }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: Avatar + Text */}
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110"
              style={{ background: 'rgba(110,200,255,0.12)', border: '1px solid rgba(110,200,255,0.22)' }}>
              <EcoBubbleOneEye variant="icon" size={24} />
            </div>

            {/* Text Content */}
            <div className="text-left">
              <h3 className="font-display text-lg font-normal text-[var(--eco-text)]">
                Eco
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--eco-muted)]">
                {message}
              </p>
            </div>
          </div>

          {/* Right: Arrow Icon */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300"
            style={{ background: 'rgba(110,200,255,0.10)', border: '1px solid rgba(110,200,255,0.20)' }}>
            <ChevronRight
              size={16}
              strokeWidth={2}
              className="text-[var(--eco-user)] transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </div>
        </div>
      </motion.button>
    </section>
  );
}
