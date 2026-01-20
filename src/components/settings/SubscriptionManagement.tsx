// src/components/settings/SubscriptionManagement.tsx
// Gerenciamento de assinatura na página de Configurações

import { useState } from 'react';
import { ExternalLink, Crown, Calendar, AlertCircle, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { cancelSubscription } from '../../api/subscription';
import mixpanel from '../../lib/mixpanel';

export default function SubscriptionManagement() {
  const { subscription, isPremiumUser, isTrialActive, trialDaysRemaining, user, refreshSubscription } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const getPlanDisplayName = () => {
    switch (subscription.plan) {
      case 'free':
        return 'Gratuito';
      case 'trial':
        return 'Trial Premium (7 dias grátis)';
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
    setCancelError('');
    setCancelReason('');
  };

  const handleCancelConfirm = async () => {
    setIsCancelling(true);
    setCancelError('');

    try {
      await cancelSubscription(cancelReason || 'Não informado');

      // Refresh subscription status
      await refreshSubscription();

      // Analytics
      mixpanel.track('Subscription Cancelled', {
        plan: subscription.plan,
        reason: cancelReason || 'Não informado',
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
        {isPremiumUser && !isTrialActive && subscription.currentPeriodEnd && (
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

          {/* Cancel Button */}
          {(isPremiumUser || isTrialActive) && subscription.status === 'active' && (
            <button
              onClick={handleCancelClick}
              className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium hover:bg-red-100 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              Cancelar Assinatura
            </button>
          )}
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
              <h3 className="text-xl font-display font-normal text-[var(--eco-text)] mb-3">
                Cancelar Assinatura
              </h3>
              <p className="text-sm text-[var(--eco-muted)] mb-4">
                Sentiremos sua falta! Você manterá acesso aos recursos premium até o fim do período pago.
              </p>

              {/* Reason Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--eco-text)] mb-2">
                  Motivo do cancelamento (opcional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Muito caro, não uso mais..."
                  className="w-full px-4 py-3 border border-[var(--eco-line)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#6EC8FF] focus:border-transparent"
                  rows={3}
                  disabled={isCancelling}
                />
              </div>

              {/* Error Message */}
              {cancelError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{cancelError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-3 border border-[var(--eco-line)] rounded-xl text-[var(--eco-text)] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Manter Assinatura
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-3 bg-red-600 rounded-xl text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cancelando...</span>
                    </>
                  ) : (
                    <span>Confirmar Cancelamento</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
