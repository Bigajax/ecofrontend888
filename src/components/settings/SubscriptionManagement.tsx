// src/components/settings/SubscriptionManagement.tsx
// Gerenciamento de assinatura na página de Configurações

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Crown, Calendar, AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { cancelSubscription, reactivateSubscription } from '../../api/subscription';
import mixpanel from '../../lib/mixpanel';

type CancelReason = 'expensive' | 'not_using' | 'lack_content' | 'other';

const CANCEL_REASONS: { id: CancelReason; emoji: string; label: string }[] = [
  { id: 'expensive', emoji: '💸', label: 'Está muito caro' },
  { id: 'not_using', emoji: '🌱', label: 'Não estou usando' },
  { id: 'lack_content', emoji: '📭', label: 'Falta conteúdo que me interessa' },
  { id: 'other', emoji: '🤔', label: 'Outro motivo' },
];

export default function SubscriptionManagement() {
  const { subscription, isPremiumUser, isTrialActive, trialDaysRemaining, user, refreshSubscription } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState<'reason' | 'retention'>('reason');
  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null);
  const [otherReason, setOtherReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [isReactivating, setIsReactivating] = useState(false);
  const [reactivateError, setReactivateError] = useState('');

  const getPlanDisplayName = () => {
    switch (subscription.plan) {
      case 'free':
        return 'Gratuito';
      case 'trial':
        return 'Trial Premium (7 dias gratuitos)';
      case 'premium_monthly':
        return 'Premium Mensal';
      case 'premium_annual':
        return 'Premium Anual';
      default:
        return 'Gratuito';
    }
  };

  const getPlanColor = () => {
    if (isPremiumUser || isTrialActive) {
      return 'from-[#6EC8FF] to-[#5AB3D9]';
    }
    return 'from-gray-400 to-gray-500';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleManageMP = () => {
    // Abrir painel do Mercado Pago
    window.open('https://www.mercadopago.com.br/subscriptions/my-subscriptions', '_blank');

    mixpanel.track('Manage MP Subscription Clicked', {
      plan: subscription.plan,
      user_id: user?.id,
    });
  };

  const handleCancelClick = () => {
    setShowCancelModal(true);
    setCancelStep('reason');
    setSelectedReason(null);
    setOtherReason('');
    setCancelError('');

    mixpanel.track('Cancel Flow Started', {
      plan: subscription.plan,
      user_id: user?.id,
    });
  };

  // Texto enviado ao backend e à telemetria
  const resolvedReason = (() => {
    if (selectedReason === 'other') {
      return otherReason.trim() || 'Outro motivo';
    }
    return CANCEL_REASONS.find((r) => r.id === selectedReason)?.label || 'Não informado';
  })();

  const accessUntilLabel = formatDate(
    subscription.accessUntil || subscription.currentPeriodEnd
  );

  // Copy de retenção sob medida por motivo
  const getRetentionContent = (): { title: string; body: string } => {
    switch (selectedReason) {
      case 'expensive':
        return {
          title: 'Menos de R$ 0,53 por dia',
          body: `Sua assinatura sai por R$ 15,90/mês — menos que um café. E mesmo cancelando agora, você mantém o acesso premium${accessUntilLabel ? ` até ${accessUntilLabel}` : ' até o fim do período já pago'}.`,
        };
      case 'not_using':
        return {
          title: 'Seu progresso fica salvo enquanto você é premium',
          body: 'Que tal voltar com 5 minutos hoje? Seu histórico de humor, favoritos e o caminho que você já trilhou continuam aqui — mas só enquanto a assinatura está ativa.',
        };
      case 'lack_content':
        return {
          title: 'Tem novidade chegando',
          body: 'Publicamos conteúdos novos toda semana e os próximos já estão a caminho. Cancelando agora você perde o acesso às meditações, aos programas completos e ao Diário Estoico.',
        };
      default:
        return {
          title: 'Antes de ir, lembre o que você perde',
          body: `Ao cancelar você perde o acesso ilimitado às meditações, aos programas completos, ao Diário Estoico e às conversas com a ECO. Você mantém o premium${accessUntilLabel ? ` até ${accessUntilLabel}` : ' até o fim do período já pago'}.`,
        };
    }
  };

  const handleContinueToRetention = () => {
    if (!selectedReason) return;

    mixpanel.track('Cancel Reason Selected', {
      plan: subscription.plan,
      reason: resolvedReason,
      reason_id: selectedReason,
      user_id: user?.id,
    });
    mixpanel.track('Cancel Retention Shown', {
      plan: subscription.plan,
      reason_id: selectedReason,
      user_id: user?.id,
    });

    setCancelStep('retention');
  };

  const handleKeepSubscription = () => {
    mixpanel.track('Subscription Retained', {
      plan: subscription.plan,
      reason: resolvedReason,
      reason_id: selectedReason,
      user_id: user?.id,
    });
    setShowCancelModal(false);
  };

  const handleReactivate = async () => {
    setIsReactivating(true);
    setReactivateError('');
    try {
      await reactivateSubscription();
      await refreshSubscription();
      mixpanel.track('Subscription Reactivated', {
        plan: subscription.plan,
        user_id: user?.id,
      });
    } catch (error) {
      setReactivateError(
        error instanceof Error ? error.message : 'Não foi possível reativar a assinatura'
      );
    } finally {
      setIsReactivating(false);
    }
  };

  const handleCancelConfirm = async () => {
    setIsCancelling(true);
    setCancelError('');

    try {
      await cancelSubscription(resolvedReason);

      // Refresh subscription status
      await refreshSubscription();

      // Analytics
      mixpanel.track('Subscription Cancelled', {
        plan: subscription.plan,
        reason: resolvedReason,
        reason_id: selectedReason,
        user_id: user?.id,
      });

      // Fechar modal
      setShowCancelModal(false);
    } catch (error) {
      console.error('[SubscriptionManagement] Cancel error:', error);
      setCancelError(
        error instanceof Error
          ? error.message
          : 'Não foi possível cancelar a assinatura'
      );

      mixpanel.track('Subscription Cancel Failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        user_id: user?.id,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-normal text-[var(--eco-text)]">
          Minha Assinatura
        </h2>
        <p className="text-sm text-[var(--eco-muted)] mt-1">
          Gerencie sua assinatura e histórico de pagamentos
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="glass-shell rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getPlanColor()} flex items-center justify-center`}>
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--eco-text)]">
                {getPlanDisplayName()}
              </h3>
              <p className="text-sm text-[var(--eco-muted)] capitalize">
                Status: {subscription.status === 'active' ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>

          {/* Badge */}
          {(isPremiumUser || isTrialActive) && (
            <div className="px-3 py-1 bg-gradient-to-r from-[#6EC8FF] to-[#5AB3D9] rounded-full">
              <span className="text-xs font-semibold text-white uppercase tracking-wide">
                Premium
              </span>
            </div>
          )}
        </div>

        {/* Trial Info */}
        {isTrialActive && (
          <div className="mb-4 p-4 bg-[#6EC8FF]/10 border border-[#6EC8FF]/30 rounded-xl">
            <div className="flex items-start gap-2">
              <Calendar className="w-5 h-5 text-[#6EC8FF] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--eco-text)]">
                  {trialDaysRemaining === 1
                    ? 'Último dia de trial!'
                    : `${trialDaysRemaining} dias restantes de trial`}
                </p>
                <p className="text-xs text-[var(--eco-muted)] mt-1">
                  Seu trial termina em {formatDate(subscription.trialEndDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Premium Info */}
        {isPremiumUser && !isTrialActive && subscription.status === 'active' && subscription.currentPeriodEnd && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Assinatura Ativa
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {subscription.planType === 'monthly'
                    ? `Próxima renovação: ${formatDate(subscription.currentPeriodEnd)}`
                    : `Válida até: ${formatDate(subscription.currentPeriodEnd)}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancelled but still has access */}
        {subscription.status === 'cancelled' && subscription.accessUntil && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Assinatura cancelada
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Renovação automática desativada. Você mantém acesso premium até{' '}
                  <strong>{formatDate(subscription.accessUntil)}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Free Plan Info */}
        {subscription.plan === 'free' && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Plano Gratuito
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Faça upgrade para desbloquear todas as meditações e programas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Upgrade CTA for free users */}
          {subscription.plan === 'free' && (
            <Link
              to="/assinar?step=plan&plan=annual&from=settings"
              className="block w-full text-center px-4 py-3 bg-[#1554F0] rounded-xl text-white font-medium hover:bg-[#1148D6] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              Assinar Premium
            </Link>
          )}

          {/* Mercado Pago Button */}
          {(isPremiumUser || isTrialActive) && (
            <button
              onClick={handleManageMP}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[var(--eco-line)] rounded-xl text-[var(--eco-text)] font-medium hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 transition-all duration-300"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Gerenciar no Mercado Pago</span>
            </button>
          )}

          {/* Reactivate Button */}
          {subscription.status === 'cancelled' && subscription.accessUntil && (
            <>
              <button
                onClick={handleReactivate}
                disabled={isReactivating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1554F0] rounded-xl text-white font-medium hover:bg-[#1148D6] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isReactivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reativando…</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Reativar Assinatura</span>
                  </>
                )}
              </button>
              {reactivateError && (
                <p className="text-sm text-red-600">{reactivateError}</p>
              )}
            </>
          )}

          {/* Cancel Button */}
          {(isPremiumUser || isTrialActive) && subscription.status === 'active' && (
            <button
              onClick={handleCancelClick}
              className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium hover:bg-red-100 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              Cancelar Assinatura
            </button>
          )}

          {/* Help link — sempre visível */}
          <p className="text-center text-xs text-[var(--eco-muted)] pt-1">
            <Link to="/cancelar-assinatura" className="underline hover:text-[var(--eco-text)]">
              Como funciona o cancelamento?
            </Link>
          </p>
        </div>
      </div>

      {/* Features List */}
      {subscription.plan === 'free' && (
        <div className="glass-shell rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--eco-text)] mb-4">
            Desbloqueie com Premium
          </h3>
          <div className="space-y-3">
            {[
              'Acesso ilimitado a todas as meditações',
              'Programas completos (5 Anéis, Dr. Joe Dispenza)',
              'Diário Estoico diário',
              'Conversas ilimitadas com ECO',
              'Novos conteúdos semanais',
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#6EC8FF]/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-[#6EC8FF]" strokeWidth={3} />
                </div>
                <p className="text-sm text-[var(--eco-text)]">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              {/* Passo 1 — Motivo */}
              {cancelStep === 'reason' && (
                <>
                  <h3 className="text-xl font-display font-normal text-[var(--eco-text)] mb-3">
                    Cancelar Assinatura
                  </h3>
                  <p className="text-sm text-[var(--eco-muted)] mb-4">
                    Antes de você ir, conta pra gente o que motivou a decisão?
                  </p>

                  {/* Reason buttons */}
                  <div className="space-y-2 mb-4">
                    {CANCEL_REASONS.map((reason) => {
                      const active = selectedReason === reason.id;
                      return (
                        <button
                          key={reason.id}
                          type="button"
                          onClick={() => setSelectedReason(reason.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all duration-200 ${
                            active
                              ? 'border-[#6EC8FF] bg-[#6EC8FF]/10 text-[var(--eco-text)]'
                              : 'border-[var(--eco-line)] text-[var(--eco-text)] hover:bg-gray-50'
                          }`}
                        >
                          <span aria-hidden className="text-lg leading-none">{reason.emoji}</span>
                          <span>{reason.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Other reason textarea */}
                  {selectedReason === 'other' && (
                    <div className="mb-4">
                      <textarea
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                        placeholder="Conta um pouco mais (opcional)…"
                        className="w-full px-4 py-3 border border-[var(--eco-line)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#6EC8FF] focus:border-transparent"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="flex-1 px-4 py-3 border border-[var(--eco-line)] rounded-xl text-[var(--eco-text)] font-medium hover:bg-gray-50 transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleContinueToRetention}
                      disabled={!selectedReason}
                      className="flex-1 px-4 py-3 bg-[#1554F0] rounded-xl text-white font-medium hover:bg-[#1148D6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuar
                    </button>
                  </div>
                </>
              )}

              {/* Passo 2 — Retenção */}
              {cancelStep === 'retention' && (
                <>
                  <h3 className="text-xl font-display font-normal text-[var(--eco-text)] mb-3">
                    {getRetentionContent().title}
                  </h3>
                  <p className="text-sm text-[var(--eco-muted)] mb-5">
                    {getRetentionContent().body}
                  </p>

                  {/* Error Message */}
                  {cancelError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-600">{cancelError}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={handleKeepSubscription}
                      disabled={isCancelling}
                      className="w-full px-4 py-3 bg-[#1554F0] rounded-xl text-white font-medium hover:bg-[#1148D6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Manter assinatura
                    </button>
                    <button
                      onClick={handleCancelConfirm}
                      disabled={isCancelling}
                      className="w-full px-4 py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Cancelando…</span>
                        </>
                      ) : (
                        <span>Cancelar mesmo assim</span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
