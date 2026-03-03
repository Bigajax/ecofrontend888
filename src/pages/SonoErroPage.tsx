import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const LANDING_URL = import.meta.env.VITE_LANDING_SONO_URL || 'https://protocolosono.com';

export default function SonoErroPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm w-full">
        <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-3">
          Pagamento não concluído
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-8">
          Ocorreu um problema ao processar seu pagamento. Nenhum valor foi cobrado.
        </p>

        <div className="space-y-3">
          <a
            href={LANDING_URL}
            className="block w-full rounded-full bg-eco-babyDark px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all active:scale-95"
          >
            Tentar novamente
          </a>
          <button
            onClick={() => navigate('/app')}
            className="block w-full rounded-full border border-eco-baby px-6 py-3 text-sm font-semibold text-eco-babyDark hover:bg-eco-babySoft transition-all active:scale-95"
          >
            Ir para o app
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Precisa de ajuda?{' '}
          <a href="mailto:suporte@ecotopia.com" className="underline text-eco-babyDark">
            suporte@ecotopia.com
          </a>
        </p>
      </div>
    </div>
  );
}
