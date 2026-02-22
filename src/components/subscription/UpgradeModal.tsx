// src/components/subscription/UpgradeModal.tsx
// Modal premium full-screen — inspirado na referência Meditopia, azul bebê

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSubscription } from '../../api/subscription';
import mixpanel from '../../lib/mixpanel';
import {
  trackPremiumScreenViewed,
  trackPremiumCardClicked,
  trackCheckoutStarted,
} from '../../lib/mixpanelConversionEvents';
import { useAuth } from '../../contexts/AuthContext';
import { usePremiumContent } from '../../hooks/usePremiumContent';
import { UPGRADE_CONTEXT_COPY, resolveUpgradeSource } from '../../constants/upgradeContextCopy';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  source?: string;
}

type ModalState = 'idle' | 'loading' | 'error';

const PROGRAM_EXAMPLES = [
  { image: '/images/meditacao-caleidoscopio.webp', title: 'Caleidoscópio Mind Movie' },
  { image: '/images/quem-pensa-enriquece.webp',    title: 'Quem Pensa Enriquece' },
  { image: '/images/meditacao-sono.webp',           title: 'Meditação do Sono' },
  { image: '/images/five-rings-visual.webp',        title: 'Five Rings' },
  { image: '/images/diario-estoico.webp',           title: 'Diário Estoico' },
];

const TESTIMONIALS = [
  {
    initials: 'MC',
    name: 'Maria Clara',
    since: 'Premium · 6 meses',
    text: 'As meditações me ajudaram a dormir melhor e o Five Rings trouxe clareza para meus dias. Melhor investimento que já fiz.',
    stars: 5,
  },
  {
    initials: 'AL',
    name: 'Ana Luíza',
    since: 'Premium Anual · 1 ano',
    text: 'O plano anual foi a melhor escolha. Uso todo dia e virou parte essencial da minha rotina de autocuidado.',
    stars: 5,
  },
];

// Radio button reutilizável
function Radio({ selected }: { selected: boolean }) {
  return (
    <div
      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
        selected ? 'border-[#33B5F0]' : 'border-white/40'
      }`}
    >
      {selected && <div className="w-3 h-3 rounded-full bg-[#33B5F0]" />}
    </div>
  );
}

export default function UpgradeModal({ open, onClose, source = 'generic' }: UpgradeModalProps) {
  const { user } = useAuth();
  const { isTrialActive, trialDaysRemaining } = usePremiumContent();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [state, setState] = useState<ModalState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Conteúdo contextual baseado em source
  const content = UPGRADE_CONTEXT_COPY[resolveUpgradeSource(source)];

  useEffect(() => {
    if (open) {
      trackPremiumScreenViewed({
        plan_id: selectedPlan,
        plan_label: selectedPlan === 'annual' ? 'Premium Anual' : 'Premium Mensal',
        price: selectedPlan === 'annual' ? 149 : 29.9,
        screen: 'upgrade_modal',
        placement: source,
        is_guest: !user,
        user_id: user?.id,
      });
    }
  }, [open, selectedPlan, source, user]);

  if (!open) return null;

  const handlePlanSelect = (plan: 'monthly' | 'annual') => {
    setSelectedPlan(plan);
    trackPremiumCardClicked({
      plan_id: plan,
      plan_label: plan === 'annual' ? 'Premium Anual' : 'Premium Mensal',
      price: plan === 'annual' ? 149 : 29.9,
      currency: 'BRL',
      screen: 'upgrade_modal',
      placement: source,
      is_guest: !user,
      user_id: user?.id,
    });
  };

  const handleSubscribe = async () => {
    setState('loading');
    setErrorMessage('');
    try {
      const response = await createSubscription(selectedPlan);
      trackCheckoutStarted({
        plan_id: selectedPlan,
        checkout_provider: 'mercadopago',
        checkout_type: response.type || 'preference',
        preference_id: response.id,
        amount: selectedPlan === 'annual' ? 149 : 29.9,
        currency: 'BRL',
        user_id: user?.id,
        is_guest: !user,
      });
      window.location.href = response.initPoint;
    } catch (error) {
      setState('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível iniciar o checkout. Tente novamente.'
      );
      mixpanel.track('Checkout Failed', {
        plan: selectedPlan,
        error: error instanceof Error ? error.message : 'Unknown error',
        source,
        user_id: user?.id,
      });
    }
  };

  const handleClose = () => {
    if (state === 'loading') return;
    onClose();
    mixpanel.track('Upgrade Modal Closed', {
      plan: selectedPlan,
      state,
      source,
      user_id: user?.id,
    });
  };

  const ctaLabel =
    isTrialActive && trialDaysRemaining <= 2
      ? 'MANTER ACESSO PREMIUM'
      : content.cta;

  const disclaimer =
    selectedPlan === 'annual'
      ? 'Valor de R$ 149 pelo primeiro ano, e depois R$ 299/ano. Você pode cancelar quando quiser.'
      : 'Renovação mensal automática por R$ 29,90. Você pode cancelar quando quiser.';

  return createPortal(
    <AnimatePresence>
      {open && (
        /* Overlay — fecha ao clicar fora no desktop */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-stretch sm:items-center sm:justify-center sm:bg-black/60 sm:p-4 overflow-hidden"
          onClick={handleClose}
        >
          {/* Painel principal */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-full h-[100dvh] sm:h-[92vh] sm:max-h-[820px] sm:max-w-[420px] sm:rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0D2244 0%, #091830 55%, #061220 100%)',
            }}
          >
            {/* Botão fechar */}
            <button
              onClick={handleClose}
              disabled={state === 'loading'}
              aria-label="Fechar"
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* ── Área scrollável ─────────────────────────────── */}
            <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden">
              <div className="px-4 sm:px-6 pt-7 sm:pt-10 pb-4 sm:pb-6">

                {/* Headline */}
                <div className="text-center mb-5 sm:mb-7">
                  <h2 className="text-2xl sm:text-[1.65rem] font-bold text-white leading-tight mb-2 sm:mb-3">
                    {content.title}
                  </h2>
                  <p className="text-sm text-white/55 leading-relaxed max-w-[280px] mx-auto">
                    {content.subtitle}
                  </p>
                </div>

                {/* ── Planos ──────────────────────────────────── */}
                <div className="pt-3 space-y-3 mb-5 sm:mb-8">

                  {/* Anual */}
                  <button
                    onClick={() => handlePlanSelect('annual')}
                    disabled={state === 'loading'}
                    className={`relative w-full rounded-2xl p-4 text-left transition-all duration-200 disabled:opacity-50 ${
                      selectedPlan === 'annual'
                        ? 'bg-white shadow-xl'
                        : 'bg-white/10 border border-white/15 hover:bg-white/15'
                    }`}
                  >
                    {/* Badge */}
                    <span className="absolute -top-3 right-4 bg-amber-500 text-white text-[10px] font-bold px-3 py-[3px] rounded-full uppercase tracking-wide shadow-md">
                      50% de desconto
                    </span>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Radio selected={selectedPlan === 'annual'} />
                        <div>
                          <p className={`font-semibold text-[15px] ${selectedPlan === 'annual' ? 'text-gray-900' : 'text-white'}`}>
                            Anual
                          </p>
                          <p className="text-xs mt-0.5 flex items-center gap-1">
                            <span className={`line-through ${selectedPlan === 'annual' ? 'text-gray-400' : 'text-white/35'}`}>
                              R$ 299,00
                            </span>
                            <span className={`font-medium ${selectedPlan === 'annual' ? 'text-gray-600' : 'text-white/60'}`}>
                              R$ 149 / ano
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[19px] font-bold leading-none ${selectedPlan === 'annual' ? 'text-gray-900' : 'text-white'}`}>
                          R$ 12,41
                        </p>
                        <p className={`text-xs mt-0.5 ${selectedPlan === 'annual' ? 'text-gray-400' : 'text-white/40'}`}>
                          / mês
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Mensal */}
                  <button
                    onClick={() => handlePlanSelect('monthly')}
                    disabled={state === 'loading'}
                    className={`relative w-full rounded-2xl p-4 text-left transition-all duration-200 disabled:opacity-50 ${
                      selectedPlan === 'monthly'
                        ? 'bg-white shadow-xl'
                        : 'bg-white/10 border border-white/15 hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Radio selected={selectedPlan === 'monthly'} />
                        <p className={`font-semibold text-[15px] ${selectedPlan === 'monthly' ? 'text-gray-900' : 'text-white'}`}>
                          Mensal
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[19px] font-bold leading-none ${selectedPlan === 'monthly' ? 'text-gray-900' : 'text-white'}`}>
                          R$ 29,90
                        </p>
                        <p className={`text-xs mt-0.5 ${selectedPlan === 'monthly' ? 'text-gray-400' : 'text-white/40'}`}>
                          / mês
                        </p>
                      </div>
                    </div>
                  </button>

                </div>

                {/* ── O que está incluído? ─────────────────────── */}
                <div className="mb-5 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-4">O que está incluído?</h3>
                  <div className="space-y-3 sm:space-y-4">
                    {content.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-center gap-3 sm:gap-4">
                        <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center">
                          <Check className="w-4 h-4 text-[#33B5F0]" />
                        </div>
                        <p className="text-[13px] sm:text-[14px] text-white/75 leading-snug">{bullet}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Exemplos de programas ───────────────────── */}
                <div className="mb-5 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">
                    Alguns exemplos do seu programa
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden -mx-4 sm:-mx-6 px-4 sm:px-6">
                    {PROGRAM_EXAMPLES.map((prog) => (
                      <div key={prog.title} className="flex-shrink-0 w-36 sm:w-40">
                        <div className="w-full h-24 sm:h-28 rounded-xl overflow-hidden mb-2">
                          <img
                            src={prog.image}
                            alt={prog.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <p className="text-xs text-white/70 leading-snug">{prog.title}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Depoimentos ─────────────────────────────── */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Avaliações</h3>
                  <div className="space-y-3">
                    {TESTIMONIALS.map((t) => (
                      <div
                        key={t.name}
                        className="bg-white/[8%] border border-white/10 rounded-2xl p-3 sm:p-4"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-9 h-9 rounded-full bg-[#33B5F0]/20 flex items-center justify-center text-xs font-bold text-[#33B5F0] flex-shrink-0">
                            {t.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white leading-none">{t.name}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">{t.since}</p>
                          </div>
                          <p className="ml-auto text-amber-400 text-xs tracking-tight">
                            {'★'.repeat(t.stars)}
                          </p>
                        </div>
                        <p className="text-[13px] text-white/65 leading-relaxed">"{t.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust */}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-white/55 text-[11px] mb-2">
                  <span>1.200+ membros ativos</span>
                  <span>·</span>
                  <span>4,8/5 estrelas</span>
                  <span>·</span>
                  <span>Cancelamento em 1 clique</span>
                </div>

              </div>
            </div>

            {/* ── CTA fixo no fundo ────────────────────────────── */}
            <div
              className="flex-shrink-0 px-4 sm:px-5 pt-3 sm:pt-4"
              style={{
                background: 'linear-gradient(to top, #061220 70%, transparent)',
                paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
              }}
            >
              {/* Erro */}
              {state === 'error' && errorMessage && (
                <p className="text-xs text-red-400 text-center mb-3 leading-relaxed">
                  {errorMessage}
                </p>
              )}

              {/* Escassez */}
              <p className="text-[11px] text-white/35 text-center mb-3 leading-relaxed">
                Condição disponível apenas durante nossa fase de expansão.
              </p>

              {/* Botão */}
              <button
                onClick={handleSubscribe}
                disabled={state === 'loading'}
                className="w-full bg-[#33B5F0] text-white font-bold text-[13px] py-4 rounded-full shadow-lg shadow-[#33B5F0]/30 hover:shadow-[#33B5F0]/50 hover:bg-[#28A8E3] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 tracking-widest uppercase"
              >
                {state === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  ctaLabel
                )}
              </button>

              {/* Disclaimer */}
              <p className="text-[11px] text-white/30 text-center mt-3 leading-relaxed px-2">
                {disclaimer}
              </p>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
