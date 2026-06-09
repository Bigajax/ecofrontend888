// src/pages/SubscriptionCallbackPage.tsx
// Página de retorno do checkout do Mercado Pago
// IMPORTANTE: Sempre valida com backend, nunca confia em parâmetros da URL

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '../contexts/AuthContext';
import mixpanel from '../lib/mixpanel';
import { trackSubscriptionPaid, trackPaymentFailed } from '../lib/mixpanelConversionEvents';
import { trackAssinaturaPaga } from '../lib/mixpanelAssinarFunnel';
import { trackWithCAPI } from '../lib/fbpixel';
import { PRICE, planValue } from '../constants/offerCopy';

type CallbackStatus = 'loading' | 'success' | 'error' | 'pending';

export default function SubscriptionCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSubscription, subscription, user } = useAuth();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const validateSubscription = async () => {
      // NÃO confiar em searchParams.get('status')!
      // Sempre consultar backend para validar
      const maxRetries = 5;
      const retryInterval = 2000; // 2 segundos
      let currentRetry = 0;

      const checkStatus = async () => {
        try {
          // Refresh subscription from backend
          await refreshSubscription();

          // Aguardar state update
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Validar acesso
          const hasAccess = subscription.accessUntil && new Date(subscription.accessUntil) > new Date();
          const isActive = subscription.status === 'active';
          const notFree = subscription.plan !== 'free';

          if (hasAccess && isActive && notFree) {
            // ✅ Sucesso! Trial ou premium ativo
            setStatus('success');

            const planId = (subscription.planType || 'annual') as 'monthly' | 'annual';
            const amount = planId === 'monthly' ? 15.9 : 142.8;

            // Track Subscription Paid (Camada 3 - Frontend, evento global/histórico)
            trackSubscriptionPaid({
              plan_id: planId,
              mp_status: subscription.status,
              transaction_amount: amount,
              provider: 'mercadopago',
              user_id: user?.id,
              source: 'frontend_callback',
            });

            // Evento do funil em português (herda funnel_source via super property
            // registrada no /assinar) — fecha o "Funil Sono" de forma consistente.
            trackAssinaturaPaga({ plan_id: planId, amount });

            // Meta Pixel + CAPI: assinatura confirmada (trial ativo) → Subscribe,
            // evento padrão do Meta para início de assinatura recorrente. O
            // Purchase do 1º ciclo efetivamente cobrado deve ser disparado
            // server-side pelo webhook do backend (não há cobrança hoje, no trial).
            void trackWithCAPI('Subscribe', {
              value: planValue(subscription.planType),
              currency: PRICE.currency,
              contentName: 'ECO Premium',
              contentCategory: 'subscription',
              pixelExtra: { plan: subscription.planType ?? 'annual' },
            });

            // Confetti celebration
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });

            // Redirecionar após 3 segundos
            setTimeout(() => {
              navigate('/app');
            }, 3000);
          } else if (currentRetry < maxRetries) {
            // ⏳ Retry - webhook pode estar processando
            currentRetry++;
            setRetryCount(currentRetry);

            console.log(`[Callback] Retry ${currentRetry}/${maxRetries}`);

            setTimeout(checkStatus, retryInterval);
          } else {
            // ⚠️ Pendente após 5 tentativas
            setStatus('pending');

            mixpanel.track('Payment Pending', {
              retries: maxRetries,
              user_id: user?.id,
            });
          }
        } catch (error) {
          console.error('[Callback] Error:', error);

          if (currentRetry < maxRetries) {
            // Retry on error
            currentRetry++;
            setRetryCount(currentRetry);
            setTimeout(checkStatus, retryInterval);
          } else {
            // ❌ Erro após retries
            setStatus('error');
            setErrorMessage(
              error instanceof Error
                ? error.message
                : 'Não foi possível confirmar o pagamento'
            );

            // Track Payment Failed (Camada 3 - Frontend)
            trackPaymentFailed({
              mp_status: 'error',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              provider: 'mercadopago',
              user_id: user?.id,
              source: 'frontend_callback',
            });
          }
        }
      };

      // Iniciar validação
      await checkStatus();
    };

    validateSubscription();
  }, [refreshSubscription, navigate, user?.id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FAF9F7] to-[#F3EEE7] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center glass-shell rounded-3xl p-12">
            <Loader2 className="w-16 h-16 text-[#6EC8FF] mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-display font-normal text-[var(--eco-text)] mb-3">
              Confirmando pagamento...
            </h1>
            <p className="text-[var(--eco-muted)] mb-4">
              Aguarde enquanto validamos sua assinatura
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-[var(--eco-muted)]">
                Tentativa {retryCount} de 5
              </p>
            )}
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center glass-shell rounded-3xl p-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
            >
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            </motion.div>
            <h1 className="text-3xl font-display font-normal text-[var(--eco-text)] mb-3">
              Bem-vindo ao ECO Premium! 🎉
            </h1>
            <p className="text-[var(--eco-muted)] mb-2">
              Sua assinatura foi ativada com sucesso
            </p>
            {subscription.plan === 'trial' && (
              <p className="text-sm text-[#6EC8FF] font-medium">
                Aproveite seus 7 dias gratuitos!
              </p>
            )}
            <p className="text-sm text-[var(--eco-muted)] mt-6">
              Redirecionando em instantes...
            </p>
          </div>
        )}

        {/* Pending State */}
        {status === 'pending' && (
          <div className="text-center glass-shell rounded-3xl p-12">
            <Clock className="w-16 h-16 text-amber-500 mx-auto mb-6" />
            <h1 className="text-2xl font-display font-normal text-[var(--eco-text)] mb-3">
              Pagamento em processamento
            </h1>
            <p className="text-[var(--eco-muted)] mb-6">
              Estamos confirmando seu pagamento. Isso pode levar alguns minutos.
              Você receberá um email quando estiver pronto.
            </p>
            <button
              onClick={() => navigate('/app')}
              className="bg-gradient-to-r from-[#6EC8FF] to-[#5AB3D9] text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              Voltar ao início
            </button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center glass-shell rounded-3xl p-12">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-display font-normal text-[var(--eco-text)] mb-3">
              Erro ao processar pagamento
            </h1>
            <p className="text-[var(--eco-muted)] mb-2">
              Não foi possível confirmar seu pagamento
            </p>
            {errorMessage && (
              <p className="text-sm text-red-600 mb-6">{errorMessage}</p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate('/app/configuracoes?menu=assinatura')}
                className="bg-gradient-to-r from-[#6EC8FF] to-[#5AB3D9] text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                Ir para Assinatura
              </button>
              <button
                onClick={() => navigate('/app')}
                className="border border-[var(--eco-line)] bg-white/80 text-[var(--eco-text)] px-6 py-3 rounded-xl font-medium hover:bg-white hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
