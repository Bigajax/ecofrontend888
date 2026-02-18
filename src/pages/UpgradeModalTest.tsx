// src/pages/UpgradeModalTest.tsx
// Página de teste visual para o UpgradeModal refatorado
// Acesse em: http://localhost:5173/test-upgrade-modal

import { lazy, Suspense, useState } from 'react';
import UpgradeModal from '../components/subscription/UpgradeModal';

const HomePage = lazy(() => import('./HomePage'));

export default function UpgradeModalTest() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* App real como fundo (apenas visual) */}
      <div className="pointer-events-none select-none" aria-hidden="true">
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
          <HomePage />
        </Suspense>
      </div>

      {/* Botão flutuante para reabrir o modal */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#6EC8FF] to-[#5AB3D9] text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:-translate-x-1/2 transition-all duration-200"
        >
          Reabrir modal →
        </button>
      )}

      {/* Modal */}
      <UpgradeModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        source="test_page"
      />
    </div>
  );
}
