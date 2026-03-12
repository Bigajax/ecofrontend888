import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const GOLD = '#FFB932';
const LANDING_URL = import.meta.env.VITE_LANDING_ABUNDANCIA_URL || 'https://codigodaabundancia.com';

export default function AbundanciaErroPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#09090F' }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 10%, rgba(255,80,80,0.07) 0%, transparent 70%)' }}
      />
      <div className="max-w-sm w-full relative">
        <XCircle className="h-14 w-14 mx-auto mb-4 text-red-400" />
        <h1 className="font-display text-2xl font-bold mb-3 text-white">
          Pagamento não concluído
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Ocorreu um problema ao processar seu pagamento. Nenhum valor foi cobrado.
        </p>

        <div className="space-y-3">
          <a
            href={LANDING_URL}
            className="block w-full rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all active:scale-95 hover:scale-105"
            style={{ background: GOLD, color: '#09090F', boxShadow: '0 4px 18px rgba(255,185,50,0.35)' }}
          >
            Tentar novamente
          </a>
          <button
            onClick={() => navigate('/app')}
            className="block w-full rounded-full px-6 py-3 text-sm font-semibold transition-all active:scale-95"
            style={{ border: `1px solid rgba(255,185,50,0.35)`, color: GOLD }}
          >
            Ir para o app
          </button>
        </div>

        <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Precisa de ajuda?{' '}
          <a href="mailto:suporte@ecotopia.com" className="underline" style={{ color: GOLD }}>
            suporte@ecotopia.com
          </a>
        </p>
      </div>
    </div>
  );
}
