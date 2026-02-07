/**
 * WelcomeScreen Component
 *
 * Tela de boas-vindas pós-signup mostrando continuidade
 * Exibe dados preservados (chat, favoritos, progresso rings, etc.)
 */

import { motion } from 'framer-motion';
import { MessageCircle, Star, Target, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PreservedData {
  chatMessages?: number;
  favorites?: number;
  ringsDay?: number;
  meditationProgress?: boolean;
}

interface WelcomeScreenProps {
  preservedData?: PreservedData;
  onContinue: () => void;
}

export default function WelcomeScreen({ preservedData, onContinue }: WelcomeScreenProps) {
  const { user } = useAuth();

  // Extrair primeiro nome do email ou metadata
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Bem-vindo';

  const hasPreservedData =
    (preservedData?.chatMessages ?? 0) > 0 ||
    (preservedData?.favorites ?? 0) > 0 ||
    (preservedData?.ringsDay ?? 0) > 0 ||
    preservedData?.meditationProgress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-purple-50/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-8 space-y-6">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex justify-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-[0_8px_24px_rgba(34,197,94,0.3)]">
              <Check size={40} className="text-white" strokeWidth={3} />
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center space-y-2"
          >
            <h1 className="font-display text-3xl font-normal text-[var(--eco-text)]">
              Bem-vindo, {userName}!
            </h1>
            <p className="text-base text-[var(--eco-muted)]">
              {hasPreservedData
                ? 'Sua jornada continua exatamente de onde parou.'
                : 'Sua jornada no ECOTOPIA começa agora.'}
            </p>
          </motion.div>

          {/* Preserved Data List */}
          {hasPreservedData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="space-y-3"
            >
              <p className="text-sm font-medium text-[var(--eco-text)] text-center">
                Dados preservados:
              </p>

              <div className="space-y-2">
                {(preservedData?.chatMessages ?? 0) > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/80 border border-blue-100">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <MessageCircle size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--eco-text)]">
                        Conversa com Eco preservada
                      </p>
                      <p className="text-xs text-[var(--eco-muted)]">
                        {preservedData.chatMessages} mensagens salvas
                      </p>
                    </div>
                  </div>
                )}

                {(preservedData?.favorites ?? 0) > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/80 border border-amber-100">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Star size={20} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--eco-text)]">
                        Favoritos guardados
                      </p>
                      <p className="text-xs text-[var(--eco-muted)]">
                        {preservedData.favorites} {preservedData.favorites === 1 ? 'item salvo' : 'itens salvos'}
                      </p>
                    </div>
                  </div>
                )}

                {(preservedData?.ringsDay ?? 0) > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/80 border border-purple-100">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Target size={20} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--eco-text)]">
                        Five Rings em andamento
                      </p>
                      <p className="text-xs text-[var(--eco-muted)]">
                        Dia {preservedData.ringsDay} de 30 — continue seu ritual
                      </p>
                    </div>
                  </div>
                )}

                {preservedData?.meditationProgress && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50/80 border border-green-100">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-lg">🧘</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--eco-text)]">
                        Progresso de meditação salvo
                      </p>
                      <p className="text-xs text-[var(--eco-muted)]">
                        Retome suas práticas de onde parou
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <button
              onClick={onContinue}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-eco-user to-eco-accent text-white font-semibold text-base shadow-[0_8px_24px_rgba(167,132,108,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_32px_rgba(167,132,108,0.4)] active:scale-95"
            >
              {hasPreservedData ? 'Continuar minha jornada' : 'Começar minha jornada'}
            </button>
          </motion.div>

          {/* Footer Message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-xs text-center text-[var(--eco-muted)]"
          >
            Este espaço agora é seu. Ele crescerá com você.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
