// Página de teste para Voice Interaction Limits
// Acesse em: http://localhost:5177/test-voice-limits

import { useState } from 'react';
import { MessageSquare, Mic, Sparkles, TrendingUp } from 'lucide-react';
import { useVoiceInteractionLimits } from '../hooks/useVoiceInteractionLimits';
import { useSubscriptionTier } from '../hooks/usePremiumContent';
import UpgradeModal from '../components/subscription/UpgradeModal';

export default function VoiceLimitsTest() {
  const voiceLimits = useVoiceInteractionLimits();
  const tier = useSubscriptionTier();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Voice Interaction Limits - Teste
        </h1>

        {/* Current State Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            📊 Estado Atual
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
              <p className="text-sm text-blue-700 mb-1">Tier</p>
              <p className="text-3xl font-bold text-blue-800 capitalize">{tier}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
              <p className="text-sm text-purple-700 mb-1">Usadas Hoje</p>
              <p className="text-3xl font-bold text-purple-800">{voiceLimits.count}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
              <p className="text-sm text-green-700 mb-1">Restantes</p>
              <p className="text-3xl font-bold text-green-800">
                {voiceLimits.limit === Infinity ? '∞' : voiceLimits.remaining}
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
              <p className="text-sm text-orange-700 mb-1">Limite Diário</p>
              <p className="text-3xl font-bold text-orange-800">
                {voiceLimits.limit === Infinity ? '∞' : voiceLimits.limit}
              </p>
            </div>
          </div>
        </div>

        {/* Limits by Tier */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            🎯 Limites por Tier
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Free</p>
                  <p className="text-sm text-gray-600">Tier gratuito</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-800">5</p>
                <p className="text-xs text-gray-600">msgs/dia</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-800">Essentials</p>
                  <p className="text-sm text-blue-600">R$ 14,90/mês</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-800">20</p>
                <p className="text-xs text-blue-600">msgs/dia</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-purple-800">Premium</p>
                  <p className="text-sm text-purple-600">R$ 29,90/mês</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-800">∞</p>
                <p className="text-xs text-purple-600">ilimitado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            🧪 Ações de Teste
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                voiceLimits.incrementCount();
              }}
              disabled={voiceLimits.reachedLimit}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              <Mic className="w-5 h-5" />
              <span>Simular Mensagem de Voz</span>
            </button>

            <button
              onClick={() => {
                voiceLimits.resetCount();
              }}
              className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>Resetar Contador</span>
            </button>

            <button
              onClick={() => {
                setShowModal(true);
              }}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>Abrir Modal de Upgrade</span>
            </button>

            <button
              onClick={() => {
                // Simular atingir limite
                while (!voiceLimits.reachedLimit) {
                  voiceLimits.incrementCount();
                }
              }}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>Atingir Limite Instantâneamente</span>
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            🚦 Indicadores de Status
          </h2>
          <div className="space-y-4">
            {/* Reached Limit */}
            <div className={`p-4 rounded-xl border-2 ${
              voiceLimits.reachedLimit
                ? 'bg-red-50 border-red-300'
                : 'bg-gray-50 border-gray-200 opacity-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${
                  voiceLimits.reachedLimit ? 'bg-red-500' : 'bg-gray-300'
                }`} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">Limite Atingido (Hard Gate)</p>
                  <p className="text-sm text-gray-600">
                    {voiceLimits.reachedLimit
                      ? '🔴 Bloqueado - Modal de upgrade aparece'
                      : 'Inativo - Ainda pode enviar mensagens'}
                  </p>
                </div>
              </div>
            </div>

            {/* Soft Prompt */}
            <div className={`p-4 rounded-xl border-2 ${
              voiceLimits.shouldShowSoftPrompt
                ? 'bg-orange-50 border-orange-300'
                : 'bg-gray-50 border-gray-200 opacity-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${
                  voiceLimits.shouldShowSoftPrompt ? 'bg-orange-500' : 'bg-gray-300'
                }`} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">Soft Prompt (1 mensagem restante)</p>
                  <p className="text-sm text-gray-600">
                    {voiceLimits.shouldShowSoftPrompt
                      ? '🟠 Ativo - Aviso amarelo aparece'
                      : 'Inativo - Mais de 1 mensagem restante'}
                  </p>
                </div>
              </div>
            </div>

            {/* Normal State */}
            <div className={`p-4 rounded-xl border-2 ${
              !voiceLimits.reachedLimit && !voiceLimits.shouldShowSoftPrompt
                ? 'bg-green-50 border-green-300'
                : 'bg-gray-50 border-gray-200 opacity-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${
                  !voiceLimits.reachedLimit && !voiceLimits.shouldShowSoftPrompt ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">Estado Normal</p>
                  <p className="text-sm text-gray-600">
                    {!voiceLimits.reachedLimit && !voiceLimits.shouldShowSoftPrompt
                      ? '🟢 Ativo - Pode enviar normalmente'
                      : 'Inativo'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Como testar no VoicePage real:</strong>
            <br />
            1. Vá para <code className="bg-blue-100 px-2 py-1 rounded">/app/voice</code>
            <br />
            2. O contador aparecerá abaixo do selo "Em construção"
            <br />
            3. Cores: 🔵 Azul (normal) | 🟠 Laranja (1 restante) | 🔴 Vermelho (limite atingido)
            <br />
            4. Ao atingir limite, modal de upgrade abrirá automaticamente
            <br />
            5. Limite reseta automaticamente à meia-noite UTC
          </p>
        </div>
      </div>

      {/* Modal */}
      <UpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        source="voice_limits_test"
      />
    </div>
  );
}
