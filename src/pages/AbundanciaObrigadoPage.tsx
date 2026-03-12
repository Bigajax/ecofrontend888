import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetchJson } from '@/lib/apiFetch';

type PageState = 'loading' | 'approved' | 'pending' | 'claimed';

const CLAIM_MAX_RETRIES = 4;
const CLAIM_RETRY_DELAY_MS = 3000;
const GOLD = '#FFB932';

export default function AbundanciaObrigadoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const externalRef = searchParams.get('external_reference') || sessionStorage.getItem('eco.abundancia.external_reference') || '';
  const paymentId = searchParams.get('payment_id') || sessionStorage.getItem('eco.abundancia.payment_id') || '';
  const mpStatus = searchParams.get('status') || sessionStorage.getItem('eco.abundancia.status') || '';

  const [pageState, setPageState] = useState<PageState>(
    mpStatus === 'approved' ? 'approved' : mpStatus === 'pending' ? 'pending' : 'loading'
  );
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimRetry, setClaimRetry] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // FB Pixel Purchase ao montar (uma única vez)
  useEffect(() => {
    if (pageState === 'approved' && typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'Purchase', { value: 67, currency: 'BRL' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timeout de segurança se ficar em loading > 6s
  useEffect(() => {
    if (pageState !== 'loading') return;
    const t = setTimeout(() => setLoadingTimeout(true), 6000);
    return () => clearTimeout(t);
  }, [pageState]);

  // Persistir params no sessionStorage
  useEffect(() => {
    if (externalRef) sessionStorage.setItem('eco.abundancia.external_reference', externalRef);
    if (paymentId) sessionStorage.setItem('eco.abundancia.payment_id', paymentId);
    if (mpStatus) sessionStorage.setItem('eco.abundancia.status', mpStatus);
  }, [externalRef, paymentId, mpStatus]);

  const doClaim = async (attempt = 0) => {
    const storedRef = externalRef || sessionStorage.getItem('eco.abundancia.external_reference') || '';
    const storedPaymentId = paymentId || sessionStorage.getItem('eco.abundancia.payment_id') || '';

    if (!storedRef && !storedPaymentId) return;

    setClaiming(true);
    setClaimError('');
    setClaimRetry(attempt);

    const result = await apiFetchJson('/api/entitlements/claim', {
      method: 'POST',
      body: JSON.stringify({
        external_reference: storedRef || undefined,
        payment_id: storedPaymentId || undefined,
        email: user?.email,
      }),
    });

    if (result.ok) {
      setClaiming(false);
      setPageState('claimed');
      sessionStorage.removeItem('eco.abundancia.external_reference');
      sessionStorage.removeItem('eco.abundancia.payment_id');
      sessionStorage.removeItem('eco.abundancia.status');
      return;
    }

    if (result.status === 404 && attempt < CLAIM_MAX_RETRIES) {
      setTimeout(() => doClaim(attempt + 1), CLAIM_RETRY_DELAY_MS);
      return;
    }

    setClaiming(false);
    const data = result.data as any;
    if (result.status === 409) {
      setClaimError(
        'Este pedido já está associado a outra conta. Entre em contato com ecotopia.app777@gmail.com informando o número do pedido.'
      );
    } else if (result.status === 404) {
      setClaimError('Pagamento ainda sendo confirmado. Aguarde um momento e tente novamente.');
    } else {
      setClaimError(data?.message || 'Erro ao liberar acesso. Tente novamente.');
    }
  };

  // Claim automático quando usuário logado e pagamento aprovado
  useEffect(() => {
    if (!user || pageState !== 'approved') return;
    doClaim(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pageState]);

  // Auto-navegar após claim bem-sucedido
  useEffect(() => {
    if (pageState !== 'claimed') return;
    const t = setTimeout(() => navigate('/app/codigo-da-abundancia'), 2000);
    return () => clearTimeout(t);
  }, [pageState, navigate]);

  const buildReturnUrl = () => {
    const targetParams = new URLSearchParams();
    const refToUse = externalRef || sessionStorage.getItem('eco.abundancia.external_reference') || '';
    const pidToUse = paymentId || sessionStorage.getItem('eco.abundancia.payment_id') || '';
    const statusToUse = mpStatus || sessionStorage.getItem('eco.abundancia.status') || '';
    if (refToUse) targetParams.set('external_reference', refToUse);
    if (pidToUse) targetParams.set('payment_id', pidToUse);
    if (statusToUse) targetParams.set('status', statusToUse);
    const qs = targetParams.toString();
    const targetPath = `/abundancia/obrigado${qs ? `?${qs}` : ''}`;
    return `returnTo=${encodeURIComponent(targetPath)}`;
  };

  const bg = '#09090F';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    if (loadingTimeout) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: bg }}>
          <div className="max-w-sm w-full">
            <p className="font-medium mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>Não foi possível verificar o pagamento.</p>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Se você acabou de pagar, verifique seu e-mail — enviamos as instruções de acesso para você.
            </p>
            <a href="mailto:ecotopia.app777@gmail.com" className="text-sm underline" style={{ color: GOLD }}>
              Precisa de ajuda? Fale com a gente
            </a>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: GOLD }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Verificando pagamento…</p>
        </div>
      </div>
    );
  }

  // ── Pendente ──────────────────────────────────────────────────────────────
  if (pageState === 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: bg }}>
        <div className="max-w-sm w-full">
          <Clock className="h-14 w-14 mx-auto mb-4" style={{ color: GOLD }} />
          <h1 className="font-display text-2xl font-bold mb-3 text-white">
            Pagamento em análise
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Seu pagamento está sendo processado. Você receberá o acesso assim que for confirmado.
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Número do pedido: <span className="font-mono">{externalRef || '—'}</span>
          </p>
          <p className="mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Dúvidas? Envie para{' '}
            <a href="mailto:suporte@ecotopia.com" className="underline" style={{ color: GOLD }}>
              suporte@ecotopia.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Claimed ───────────────────────────────────────────────────────────────
  if (pageState === 'claimed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: bg }}>
        <div
          className="pointer-events-none fixed inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 45% at 50% 10%, rgba(255,185,50,0.09) 0%, transparent 70%)' }}
        />
        <div className="max-w-sm w-full relative">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,185,50,0.15)', border: `2px solid rgba(255,185,50,0.45)`, boxShadow: '0 0 32px rgba(255,185,50,0.18)' }}
          >
            <Sparkles className="h-7 w-7" style={{ color: GOLD }} />
          </div>
          <h1 className="font-display text-2xl font-bold mb-3" style={{ color: GOLD }}>
            Código Ativado!
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Seu Código da Abundância está pronto. A transformação começa agora.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: GOLD }} />
            Abrindo o protocolo…
          </div>
        </div>
      </div>
    );
  }

  // ── Aprovado — aguardando claim ───────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: bg }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 45% at 50% 10%, rgba(255,185,50,0.09) 0%, transparent 70%)' }}
      />
      <div className="max-w-sm w-full relative">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(255,185,50,0.15)', border: `2px solid rgba(255,185,50,0.45)`, boxShadow: '0 0 32px rgba(255,185,50,0.18)' }}
        >
          <CheckCircle className="h-7 w-7" style={{ color: GOLD }} />
        </div>
        <h1 className="font-display text-2xl font-bold mb-3" style={{ color: GOLD }}>
          Pagamento confirmado!
        </h1>
        <p className="text-sm leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Preparando seu acesso ao Código da Abundância.
        </p>

        {claiming && (
          <div className="flex items-center justify-center gap-2 my-4">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: GOLD }} />
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {claimRetry > 0
                ? `Confirmando pagamento… (tentativa ${claimRetry + 1})`
                : 'Liberando acesso…'}
            </span>
          </div>
        )}

        {claimError && (
          <p className="text-sm text-red-400 mb-4">{claimError}</p>
        )}

        {/* Usuário NÃO logado */}
        {!user && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Crie sua conta gratuita para acessar o protocolo:
            </p>
            <button
              onClick={() => navigate(`/register?${buildReturnUrl()}`)}
              className="w-full rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all active:scale-95 hover:scale-105"
              style={{ background: GOLD, color: '#09090F', boxShadow: '0 4px 18px rgba(255,185,50,0.35)' }}
            >
              Criar conta e acessar
            </button>
            <button
              onClick={() => navigate(`/login?${buildReturnUrl()}`)}
              className="w-full rounded-full px-6 py-3 text-sm font-semibold transition-all active:scale-95"
              style={{ border: `1px solid rgba(255,185,50,0.35)`, color: GOLD }}
            >
              Já tenho conta — Entrar
            </button>
          </div>
        )}

        {/* Usuário logado mas claim falhou */}
        {user && claimError && (
          <button
            onClick={() => doClaim()}
            disabled={claiming}
            className="mt-4 w-full rounded-full px-6 py-3 text-sm font-semibold transition-all disabled:opacity-50"
            style={{ border: `1px solid rgba(255,185,50,0.35)`, color: GOLD }}
          >
            Tentar novamente
          </button>
        )}

        {/* Fallback de suporte */}
        <div
          className="mt-8 rounded-xl px-4 py-4 text-left"
          style={{ background: 'rgba(255,185,50,0.06)', border: '1px solid rgba(255,185,50,0.18)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <span className="font-medium">Número do pedido:</span>{' '}
            <span className="font-mono break-all">{externalRef || '—'}</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Não consegue acessar? Envie esse número para{' '}
            <a href="mailto:suporte@ecotopia.com" className="underline" style={{ color: GOLD }}>
              suporte@ecotopia.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
