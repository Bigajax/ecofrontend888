import { Fragment } from 'react';
import { X, Play, ChevronRight, Shield, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_SUGGESTIONS } from './QuickSuggestions';

interface EcoAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnter: () => void;
  userName: string;
  onStartSentimentos: () => void;
  onSugerirConteudo: () => void;
  onSuggestionClick: (text: string) => void;
  onMemoriaEmocional: () => void;
  onPerfilEmocional: () => void;
  onRelatorio: () => void;
}

export default function EcoAIModal({
  isOpen,
  onClose,
  onEnter,
  userName,
  onStartSentimentos,
  onSugerirConteudo,
  onSuggestionClick,
  onMemoriaEmocional,
  onPerfilEmocional,
  onRelatorio,
}: EcoAIModalProps) {
  if (!isOpen) return null;

  const firstName = userName.split(' ')[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed inset-x-0 bottom-0 top-[calc(env(safe-area-inset-top)+2.5rem)] z-50 flex flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:inset-8 md:rounded-3xl lg:inset-16"
          >
            {/* Header fixo: saudação + fechar */}
            <div
              className="flex items-center justify-between gap-3 px-5 py-4"
              style={{ background: 'linear-gradient(180deg, #EEF4FF 0%, #FFFFFF 100%)' }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src="/images/eco-ai-icon.webp"
                  alt="Eco IA"
                  width="56"
                  height="56"
                  className="h-14 w-14 flex-shrink-0 object-contain"
                  style={{ filter: 'drop-shadow(0 4px 10px rgba(110, 200, 255, 0.35))' }}
                />
                <p className="truncate text-[18px] font-bold text-gray-900">
                  Oi {firstName}, que bom te ver! 👋
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 space-y-7 overflow-y-auto px-5 pb-8 pt-4">
              {/* Iniciar nova conversa */}
              <section>
                <h3 className="mb-3 text-[22px] font-extrabold tracking-tight text-gray-900">
                  Iniciar nova conversa
                </h3>
                <div className="space-y-3">
                  <ActionCard
                    onClick={onStartSentimentos}
                    media={
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-pink-100">
                        <img
                          src="/images/sentimentos.webp"
                          alt="Sentimentos"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    }
                    title="Vamos falar sobre meus sentimentos"
                    description="Como está se sentindo hoje? Vamos falar do seu dia e das suas emoções."
                  />
                  <ActionCard
                    onClick={onSugerirConteudo}
                    media={
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <Play size={26} className="text-[#6EC8FF]" fill="#6EC8FF" />
                      </div>
                    }
                    title="Sugerir conteúdo"
                    description="Fale com a ECO e receba uma recomendação de conteúdo precisa."
                  />
                </div>
              </section>

              {/* Sugestões */}
              <section>
                <h3 className="mb-3 text-[22px] font-extrabold tracking-tight text-gray-900">
                  Sugestões
                </h3>
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                  {DEFAULT_SUGGESTIONS.map((s, i) => (
                    <Fragment key={s.id}>
                      <button
                        onClick={() => onSuggestionClick(s.label)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
                      >
                        <span className="text-[20px] leading-none">{s.icon}</span>
                        <p className="flex-1 text-[15px] leading-snug text-gray-700">{s.label}</p>
                        <ChevronRight size={18} className="flex-shrink-0 text-gray-300" />
                      </button>
                      {i < DEFAULT_SUGGESTIONS.length - 1 && (
                        <div className="mx-4 border-t border-gray-100" />
                      )}
                    </Fragment>
                  ))}
                </div>
              </section>

              {/* Conversas anteriores */}
              <button
                onClick={onEnter}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left transition-colors hover:bg-gray-50"
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] bg-gray-100">
                  <MessageSquare size={20} className="text-gray-600" />
                </span>
                <p className="flex-1 text-[17px] font-bold text-gray-900">Conversas anteriores</p>
                <ChevronRight size={18} className="flex-shrink-0 text-gray-300" />
              </button>

              {/* Acompanhe sua evolução */}
              <section>
                <h3 className="mb-3 text-[22px] font-extrabold tracking-tight text-gray-900">
                  Acompanhe sua evolução
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <EvolutionCard
                    onClick={onMemoriaEmocional}
                    image="/images/memoria-emocional-ilustracao.webp"
                    gradient="from-blue-300 to-blue-500"
                    title="Memória Emocional"
                    description="Capture momentos importantes da sua jornada emocional. Cada memória é analisada pela IA."
                  />
                  <EvolutionCard
                    onClick={onPerfilEmocional}
                    image="/images/perfil-emocional-ilustracao.webp"
                    gradient="from-[#6EC8FF] to-[#4BA8E0]"
                    title="Perfil Emocional"
                    description="Descubra suas emoções mais frequentes, temas recorrentes e padrões únicos."
                  />
                  <EvolutionCard
                    onClick={onRelatorio}
                    image="/images/relatorio-emocional-ilustracao.webp"
                    gradient="from-green-400 via-emerald-500 to-green-600"
                    title="Relatório Emocional"
                    description="Explore mapas emocionais em 3D, linha do tempo e gráficos das suas emoções dominantes."
                  />
                </div>
              </section>

              {/* Privacidade */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="mb-1.5 flex items-center gap-2">
                  <Shield size={16} className="text-blue-600" />
                  <p className="text-[13px] font-bold uppercase tracking-wide text-blue-600">
                    Sua privacidade é importante!
                  </p>
                </div>
                <p className="text-[13px] leading-relaxed text-gray-500">
                  Sabemos que você valoriza sua privacidade, e assumimos o compromisso de manter
                  suas conversas em segurança. <span className="underline">Nunca compartilhamos</span>{' '}
                  suas informações!
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ActionCardProps {
  onClick: () => void;
  media: React.ReactNode;
  title: string;
  description: string;
}

function ActionCard({ onClick, media, title, description }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left transition-colors hover:bg-gray-50"
    >
      {media}
      <div className="min-w-0 flex-1">
        <h4 className="text-[17px] font-bold leading-snug text-gray-900">{title}</h4>
        <p className="mt-0.5 text-[14px] leading-snug text-gray-500">{description}</p>
      </div>
    </button>
  );
}

interface EvolutionCardProps {
  onClick: () => void;
  image: string;
  gradient: string;
  title: string;
  description: string;
}

function EvolutionCard({ onClick, image, gradient, title, description }: EvolutionCardProps) {
  return (
    <button
      onClick={onClick}
      className="overflow-hidden rounded-3xl border border-gray-100 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${gradient}`}>
        <img src={image} alt={title} className="h-full w-full object-cover" />
      </div>
      <div className="p-4">
        <h3 className="mb-1.5 text-[16px] font-bold text-gray-900">{title}</h3>
        <p className="text-[13px] leading-relaxed text-gray-500">{description}</p>
      </div>
    </button>
  );
}
