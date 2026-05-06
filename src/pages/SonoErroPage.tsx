import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const LANDING_URL = import.meta.env.VITE_LANDING_SONO_URL || 'https://protocolosono.com';

export default function SonoErroPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center px-6 text-center" style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-sm w-full">
        <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Pagamento não concluído
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
          Ocorreu um problema ao processar seu pagamento. Nenhum valor foi cobrado.
        </p>

        <div className="space-y-3">
          <a
            href={LANDING_URL}
            className="flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold shadow-md hover:opacity-90 transition-all active:scale-95"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)' }}
          >
            Tentar novamente
          </a>
          <button
            onClick={() => navigate('/app')}
            className="flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all active:scale-95"
            style={{ border: '1.5px solid var(--neutral-border)', color: 'var(--text-primary)' }}
          >
            Ir para o app
          </button>
        </div>

        <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
          Precisa de ajuda?{' '}
          <a href="mailto:suporte@ecotopia.com" className="underline" style={{ color: 'var(--accent)' }}>
            suporte@ecotopia.com
          </a>
        </p>
      </div>
    </div>
  );
}
