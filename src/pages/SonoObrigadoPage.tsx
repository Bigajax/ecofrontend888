import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetchJson } from '@/lib/apiFetch';

type PageState = 'loading' | 'approved' | 'pending' | 'claimed';

export default function SonoObrigadoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const externalRef = searchParams.get('external_reference') || sessionStorage.getItem('eco.sono.external_reference') || '';
  const paymentId = searchParams.get('payment_id') || sessionStorage.getItem('eco.sono.payment_id') || '';
  const mpStatus = searchParams.get('status') || sessionStorage.getItem('eco.sono.status') || '';

  // mpStatus já inclui fallback para sessionStorage
  const [pageState, setPageState] = useState<PageState>(
    mpStatus === 'approved' ? 'approved' : mpStatus === 'pending' ? 'pending' : 'loading'
  );
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);

  // Disparar evento de Purchase quando pagamento aprovado (uma única vez no mount)
  useEffect(() => {
    if (pageState === 'approved' && typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'Purchase', { value: 37, currency: 'BRL' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir params no sessionStorage para sobreviver ao login redirect
  useEffect(() => {
    if (externalRef) sessionStorage.setItem('eco.sono.external_reference', externalRef);
    if (paymentId) sessionStorage.setItem('eco.sono.payment_id', paymentId);
    if (mpStatus) sessionStorage.setItem('eco.sono.status', mpStatus);
  }, [externalRef, paymentId, mpStatus]);

  // Quando usuário já está logado e pagamento aprovado: claim automático
  useEffect(() => {
    if (!user || pageState !== 'approved') return;

    const storedRef = externalRef || sessionStorage.getItem('eco.sono.external_reference') || '';
    const storedPaymentId = paymentId || sessionStorage.getItem('eco.sono.payment_id') || '';

    if (!storedRef && !storedPaymentId) return;

    const doClaim = async () => {
      setClaiming(true);
      setClaimError('');

      const result = await apiFetchJson('/api/entitlements/claim', {
        method: 'POST',
        body: JSON.stringify({
          external_reference: storedRef || undefined,
          payment_id: storedPaymentId || undefined,
          email: user.email,
        }),
      });

      setClaiming(false);

      if (result.ok) {
        setPageState('claimed');
        sessionStorage.removeItem('eco.sono.external_reference');
        sessionStorage.removeItem('eco.sono.payment_id');
        sessionStorage.removeItem('eco.sono.status');
      } else {
        const data = result.data as any;
        if (result.status === 409) {
          // Entitlement já vinculado a outra conta — erro real, acionar suporte
          setClaimError(
            'Este pedido já está associado a outra conta. Entre em contato com suporte@ecotopia.com informando o número do pedido.'
          );
        } else if (result.status === 404) {
          // Webhook ainda não chegou — mostrar mensagem de espera
          setClaimError('Pagamento ainda sendo confirmado. Aguarde um momento e tente novamente.');
        } else {
          setClaimError(data?.message || 'Erro ao liberar acesso. Tente novamente.');
        }
      }
    };

    doClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pageState]);

  const buildReturnUrl = () => {
    // Codificar o caminho completo (com params MP) dentro do valor de returnTo,
    // para que navigate(returnTo) restaure tudo após o login.
    const targetParams = new URLSearchParams();
    const refToUse = externalRef || sessionStorage.getItem('eco.sono.external_reference') || '';
    const pidToUse = paymentId || sessionStorage.getItem('eco.sono.payment_id') || '';
    const statusToUse = mpStatus || sessionStorage.getItem('eco.sono.status') || '';
    if (refToUse) targetParams.set('external_reference', refToUse);
    if (pidToUse) targetParams.set('payment_id', pidToUse);
    if (statusToUse) targetParams.set('status', statusToUse);
    const qs = targetParams.toString();
    const targetPath = `/sono/obrigado${qs ? `?${qs}` : ''}`;
    return `returnTo=${encodeURIComponent(targetPath)}`;
  };

  // ── Estado: carregando ───────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-eco-babyDark" />
          <p className="text-sm text-gray-500">Verificando pagamento…</p>
        </div>
      </div>
    );
  }

  // ── Estado: pendente ─────────────────────────────────────────────────────
  if (pageState === 'pending') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm w-full">
          <Clock className="h-14 w-14 text-amber-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-3">
            Pagamento em análise
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            Seu pagamento está sendo processado. Você receberá o acesso assim que for confirmado.
          </p>
          <p className="text-xs text-gray-400">
            Número do pedido: <span className="font-mono">{externalRef || '—'}</span>
          </p>
          <p className="mt-3 text-xs text-gray-400">
            Dúvidas? Envie para{' '}
            <a href="mailto:suporte@ecotopia.com" className="underline text-eco-babyDark">
              suporte@ecotopia.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Estado: acesso liberado (claim feito) ────────────────────────────────
  if (pageState === 'claimed') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm w-full">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-3">
            Acesso liberado!
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-8">
            Seu Protocolo Sono Profundo está pronto. Boa primeira noite.
          </p>
          <button
            onClick={() => navigate('/app/meditacoes-sono')}
            className="w-full rounded-full bg-eco-babyDark px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all active:scale-95"
          >
            Entrar no Protocolo
          </button>
        </div>
      </div>
    );
  }

  // ── Estado: aprovado, aguardando claim ──────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm w-full">
        <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-3">
          Pagamento confirmado!
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-2">
          Preparando seu acesso ao Protocolo Sono Profundo.
        </p>

        {claiming && (
          <div className="flex items-center justify-center gap-2 my-4">
            <Loader2 className="h-4 w-4 animate-spin text-eco-babyDark" />
            <span className="text-sm text-gray-500">Liberando acesso…</span>
          </div>
        )}

        {claimError && (
          <p className="text-sm text-red-500 mb-4">{claimError}</p>
        )}

        {/* Usuário NÃO logado */}
        {!user && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-gray-700 font-medium">
              Para acessar o protocolo, entre na sua conta Ecotopia:
            </p>
            <button
              onClick={() => navigate(`/login?${buildReturnUrl()}`)}
              className="w-full rounded-full bg-eco-babyDark px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all active:scale-95"
            >
              Já tenho conta — Entrar
            </button>
            <button
              onClick={() => navigate(`/register?${buildReturnUrl()}`)}
              className="w-full rounded-full border border-eco-baby px-6 py-3 text-sm font-semibold text-eco-babyDark hover:bg-eco-babySoft transition-all active:scale-95"
            >
              Criar conta grátis
            </button>
          </div>
        )}

        {/* Usuário logado mas claim ainda não completou */}
        {user && claimError && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full rounded-full border border-eco-baby px-6 py-3 text-sm font-semibold text-eco-babyDark hover:bg-eco-babySoft transition-all"
          >
            Tentar novamente
          </button>
        )}

        {/* Fallback de suporte */}
        <div className="mt-8 rounded-xl bg-gray-50 px-4 py-4 text-left">
          <p className="text-xs text-gray-500">
            <span className="font-medium">Número do pedido:</span>{' '}
            <span className="font-mono break-all">{externalRef || '—'}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Não consegue acessar? Envie esse número para{' '}
            <a href="mailto:suporte@ecotopia.com" className="underline text-eco-babyDark">
              suporte@ecotopia.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
