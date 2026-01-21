// src/components/subscription/UpgradeModal.tsx
// Modal de upgrade para assinatura premium

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import PricingCard from './PricingCard';
import { createSubscription } from '../../api/subscription';
import type { PlanType } from '../../types/subscription';
import mixpanel from '../../lib/mixpanel';
import { useAuth } from '../../contexts/AuthContext';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  source?: string;
}

type ModalState = 'idle' | 'loading' | 'success' | 'error';

const PRICING_PLANS = [
  {
    id: 'monthly' as PlanType,
    name: 'Mensal',
    price: 29.9,
    billingPeriod: 'month' as const,
    trialDays: 7,
    isPopular: false,
    features: [
      'Acesso ilimitado a todas as meditações',
      'Programas completos (5 Anéis, Dr. Joe Dispenza)',
      'Diário Estoico diário',
      'Conversas ilimitadas com ECO',
      'Novos conteúdos semanais',
      'Cancele quando quiser',
    ],
  },
  {
    id: 'annual' as PlanType,
    name: 'Anual',
    price: 299.0,
    originalPrice: 358.8, // 29.90 * 12
    billingPeriod: 'year' as const,
    trialDays: 7,
    isPopular: true,
    features: [
      'Acesso ilimitado a todas as meditações',
      'Programas completos (5 Anéis, Dr. Joe Dispenza)',
      'Diário Estoico diário',
      'Conversas ilimitadas com ECO',
      'Novos conteúdos semanais',
      'Economia de R$ 59,80 por ano',
    ],
  },
];

export default function UpgradeModal({ open, onClose, source = 'unknown' }: UpgradeModalProps) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [state, setState] = useState<ModalState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!open) return null;

  const handlePlanSelect = (plan: PlanType) => {
    setSelectedPlan(plan);
    mixpanel.track('Plan Selected', {
      plan,
      price: PRICING_PLANS.find((p) => p.id === plan)?.price,
      source,
      user_id: user?.id,
    });
  };

  const handleSubscribe = async () => {
    setState('loading');
    setErrorMessage('');

    try {
      mixpanel.track('Checkout Initiated', {
        plan: selectedPlan,
        source,
        user_id: user?.id,
      });

      const response = await createSubscription(selectedPlan);

      // Redirecionar para checkout do Mercado Pago
      window.location.href = response.initPoint;
    } catch (error) {
      console.error('[UpgradeModal] Subscription error:', error);
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
    if (state === 'loading') return; // Não fecha durante loading
    onClose();
    mixpanel.track('Upgrade Modal Closed', {
      plan: selectedPlan,
      state,
      source,
      user_id: user?.id,
    });
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-title"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="modal-scroll relative rounded-2xl sm:rounded-3xl border border-[var(--eco-line)] bg-white shadow-[0_4px_30px_rgba(0,0,0,0.12)] p-4 sm:p-6 md:p-8 max-w-4xl w-full my-auto overflow-y-auto max-h-[95vh] sm:max-h-[90vh]"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              disabled={state === 'loading'}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 p-1.5 sm:p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--eco-text)]" />
            </button>

            {/* Logo */}
            <div className="flex justify-center mb-4 sm:mb-6">
              <img src="/images/ECOTOPIA.webp" alt="ECOTOPIA" className="h-12 sm:h-14 md:h-16 w-auto object-contain" />
            </div>

            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <h2
                id="upgrade-title"
                className="text-2xl sm:text-3xl md:text-4xl font-display font-normal text-[var(--eco-text)] mb-2 sm:mb-3 px-2"
              >
                Desbloqueie Todo o Potencial da ECOTOPIA
              </h2>
              <p className="text-sm sm:text-base text-[var(--eco-muted)] max-w-2xl mx-auto px-4">
                Acesso ilimitado a meditações guiadas, programas transformadores e conversas com ECO.
              </p>

              {/* Trial Badge */}
              <div className="inline-flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-[#6EC8FF] to-[#5AB3D9] rounded-full shadow-md">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <span className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wide">
                  7 Dias Grátis • Cancele Quando Quiser
                </span>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {PRICING_PLANS.map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan.id}
                  price={plan.price}
                  originalPrice={plan.originalPrice}
                  billingPeriod={plan.billingPeriod}
                  trialDays={plan.trialDays}
                  isPopular={plan.isPopular}
                  features={plan.features}
                  onSelect={() => handlePlanSelect(plan.id)}
                  isSelected={selectedPlan === plan.id}
                  disabled={state === 'loading'}
                />
              ))}
            </div>

            {/* Error Message */}
            {state === 'error' && errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl"
              >
                <p className="text-xs sm:text-sm text-red-600 text-center">{errorMessage}</p>
              </motion.div>
            )}

            {/* CTA Button */}
            <div className="text-center">
              <button
                onClick={handleSubscribe}
                disabled={state === 'loading'}
                className="w-full sm:w-auto sm:min-w-[300px] bg-gradient-to-r from-[#6EC8FF] to-[#5AB3D9] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base sm:text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {state === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <span>Começar 7 Dias Grátis</span>
                )}
              </button>

              {/* Disclaimer */}
              <p className="mt-3 sm:mt-4 text-xs text-[var(--eco-muted)] max-w-md mx-auto px-2">
                Você não será cobrado agora. Após 7 dias, sua assinatura será renovada automaticamente.
                Cancele a qualquer momento sem compromisso.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-[var(--eco-line)]">
              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-[var(--eco-muted)]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Seguro e Criptografado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Cancele quando quiser</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Suporte via WhatsApp</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
