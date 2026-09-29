// src/components/settings/SubscriptionManagement.tsx
// Gerenciamento de assinatura na página de Configurações

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cancelSubscription, reactivateSubscription } from '../../api/subscription';
import mixpanel from '../../lib/mixpanel';

type CancelReason = 'expensive' | 'not_using' | 'lack_content' | 'other';

const CANCEL_REASONS: { id: CancelReason; label: string }[] = [
  { id: 'expensive', label: 'Está muito caro' },
  { id: 'not_using', label: 'Não estou usando' },
  { id: 'lack_content', label: 'Falta conteúdo que me interessa' },
  { id: 'other', label: 'Outro motivo' },
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
        return 'Sete dias com tudo aberto';
      case 'premium_monthly':
        return 'Assinatura mensal';
      case 'premium_annual':
        return 'Assinatura anual';
      default:
        return 'Gratuito';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleManageMP = () => {
    // Abrir painel do Mercado Pago
    window.open('https://www.mercadopago.com.br/subscriptions/my-subscriptions', '_blank');

    mixpanel.track('Assinatura · Gerenciar MP clicado', {
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

    mixpanel.track('Assinatura · Cancelamento iniciado', {
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

  // Copy de retenção por motivo. Só o que é verdade: nada de "conteúdo novo
  // toda semana" nem de progresso que some (o caminho fica no aparelho).
  const ateQuando = accessUntilLabel ? ` até ${accessUntilLabel}` : ' até o fim do período já pago';
  const getRetentionContent = (): { title: string; body: string } => {
    switch (selectedReason) {
      case 'expensive':
        return {
          title: 'Menos de R$ 0,53 por dia.',
          body: `A assinatura sai por R$ 15,90 por mês. Se cancelar agora, o acesso continua${ateQuando}.`,
        };
      case 'not_using':
        return {
          title: 'Que tal cinco minutos hoje?',
          body: 'Uma noite do sono ou um dia dos Cinco Anéis já conta como dia no reino. O seu caminho continua aqui.',
        };
      case 'lack_content':
        return {
          title: 'Conte o que faltou.',
          body: `Se escolher "Cancelar mesmo assim", as trilhas completas, as sete noites e o Diário ficam abertos${ateQuando}. Depois, fecham.`,
        };
      default:
        return {
          title: 'Antes de ir.',
          body: `Ao cancelar, as trilhas completas, as sete noites, o Diário e a conversa sem limite com a Eco ficam abertos${ateQuando}. Depois, fecham.`,
        };
    }
  };

  const handleContinueToRetention = () => {
    if (!selectedReason) return;

    mixpanel.track('Assinatura · Motivo cancelamento', {
      plan: subscription.plan,
      reason: resolvedReason,
      reason_id: selectedReason,
      user_id: user?.id,
    });
    mixpanel.track('Assinatura · Retenção exibida', {
      plan: subscription.plan,
      reason_id: selectedReason,
      user_id: user?.id,
    });

    setCancelStep('retention');
  };

  const handleKeepSubscription = () => {
    mixpanel.track('Assinatura · Retida', {
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
      mixpanel.track('Assinatura · Reativada', {
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
      mixpanel.track('Assinatura · Cancelada', {
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

      mixpanel.track('Assinatura · Cancelamento falhou', {
        error: error instanceof Error ? error.message : 'Unknown error',
        user_id: user?.id,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // No reino (set/2026): o plano como texto, um filete ocre para o que muda
  // (teste, renovação, cancelada) e o cancelamento numa folha. Antes: vidro,
  // coroa em gradiente, botões azuis e motivos com emoji.
  const retencao = getRetentionContent();
  const temAcesso = isPremiumUser || isTrialActive;

  return (
    <div className="reino-assinatura">
      <h2 className="reino-corpo__titulo reino-conta__titulo">Assinatura</h2>

      <p className="reino-rotulo">Seu plano</p>
      <p className="reino-assinatura__plano">{getPlanDisplayName()}</p>

      {isTrialActive && (
        <div className="reino-nota">
          <p>
            {trialDaysRemaining === 1 ? 'Último dia com tudo aberto.' : `Faltam ${trialDaysRemaining} dias com tudo aberto.`}
            {subscription.trialEndDate ? ` Terminam em ${formatDate(subscription.trialEndDate)}.` : ''}
          </p>
        </div>
      )}

      {isPremiumUser && !isTrialActive && subscription.status === 'active' && subscription.currentPeriodEnd && (
        <div className="reino-nota">
          <p>
            {subscription.planType === 'monthly'
              ? `Ativa. Renova em ${formatDate(subscription.currentPeriodEnd)}.`
              : `Ativa até ${formatDate(subscription.currentPeriodEnd)}.`}
          </p>
        </div>
      )}

      {subscription.status === 'cancelled' && subscription.accessUntil && (
        <div className="reino-nota">
          <p>Cancelada. A renovação está desligada e tudo segue aberto até {formatDate(subscription.accessUntil)}.</p>
        </div>
      )}

      {subscription.plan === 'free' && (
        <p className="reino-assinatura__texto">
          O primeiro passo de cada caminho é seu, sem pagar. Com a assinatura, todas as portas abrem: a Eco, as sete
          noites, as trilhas e os Cinco Anéis.
        </p>
      )}

      <div className="reino-assinatura__acoes">
        {subscription.plan === 'free' && (
          <Link to="/assinar?step=plan&plan=monthly&from=settings" className="reino-placa">
            Abrir todas as portas <span aria-hidden="true">→</span>
          </Link>
        )}

        {subscription.status === 'cancelled' && subscription.accessUntil && (
          <button type="button" className="reino-placa" onClick={handleReactivate} disabled={isReactivating}>
            {isReactivating ? 'Reativando...' : 'Reativar a assinatura'}
          </button>
        )}

        {temAcesso && (
          <button type="button" className="reino-assinatura__link" onClick={handleManageMP}>
            Pagamento no Mercado Pago <span aria-hidden="true">↗</span>
          </button>
        )}

        {temAcesso && subscription.status === 'active' && (
          <button type="button" className="reino-assinatura__link" onClick={handleCancelClick}>
            Cancelar a assinatura
          </button>
        )}

        <Link to="/cancelar-assinatura" className="reino-assinatura__link">
          Como funciona o cancelamento
        </Link>
      </div>
      {reactivateError && (
        <p className="reino-assinatura__erro" role="alert">
          {reactivateError}
        </p>
      )}

      {showCancelModal && (
        <div
          className="reino-gate"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancelar-titulo"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCancelling) setShowCancelModal(false);
          }}
        >
          <div className="reino-gate__folha reino-corpo">
            {cancelStep === 'reason' ? (
              <>
                <h2 id="cancelar-titulo" className="reino-gate__titulo">
                  O que pesou na decisão?
                </h2>
                <div className="reino-assinatura__motivos" role="radiogroup" aria-label="Motivo">
                  {CANCEL_REASONS.map((reason) => (
                    <button
                      key={reason.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedReason === reason.id}
                      className="reino-assinatura__motivo"
                      onClick={() => setSelectedReason(reason.id)}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
                {selectedReason === 'other' && (
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Conte um pouco mais, se quiser"
                    className="reino-assinatura__outro"
                    rows={3}
                  />
                )}
                <div className="reino-gate__acoes">
                  <button
                    type="button"
                    className="reino-placa"
                    onClick={handleContinueToRetention}
                    disabled={!selectedReason}
                  >
                    Continuar <span aria-hidden="true">→</span>
                  </button>
                  <button type="button" className="reino-gate__depois" onClick={() => setShowCancelModal(false)}>
                    Voltar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="cancelar-titulo" className="reino-gate__titulo">
                  {retencao.title}
                </h2>
                <p className="reino-gate__texto">{retencao.body}</p>
                {cancelError && (
                  <p className="reino-assinatura__erro" role="alert">
                    {cancelError}
                  </p>
                )}
                <div className="reino-gate__acoes">
                  <button type="button" className="reino-placa" onClick={handleKeepSubscription} disabled={isCancelling}>
                    Manter a assinatura
                  </button>
                  <button
                    type="button"
                    className="reino-gate__depois"
                    onClick={handleCancelConfirm}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelando...' : 'Cancelar mesmo assim'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
