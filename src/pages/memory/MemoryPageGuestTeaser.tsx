/**
 * MemoryPageGuestTeaser Component
 *
 * Preview page para Memória/Perfil Emocional em guest mode
 * Mostra placeholders com blur + lista de features desbloqueadas
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';
import { useGuestExperience } from '@/contexts/GuestExperienceContext';
import { useGuestConversionTriggers, ConversionSignals } from '@/hooks/useGuestConversionTriggers';
import EmotionalMapPlaceholder from '@/components/memory/EmotionalMapPlaceholder';
import TimelinePlaceholder from '@/components/memory/TimelinePlaceholder';
import ThemeChartPlaceholder from '@/components/memory/ThemeChartPlaceholder';
import HomeHeader from '@/components/home/HomeHeader';
import { useEffect } from 'react';

export default function MemoryPageGuestTeaser() {
  const navigate = useNavigate();
  const { trackInteraction, trackProfileClick } = useGuestExperience();
  const { checkTrigger } = useGuestConversionTriggers();

  useEffect(() => {
    // Track visualização da teaser page
    trackInteraction('page_view', {
      page: '/memory-teaser',
      context: 'guest',
    });

    // Track profile click (já que chegaram até aqui)
    trackProfileClick();

    // Trigger conversão imediata - alta intenção
    checkTrigger(ConversionSignals.profileClick());
  }, [trackInteraction, trackProfileClick, checkTrigger]);

  const handleCreateAccount = () => {
    trackInteraction('conversion_cta_clicked', {
      source: 'memory_teaser',
      trigger: 'primary_button',
    });

    navigate('/register?returnTo=/app/memory');
  };

  return (
    <div className="min-h-screen bg-white font-primary">
      {/* Header */}
      <HomeHeader />

      <main className="relative mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/app')}
          className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--eco-text)] shadow-md border border-[var(--eco-line)] transition-all hover:bg-gray-50 hover:shadow-lg active:scale-95 md:left-8 md:top-8"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 space-y-4 pt-16 md:pt-4"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-eco-accent/20 to-eco-user/20 flex items-center justify-center shadow-md">
              <Lock size={32} className="text-eco-accent" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-normal text-[var(--eco-text)] md:text-5xl">
                Seu Perfil Emocional
              </h1>
              <p className="mt-2 text-lg text-[var(--eco-muted)]">
                Descubra padrões nas suas emoções ao longo do tempo
              </p>
            </div>
          </div>
        </motion.div>

        {/* Chart Previews Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-12 grid gap-6 md:grid-cols-2"
        >
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--eco-text)] uppercase tracking-wide">
              Mapa Emocional
            </h3>
            <EmotionalMapPlaceholder />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--eco-text)] uppercase tracking-wide">
              Linha do Tempo
            </h3>
            <TimelinePlaceholder />
          </div>

          <div className="space-y-3 md:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--eco-text)] uppercase tracking-wide">
              Temas das Conversas
            </h3>
            <ThemeChartPlaceholder />
          </div>
        </motion.div>

        {/* Feature List + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="rounded-2xl border-2 border-eco-accent/30 bg-gradient-to-br from-eco-accent/5 to-eco-user/5 p-8 shadow-lg"
        >
          <h2 className="font-display text-3xl font-normal text-[var(--eco-text)] mb-6">
            Crie sua conta para desbloquear:
          </h2>

          <ul className="space-y-4 mb-8">
            <li className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">📊</span>
              <div>
                <p className="font-semibold text-[var(--eco-text)]">
                  Mapa emocional em tempo real
                </p>
                <p className="text-sm text-[var(--eco-muted)] mt-1">
                  Visualize a distribuição das suas emoções e como elas evoluem
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">📈</span>
              <div>
                <p className="font-semibold text-[var(--eco-text)]">
                  Linha do tempo das emoções
                </p>
                <p className="text-sm text-[var(--eco-muted)] mt-1">
                  Acompanhe suas tendências emocionais ao longo dos dias e semanas
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">💭</span>
              <div>
                <p className="font-semibold text-[var(--eco-text)]">
                  Memórias organizadas por tema
                </p>
                <p className="text-sm text-[var(--eco-muted)] mt-1">
                  Todos os momentos importantes categorizados automaticamente
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🎯</span>
              <div>
                <p className="font-semibold text-[var(--eco-text)]">
                  Insights sobre padrões
                </p>
                <p className="text-sm text-[var(--eco-muted)] mt-1">
                  Descubra conexões entre suas emoções, contextos e comportamentos
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🔒</span>
              <div>
                <p className="font-semibold text-[var(--eco-text)]">
                  Dados privados e criptografados
                </p>
                <p className="text-sm text-[var(--eco-muted)] mt-1">
                  Sua jornada emocional permanece completamente privada e segura
                </p>
              </div>
            </li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button
              onClick={handleCreateAccount}
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-eco-user to-eco-accent px-8 py-4 font-semibold text-white text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_30px_rgba(167,132,108,0.3)] active:scale-95"
            >
              Criar minha conta
            </button>

            <p className="text-sm text-[var(--eco-muted)] text-center sm:text-left">
              Sempre gratuito • Sem compromisso • 30 segundos
            </p>
          </div>
        </motion.div>

        {/* Additional Context */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-[var(--eco-muted)] leading-relaxed max-w-2xl mx-auto">
            Seu perfil emocional está se formando a cada conversa com Eco.
            Crie sua conta para visualizar padrões, organizar memórias e entender sua jornada interior.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
