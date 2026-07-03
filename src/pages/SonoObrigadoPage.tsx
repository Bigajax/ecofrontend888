import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Loader2, Check, Clock, AlertCircle, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetchJson } from '@/lib/apiFetch';
import mixpanel from '@/lib/mixpanel';

/**
 * /sono/obrigado — destino do e-mail de entrega (sendSonoWelcomeEmail) do
 * Protocolo do Sono (Pix vitalício). Fecha o loop do "paga e nunca volta":
 *
 *   webhook grava entitlement (email + guest_id) → e-mail de boas-vindas →
 *   usuário cria conta / loga → CAI AQUI → reivindica o entitlement pra sua
 *   conta (por external_reference OU pelo e-mail do payer) → entra no conteúdo.
 *
 * Sem esta página o link do e-mail caía no catch-all (→ `/`) e o claim nunca
 * era chamado — o comprador cross-device ficava sem acesso apesar de ter pago.
 *
 * Pública (o e-mail manda via /register?returnTo=/sono/obrigado). Se chegar sem
 * sessão, mandamos criar conta preservando o returnTo. O claim por e-mail
 * (fallback do backend) faz funcionar em qualquer aparelho, sem cache local.
 */

const SONO_CONTENT_PATH = '/app/meditacoes-sono';
const MAX_ATTEMPTS = 6; // ~ até 10s cobrindo o atraso do webhook
const RETRY_DELAY_MS = 2000;

type ClaimStatus = 'loading' | 'success' | 'pending' | 'error';

export default function SonoObrigadoPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  const externalRef = params.get('external_reference') || '';
  const [status, setStatus] = useState<ClaimStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const startedRef = useRef(false);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  useEffect(() => {
    if (loading) return; // espera a sessão resolver
    // Sem sessão: manda criar conta preservando o returnTo (o e-mail já aponta
    // pra cá via /register, mas cobre o acesso direto ao link sem estar logado).
    if (!user) {
      const returnTo = location.pathname + location.search;
      navigate(`/register?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const claim = async (attempt: number): Promise<void> => {
      const result = await apiFetchJson<{ success?: boolean }>('/api/entitlements/claim', {
        method: 'POST',
        // external_reference tem prioridade no backend; o e-mail é o fallback que
        // faz o claim funcionar mesmo sem a referência (cross-device) e satisfaz
        // o guard de identificador do endpoint.
        body: JSON.stringify({
          external_reference: externalRef || undefined,
          email: user.email || undefined,
        }),
      });
      if (!aliveRef.current) return;

      if (result.ok) {
        setStatus('success');
        mixpanel.track('Funil Sono · Entrega reivindicada', {
          external_reference: externalRef || null,
          user_id: user.id,
        });
        window.setTimeout(() => {
          if (aliveRef.current) navigate(SONO_CONTENT_PATH, { replace: true });
        }, 2200);
        return;
      }

      // 404 = entitlement ainda não gravado (webhook em processamento) → retry.
      if ((result.status === 404 || result.status === 0) && attempt < MAX_ATTEMPTS) {
        window.setTimeout(() => { if (aliveRef.current) void claim(attempt + 1); }, RETRY_DELAY_MS);
        return;
      }
      if (result.status === 404) {
        setStatus('pending');
        mixpanel.track('Funil Sono · Entrega pendente', {
          external_reference: externalRef || null,
          user_id: user.id,
        });
        return;
      }
      if (result.status === 409) {
        setStatus('error');
        setErrorMsg('Este acesso já está vinculado a outra conta. Se precisar, fale com o suporte.');
        return;
      }
      setStatus('error');
      setErrorMsg('Não conseguimos liberar seu acesso agora. Tente recarregar a página.');
    };

    void claim(0);
  }, [loading, user, externalRef, navigate, location.pathname, location.search]);

  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center px-5 py-10"
      style={{ background: 'linear-gradient(180deg, #0B0718 0%, #140C2A 55%, #0B0718 100%)' }}
    >
      <div
        className="w-full max-w-[420px] rounded-3xl p-8 text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
          border: '1px solid rgba(167,139,250,0.22)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <span
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: 'rgba(167,139,250,0.12)',
            border: '1.5px solid rgba(167,139,250,0.6)',
            boxShadow: '0 0 22px rgba(167,139,250,0.4)',
          }}
        >
          {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#C4B5FD' }} />}
          {status === 'success' && <Check className="h-7 w-7" strokeWidth={2.5} style={{ color: '#C4B5FD' }} />}
          {status === 'pending' && <Clock className="h-6 w-6" style={{ color: '#C4B5FD' }} />}
          {status === 'error' && <AlertCircle className="h-6 w-6" style={{ color: '#F8B4B4' }} />}
        </span>

        {status === 'loading' && (
          <>
            <h1 className="font-display text-[24px] font-bold text-white">Liberando seu acesso…</h1>
            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: 'rgba(214,203,250,0.6)' }}>
              Estamos vinculando o Protocolo do Sono à sua conta. Leva só um instante.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-3 flex items-center justify-center gap-2">
              <Moon className="h-3.5 w-3.5" style={{ color: 'rgba(196,181,253,0.6)' }} />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(196,181,253,0.65)' }}>
                Acesso liberado
              </p>
            </div>
            <h1 className="font-display text-[24px] font-bold text-white">
              Suas 7 noites estão <span style={{ color: '#C4B5FD' }}>com você.</span>
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: 'rgba(214,203,250,0.6)' }}>
              Levando você para o protocolo…
            </p>
          </>
        )}

        {status === 'pending' && (
          <>
            <h1 className="font-display text-[23px] font-bold text-white">Confirmando seu pagamento</h1>
            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: 'rgba(214,203,250,0.6)' }}>
              Seu pagamento pode levar alguns minutos pra confirmar. Assim que confirmar,
              seu acesso é liberado — e você também recebe um aviso por e-mail.
            </p>
            <button
              onClick={() => navigate(SONO_CONTENT_PATH, { replace: true })}
              className="mt-6 w-full rounded-full py-3.5 text-[15px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)', boxShadow: '0 10px 32px rgba(124,58,237,0.4)' }}
            >
              Ir para o app
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="font-display text-[23px] font-bold text-white">Precisamos de um passo a mais</h1>
            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: 'rgba(214,203,250,0.6)' }}>
              {errorMsg}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => navigate(SONO_CONTENT_PATH, { replace: true })}
                className="w-full rounded-full py-3.5 text-[15px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)' }}
              >
                Ir para o app
              </button>
              <a
                href="mailto:ecotopia.app777@gmail.com"
                className="text-[13px] underline underline-offset-4"
                style={{ color: 'rgba(214,203,250,0.6)' }}
              >
                Falar com o suporte
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
