import { X, Sparkles, Play, Brain, User, FileText, ChevronRight, Shield, Wind, Heart, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EcoBubbleOneEye from './EcoBubbleOneEye';
import { DEFAULT_SUGGESTIONS } from './QuickSuggestions';
import type { LucideIcon } from 'lucide-react';

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

// Map emoji icons to SVG icons
const iconMap: Record<string, LucideIcon> = {
  '🧠': Brain,
  '🌿': Wind,
  '🫶': Heart,
  '🏛️': Building2,
};

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
  onRelatorio
}: EcoAIModalProps) {
  if (!isOpen) return null;

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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E3F5FF] shadow-sm">
                  <EcoBubbleOneEye variant="icon" size={24} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-800">Oi {userName}, que bom te ver!</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Iniciar nova conversa */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Iniciar nova conversa</h3>
                <div className="space-y-3">
                  {/* Card 1: Entrar sem mensagem */}
                  <button
                    onClick={onEnter}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full flex-shrink-0 bg-blue-100 flex items-center justify-center">
                        <Play size={28} className="text-[#6EC8FF]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1">Entrar</h4>
                        <p className="text-sm text-gray-600">Comece sua conversa do jeito que preferir, sem sugestões.</p>
                      </div>
                      <ChevronRight size={20} className="text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform ml-2" />
                    </div>
                  </button>

                  {/* Card 2: Vamos falar sobre meus sentimentos */}
                  <button
                    onClick={onStartSentimentos}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-pink-100">
                        <img
                          src="/images/sentimentos.webp"
                          alt="Sentimentos"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1">Vamos falar sobre meus sentimentos</h4>
                        <p className="text-sm text-gray-600">Como está se sentindo hoje? Vamos falar do seu dia e das suas emoções.</p>
                      </div>
                      <ChevronRight size={20} className="text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform ml-2" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Sugestões */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Sugestões</h3>
                <div className="space-y-3">
                  {/* Primeira sugestão com imagem */}
                  <button
                    onClick={() => onSuggestionClick('Quer checar possíveis vieses hoje?')}
                    className="w-full bg-white rounded-2xl px-4 py-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 text-left group flex items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-[#E3F5FF]">
                      <img
                        src="/images/sugestao-vieses.webp"
                        alt="Vieses"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-gray-700 text-sm flex-1">Quer checar possíveis vieses hoje?</p>
                    <ChevronRight size={18} className="text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform ml-2" />
                  </button>

                  {/* Outras sugestões */}
                  {DEFAULT_SUGGESTIONS.slice(1).map((suggestion, index) => {
                    const IconComponent = iconMap[suggestion.icon || ''] || Brain;
                    const isEstoico = suggestion.label.includes('estoica');
                    const isCoragem = suggestion.label.includes('coragem');
                    const isPresenca = suggestion.label.includes('presença');

                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => onSuggestionClick(suggestion.label)}
                        className="w-full bg-white rounded-2xl px-4 py-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 text-left group flex items-center gap-3"
                      >
                        {isEstoico ? (
                          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-[#E3F5FF]">
                            <img
                              src="/images/sugestao-estoico.webp"
                              alt="Estoico"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : isCoragem ? (
                          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-[#E3F5FF]">
                            <img
                              src="/images/sugestao-coragem.webp"
                              alt="Coragem"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : isPresenca ? (
                          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-[#E3F5FF]">
                            <img
                              src="/images/sugestao-presenca.webp"
                              alt="Presença"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-[#E3F5FF] flex items-center justify-center flex-shrink-0">
                            <IconComponent size={24} className="text-[#6EC8FF]" />
                          </div>
                        )}
                        <p className="text-gray-700 text-sm flex-1">{suggestion.label}</p>
                        <ChevronRight size={18} className="text-gray-400 flex-shrink-0 group-hover:translate-x-1 transition-transform ml-2" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acompanhe sua evolução */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Acompanhe sua evolução</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                {/* Card Memória Emocional */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-md">
                  {/* Image */}
                  <div className="relative h-48 sm:h-52 bg-gradient-to-br from-blue-300 to-blue-500 overflow-hidden">
                    <img
                      src="/images/memoria-emocional-ilustracao.webp"
                      alt="Memória Emocional"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2">Memória Emocional</h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      Capture momentos importantes da sua jornada emocional. Cada memória é analisada pela IA.
                    </p>
                  </div>
                </div>

                {/* Card Perfil Emocional */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-md">
                  {/* Image */}
                  <div className="relative h-48 sm:h-52 bg-gradient-to-br from-[#6EC8FF] to-[#4BA8E0] overflow-hidden">
                    <img
                      src="/images/perfil-emocional-ilustracao.webp"
                      alt="Perfil Emocional"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2">Perfil Emocional</h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      Descubra suas emoções mais frequentes, temas recorrentes e padrões únicos.
                    </p>
                  </div>
                </div>

                {/* Card Relatório */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-md">
                  {/* Image */}
                  <div className="relative h-48 sm:h-52 bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 overflow-hidden">
                    <img
                      src="/images/relatorio-emocional-ilustracao.webp"
                      alt="Relatório Emocional"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2">Relatório Emocional</h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      Explore mapas emocionais em 3D, linha do tempo e gráficos das suas emoções dominantes.
                    </p>
                  </div>
                </div>
                </div>
              </div>

              {/* Privacidade */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className="text-blue-600" />
                  <p className="text-sm text-blue-700 font-semibold">SUA PRIVACIDADE É IMPORTANTE!</p>
                </div>
                <p className="text-xs text-blue-600">
                  Sabemos que você valoriza sua privacidade, e assumimos o compromisso de manter suas conversas em segurança. <span className="underline">Nunca compartilhamos</span> suas informações!
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
