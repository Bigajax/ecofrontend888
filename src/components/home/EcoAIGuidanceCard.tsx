import { ChevronRight } from 'lucide-react';
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
    return `Segunda-feira pode pesar. Que tal a gente começar com 5 minutos para você?`;
  }

  // Usuário com sessões concluídas
  if (totalSessions > 0) {
    return `${firstName}, você já completou ${totalSessions} ${totalSessions === 1 ? 'sessão' : 'sessões'}. Como está indo por dentro?`;
  }

  // Contextual por hora
  if (hour >= 5 && hour < 12) {
    return `Oi, ${firstName}. Como está sendo sua manhã? Posso te ajudar a começá-la bem.`;
  } else if (hour >= 12 && hour < 18) {
    return `Oi, ${firstName}. Senti que você ainda não fez uma pausa hoje. Quer falar sobre como está sendo o seu dia?`;
  } else {
    return `Oi, ${firstName}. Como foi o seu dia? Estou aqui para ouvir.`;
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
      <div className="mb-8 pb-6 border-b border-[var(--eco-line)]">
        <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
          A Eco te conhece. Fale com ela agora.
        </h2>
        <p className="mt-2 text-[13px] text-[var(--eco-muted)]">
          Uma IA treinada para te acompanhar — sem script, sem roteiro fixo.
        </p>
      </div>

      {/* Card */}
      <button
        onClick={onStartChat}
        className="group w-full max-w-xs overflow-hidden rounded-2xl border border-[var(--eco-line)] bg-transparent p-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:translate-y-0 md:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: Avatar + Text */}
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/60 shadow-[0_4px_15px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-all duration-300 group-hover:scale-110">
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
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/60 backdrop-blur-sm transition-all duration-300 group-hover:bg-white">
            <ChevronRight
              size={16}
              strokeWidth={2}
              className="text-[var(--eco-user)] transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </div>
        </div>
      </button>
    </section>
  );
}
