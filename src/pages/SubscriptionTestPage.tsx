import { useState } from 'react';
import UpgradeModal from '../components/subscription/UpgradeModal';
import PricingCard from '../components/subscription/PricingCard';
import { SubscriptionPlan, PricingPlan } from '../types/subscription';

/**
 * Página de teste para o sistema de assinatura
 * Permite testar todos os componentes sem backend
 */
export default function SubscriptionTestPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('premium_monthly');

  const monthlyPlan: PricingPlan = {
    id: 'premium_monthly',
    name: 'Mensal',
    price: 29.9,
    currency: 'BRL',
    interval: 'month',
    trialDays: 7,
    features: [
      'Acesso ilimitado a meditações guiadas',
      'Conversas ilimitadas com ECO',
      'Análise emocional profunda',
      'Histórico completo de conversas',
      'Prioridade no suporte',
    ],
    isPopular: false,
  };

  const annualPlan: PricingPlan = {
    id: 'premium_annual',
    name: 'Anual',
    price: 299,
    currency: 'BRL',
    interval: 'year',
    trialDays: 7,
    features: [
      'Acesso ilimitado a meditações guiadas',
      'Conversas ilimitadas com ECO',
      'Análise emocional profunda',
      'Histórico completo de conversas',
      'Prioridade no suporte',
      '2 meses grátis (economia de R$59,80)',
    ],
    isPopular: true,
    discount: {
      percentage: 17,
      label: '2 meses grátis',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Teste do Sistema de Assinatura
          </h1>
          <p className="text-lg text-gray-600">
            Esta página permite testar todos os componentes do sistema de pagamento
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
            <span className="text-xl">⚠️</span>
            <span>Backend não implementado - apenas testes de UI</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Pricing Cards</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <PricingCard
              plan={monthlyPlan}
              isSelected={selectedPlan === 'premium_monthly'}
              onSelect={() => setSelectedPlan('premium_monthly')}
            />
            <PricingCard
              plan={annualPlan}
              isSelected={selectedPlan === 'premium_annual'}
              onSelect={() => setSelectedPlan('premium_annual')}
            />
          </div>
        </section>

        {/* Upgrade Modal Trigger */}
        <section className="space-y-4 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Upgrade Modal</h2>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Abrir Modal de Upgrade
          </button>
        </section>

        {/* Estado do Sistema */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Estado do Sistema</h2>
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700">Frontend</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Modal de Upgrade</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Pricing Cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>API Client</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Hook Premium Content</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>AuthContext Integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Callback Page</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Subscription Management</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700">Backend</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✗</span>
                    <span>POST /api/subscription/create-preference</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✗</span>
                    <span>GET /api/subscription/status</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✗</span>
                    <span>POST /api/subscription/cancel</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✗</span>
                    <span>POST /api/subscription/reactivate</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✗</span>
                    <span>GET /api/subscription/invoices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">✗</span>
                    <span>POST /api/webhooks/mercadopago</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Arquivos Importantes */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Arquivos Importantes</h2>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4 text-sm font-mono">
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700 font-sans">Frontend</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>src/types/subscription.ts</li>
                  <li>src/api/subscription.ts</li>
                  <li>src/hooks/usePremiumContent.ts</li>
                  <li>src/components/subscription/UpgradeModal.tsx</li>
                  <li>src/components/subscription/PricingCard.tsx</li>
                  <li>src/pages/SubscriptionCallbackPage.tsx</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-700 font-sans">Documentação</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>BACKEND_SUBSCRIPTION_TODO.md</li>
                  <li>FRONTEND_SUBSCRIPTION_CHECKLIST.md</li>
                  <li>SUBSCRIPTION_PONTAS_SOLTAS.md</li>
                  <li>MIGRATION_SUBSCRIPTION.sql</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Próximos Passos */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Próximos Passos</h2>
          <div className="bg-blue-50 rounded-xl p-6 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">1️⃣</span>
              <div>
                <p className="font-semibold text-gray-900">Executar Migration SQL</p>
                <p className="text-gray-600">Execute MIGRATION_SUBSCRIPTION.sql no Supabase</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">2️⃣</span>
              <div>
                <p className="font-semibold text-gray-900">Configurar Mercado Pago</p>
                <p className="text-gray-600">Criar conta e obter credenciais (Public Key, Access Token)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">3️⃣</span>
              <div>
                <p className="font-semibold text-gray-900">Implementar Backend</p>
                <p className="text-gray-600">Seguir guia em BACKEND_SUBSCRIPTION_TODO.md</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">4️⃣</span>
              <div>
                <p className="font-semibold text-gray-900">Testar Fluxo Completo</p>
                <p className="text-gray-600">Checkout → Pagamento → Webhook → Callback</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
