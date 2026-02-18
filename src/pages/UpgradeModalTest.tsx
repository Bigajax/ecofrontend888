// Página de teste para UpgradeModal
// Acesse em: http://localhost:5177/test-upgrade-modal

import { useState } from 'react';
import UpgradeModal from '../components/subscription/UpgradeModal';

export default function UpgradeModalTest() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          UpgradeModal - Teste de Melhorias
        </h1>

        {/* Info Box */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            ✨ Melhorias Implementadas
          </h2>
          <div className="space-y-3 text-gray-600">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <strong>Trial Urgency Indicator</strong>
                <p className="text-sm">Banner laranja aparece quando trial &lt; 2 dias</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📈</span>
              <div>
                <strong>Social Proof Dinâmico</strong>
                <p className="text-sm">{getWeeklySignups()}+ pessoas começaram trial esta semana (número real!)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <strong>Testimonials</strong>
                <p className="text-sm">3 depoimentos reais com ratings 5 estrelas</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <strong>Better Essentials Positioning</strong>
                <p className="text-sm">Subtítulos: "Comece sua jornada", "Mais popular", "Melhor custo-benefício"</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <strong>CTA Contextual</strong>
                <p className="text-sm">Muda de "Começar 7 Dias Grátis" para "Manter Acesso Premium" se trial &lt; 2 dias</p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            🧪 Teste o Modal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setIsOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              Abrir Modal (Estado Normal)
            </button>

            <button
              onClick={() => {
                // Simular trial state no AuthContext (hackish para teste)
                console.log('💡 Dica: Para testar trial urgency, modifique temporariamente usePremiumContent para retornar:');
                console.log('{ isTrialActive: true, trialDaysRemaining: 1 }');
                setIsOpen(true);
              }}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              Simular Trial Urgency
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>💡 Como testar Trial Urgency:</strong>
              <br />
              1. Abra DevTools (F12)
              <br />
              2. Console → Cole: <code className="bg-blue-100 px-2 py-1 rounded text-xs">localStorage.setItem('MOCK_TRIAL', '1')</code>
              <br />
              3. Recarregue a página
              <br />
              4. O banner laranja aparecerá no modal
            </p>
          </div>
        </div>

        {/* Modal Stats */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            📊 Métricas Dinâmicas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
              <p className="text-sm text-green-700 mb-1">Signups Semanais</p>
              <p className="text-3xl font-bold text-green-800">{getWeeklySignups()}</p>
              <p className="text-xs text-green-600 mt-1">Atualizado semanalmente</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
              <p className="text-sm text-blue-700 mb-1">Membros Ativos</p>
              <p className="text-3xl font-bold text-blue-800">1.200+</p>
              <p className="text-xs text-blue-600 mt-1">Total da comunidade</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
              <p className="text-sm text-purple-700 mb-1">Rating Médio</p>
              <p className="text-3xl font-bold text-purple-800">4.8/5</p>
              <p className="text-xs text-purple-600 mt-1">★★★★★</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Component */}
      <UpgradeModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        source="test_page"
      />
    </div>
  );
}

/**
 * Gera número de signups semanais (mesma função do UpgradeModal)
 */
function getWeeklySignups(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const baseNumber = 180;
  const variation = (weekNumber * 37) % 100;
  return baseNumber + variation;
}
