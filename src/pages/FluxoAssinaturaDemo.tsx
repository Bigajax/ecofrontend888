import { useState } from 'react';
import { Lock, Check, X } from 'lucide-react';
import UpgradeModal from '../components/subscription/UpgradeModal';

/**
 * Página de demonstração do fluxo de assinatura
 * Mostra visualmente onde o modal aparece para o usuário
 */
export default function FluxoAssinaturaDemo() {
  const [showModal, setShowModal] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'dr-joe',
      title: '1. Dr. Joe Dispenza',
      status: 'implementado',
      location: '/app/dr-joe-dispenza',
      description: 'Usuário clica em meditação premium',
      flow: [
        'Usuário vê lista de meditações',
        'Última meditação tem ícone de cadeado 🔒',
        'Usuário clica na meditação premium',
        '✅ Modal abre automaticamente',
        'Analytics registra "Premium Content Blocked"',
      ],
      preview: `
        ┌──────────────────────────────────┐
        │ Meditação Normal          ▶     │
        ├──────────────────────────────────┤
        │ Espaço-Tempo 🔒           ▶     │ ← CLIQUE AQUI
        └──────────────────────────────────┘
                    ↓
        ┌──────────────────────────────────┐
        │      MODAL DE ASSINATURA         │
        │  [Mensal R$29,90] [Anual R$299]  │
        │   [Começar 7 Dias Grátis]        │
        └──────────────────────────────────┘
      `,
    },
    {
      id: 'introducao',
      title: '2. Introdução à Meditação',
      status: 'implementado',
      location: '/app/introducao-meditacao',
      description: 'Similar ao Dr. Joe Dispenza',
      flow: [
        'Usuário vê meditações',
        'Meditações premium têm cadeado 🔒',
        'Clique abre modal',
        '✅ Funciona perfeitamente',
      ],
      preview: `Similar ao cenário anterior`,
    },
    {
      id: 'programas',
      title: '3. Programas',
      status: 'bug',
      location: '/app/programas',
      description: 'Modal NÃO abre (precisa corrigir)',
      flow: [
        'Usuário vê programas',
        '"Quem Pensa Enriquece" tem cadeado 🔒',
        'Usuário clica',
        '❌ NADA ACONTECE (bug)',
        'Modal deveria abrir mas não abre',
      ],
      preview: `
        ┌──────────────────────────────────┐
        │ Quem Pensa Enriquece 🔒          │ ← CLIQUE AQUI
        └──────────────────────────────────┘
                    ↓
              ❌ Nada acontece
              (modal não abre)
      `,
    },
    {
      id: 'configuracoes',
      title: '4. Configurações',
      status: 'nao-implementado',
      location: '/app/configuracoes',
      description: 'Painel de gerenciamento escondido',
      flow: [
        'Usuário vai em Configurações',
        'Procura seção "Assinatura"',
        '❌ Seção não existe',
        'Componente existe mas não está integrado',
      ],
      preview: `
        Configurações
        ├─ Perfil ✅
        ├─ Notificações ✅
        ├─ Privacidade ✅
        └─ Assinatura ❌ (não aparece)
      `,
    },
    {
      id: 'chat',
      title: '5. Chat (Futuro)',
      status: 'nao-implementado',
      location: '/app/chat',
      description: 'Limite de mensagens (não implementado)',
      flow: [
        'Ideia: Limitar 100 mensagens/dia para free',
        'Banner aparece após X mensagens',
        '"Você usou 50 de 100 mensagens"',
        'Botão "Assinar Premium"',
        '❌ Não implementado',
      ],
      preview: `
        ┌──────────────────────────────────┐
        │ ⚠️ Você usou 50 de 100 mensagens │
        │    [Assinar Premium]             │
        └──────────────────────────────────┘
      `,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implementado':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'bug':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'nao-implementado':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'implementado':
        return '✅ Funciona';
      case 'bug':
        return '⚠️ Bug';
      case 'nao-implementado':
        return '❌ Não implementado';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            🗺️ Onde Aparece a Oferta de Assinatura?
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Este guia mostra <strong>exatamente onde</strong> o usuário vê o modal de upgrade no app ECO.
          </p>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Implementado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Bug/Incompleto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>Não Implementado</span>
            </div>
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {scenario.title}
                  </h3>
                  <p className="text-sm text-gray-500">{scenario.location}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border ${getStatusColor(
                    scenario.status
                  )}`}
                >
                  {getStatusLabel(scenario.status)}
                </span>
              </div>

              <p className="text-gray-700 mb-4">{scenario.description}</p>

              {/* Flow Steps */}
              <div className="space-y-2 mb-4">
                {scenario.flow.map((step, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400 font-mono">{index + 1}.</span>
                    <span className="text-gray-700">{step}</span>
                  </div>
                ))}
              </div>

              {/* Preview Box */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  Fluxo Visual:
                </p>
                <pre className="text-xs text-gray-600 font-mono whitespace-pre overflow-x-auto">
                  {scenario.preview}
                </pre>
              </div>

              {/* Action Button */}
              {scenario.status === 'implementado' && (
                <button
                  onClick={() => {
                    setSelectedScenario(scenario.id);
                    setShowModal(true);
                  }}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Testar Modal
                </button>
              )}
              {scenario.status === 'bug' && (
                <div className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-center text-sm font-medium">
                  ⚠️ Precisa correção
                </div>
              )}
              {scenario.status === 'nao-implementado' && (
                <div className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-center text-sm font-medium">
                  ❌ Não implementado
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Summary */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📊 Resumo Rápido
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
              <div className="text-3xl font-bold text-green-700 mb-2">2</div>
              <div className="text-sm font-semibold text-green-900 mb-1">
                ✅ Funcionando
              </div>
              <div className="text-xs text-green-700">
                Dr. Joe Dispenza e Introdução
              </div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
              <div className="text-3xl font-bold text-yellow-700 mb-2">1</div>
              <div className="text-sm font-semibold text-yellow-900 mb-1">
                ⚠️ Bugs
              </div>
              <div className="text-xs text-yellow-700">
                Programas (modal não abre)
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <div className="text-3xl font-bold text-gray-700 mb-2">2</div>
              <div className="text-sm font-semibold text-gray-900 mb-1">
                ❌ Pendente
              </div>
              <div className="text-xs text-gray-700">
                Configurações e Chat
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 shadow-lg text-white">
          <h2 className="text-2xl font-bold mb-4">🎯 Como Funciona na Prática</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-2 mt-1">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">1. Usuário vê conteúdo premium</div>
                <div className="text-sm text-white/80">
                  Meditação, programa ou recurso com ícone de cadeado 🔒
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-2 mt-1">
                <span className="text-xl">👆</span>
              </div>
              <div>
                <div className="font-semibold">2. Usuário tenta acessar</div>
                <div className="text-sm text-white/80">
                  Clica no card da meditação ou programa premium
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-2 mt-1">
                <X className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">3. Acesso bloqueado</div>
                <div className="text-sm text-white/80">
                  Sistema verifica que usuário não é premium
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-2 mt-1">
                <span className="text-xl">🎁</span>
              </div>
              <div>
                <div className="font-semibold">4. Modal abre com oferta</div>
                <div className="text-sm text-white/80">
                  Mostra planos Mensal (R$29,90) e Anual (R$299) com 7 dias grátis
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-2 mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">5. Usuário escolhe plano</div>
                <div className="text-sm text-white/80">
                  Clica "Começar 7 Dias Grátis" e vai para checkout Mercado Pago
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🚀 Próximos Passos
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-xl mt-1">1️⃣</div>
              <div>
                <div className="font-semibold text-gray-900">Corrigir Página Programas</div>
                <div className="text-sm text-gray-600">
                  Adicionar hook usePremiumContent e UpgradeModal
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xl mt-1">2️⃣</div>
              <div>
                <div className="font-semibold text-gray-900">Adicionar em Configurações</div>
                <div className="text-sm text-gray-600">
                  Integrar componente SubscriptionManagement
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xl mt-1">3️⃣</div>
              <div>
                <div className="font-semibold text-gray-900">Implementar Backend</div>
                <div className="text-sm text-gray-600">
                  Seguir guia BACKEND_SUBSCRIPTION_TODO.md
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal Demo */}
      <UpgradeModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedScenario(null);
        }}
        source={selectedScenario || 'demo'}
      />
    </div>
  );
}
