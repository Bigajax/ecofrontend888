import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock, CreditCard, Lock, ShieldCheck, Zap } from 'lucide-react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { apiUrl } from '@/config/apiBase';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

// ── Plano Anual Ecotopia (pagamento à vista que libera 1 ano de premium) ──
const PRODUCT_PRICE = 142.8;
const POLL_INTERVAL_MS = 5000;
const PIX_EXPIRATION_MIN = 15;

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined;

let mpInitialized = false;
function ensureMpInit() {
  if (!mpInitialized && MP_PUBLIC_KEY) {
    initMercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
    mpInitialized = true;
  }
}

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

function maskCpf(v: string): string {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function friendlyError(detail: string | undefined, fallback: string): string {
  if (!detail) return fallback;
  const map: Record<string, string> = {
    cc_rejected_insufficient_amount: 'Cartão sem saldo suficiente.',
    cc_rejected_bad_filled_card_number: 'Número do cartão inválido. Confira os dados.',
    cc_rejected_bad_filled_date: 'Data de validade inválida.',
    cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido.',
    cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
    cc_rejected_high_risk: 'Pagamento recusado por análise de risco. Tente outro cartão ou use Pix.',
    cc_rejected_call_for_authorize: 'Você precisa autorizar a compra com seu banco antes de tentar de novo.',
    cc_rejected_card_disabled: 'Cartão desativado. Tente outro cartão ou use Pix.',
    cc_rejected_duplicated_payment: 'Pagamento duplicado detectado. Aguarde alguns minutos.',
    cc_rejected_max_attempts: 'Muitas tentativas. Tente outro cartão ou use Pix.',
  };
  return map[detail] ?? fallback;
}

type Method = 'pix' | 'card' | null;
type PixResponse = { id: number | string; qr_code: string; qr_code_base64: string; expiration_date: string };
type StatusResponse = { id: number | string; status: string; status_detail: string };

const FEATURES = [
  'Eco IA ilimitada · 24h por dia',
  'Todas as meditações e o Protocolo do Sono',
  'Diário Estoico, Cinco Anéis e Jornadas Dispenza',
  'EcoDream · interpretação dos seus sonhos',
];

function Header() {
  const navigate = useNavigate();
  return (
    <header className="px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-10">
      <div className="mx-auto flex max-w-[640px] items-center justify-between gap-x-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-opacity hover:opacity-65"
        >
          <ArrowLeft className="h-[14px] w-[14px]" strokeWidth={2.25} />
          Voltar
        </button>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#1A4FB5' }}>
          <Lock className="h-[11px] w-[11px]" strokeWidth={2.5} />
          Checkout seguro
        </span>
      </div>
    </header>
  );
}

function MethodSegmented({ method, onChange }: { method: NonNullable<Method>; onChange: (m: NonNullable<Method>) => void }) {
  const isPix = method === 'pix';
  return (
    <div role="radiogroup" aria-label="Forma de pagamento" className="inline-flex items-center gap-1 rounded-full p-1" style={{ background: '#eaf1fb' }}>
      <button type="button" role="radio" aria-checked={!isPix} onClick={() => onChange('card')}
        className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all ${!isPix ? 'bg-white text-[#0a0a0a] shadow-[0_1px_3px_rgba(10,10,10,0.10)]' : 'text-[#7a90b5]'}`}>
        Cartão
      </button>
      <button type="button" role="radio" aria-checked={isPix} onClick={() => onChange('pix')}
        className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all ${isPix ? 'bg-[#0a0a0a] text-white shadow-[0_1px_3px_rgba(10,10,10,0.20)]' : 'text-[#7a90b5]'}`}>
        Pix
      </button>
    </div>
  );
}

function PricingCard({ onContinue }: { onContinue: (m: NonNullable<Method>) => void }) {
  const [previewMethod, setPreviewMethod] = useState<NonNullable<Method>>('card');
  return (
    <section className="mx-auto max-w-[480px] px-5 pb-10 sm:px-8" aria-label="Resumo e pagamento">
      <div className="relative overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e5e2', boxShadow: '0 8px 28px rgba(10,10,10,0.05)' }}>
        <div className="px-6 pb-6 pt-10 sm:px-9 sm:pb-7 sm:pt-12">
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-[#0a0a0a] sm:text-[24px]">
            Ecotopia Premium · Anual
          </h2>
          <p className="mt-2 text-[14px] leading-[1.55] text-[#6b6b6b]">Acesso completo por 1 ano.</p>
        </div>

        <div className="space-y-2.5 px-6 pb-1 sm:px-9">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex items-baseline gap-2">
              <span className="font-bold leading-none tracking-[-0.025em] text-[#0a0a0a]" style={{ fontSize: 'clamp(28px, 7vw, 36px)' }}>
                {formatBRL(PRODUCT_PRICE)}
              </span>
              <span className="text-[13px] font-medium text-[#6b6b6b]">/ano · R$ 11,90/mês</span>
            </div>
            <MethodSegmented method={previewMethod} onChange={setPreviewMethod} />
          </div>
          <p className="text-[12px] font-medium" style={{ color: '#1A4FB5' }}>Economize R$ 48 vs. o plano mensal (25% off).</p>
        </div>

        <div className="space-y-3 px-6 pb-2 pt-7 sm:px-9">
          <div className="text-[14px] font-bold text-[#0a0a0a]">Incluso:</div>
          <ul className="space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <span className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white" style={{ background: '#1A4FB5' }}>
                  <Check className="h-[11px] w-[11px]" strokeWidth={3} />
                </span>
                <span className="text-[13.5px] leading-[1.5] text-[#0a0a0a]">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 pb-7 pt-7 sm:px-9 sm:pb-8">
          <button
            type="button"
            onClick={() => onContinue(previewMethod)}
            className="group flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14.5px] font-semibold text-white transition-all"
            style={{ background: '#1A4FB5' }}
          >
            {previewMethod === 'pix' ? 'Continuar com Pix' : 'Continuar com cartão'}
            <ArrowRight className="h-[15px] w-[15px] transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </section>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition-opacity hover:opacity-65">
      <ArrowLeft className="h-[14px] w-[14px]" strokeWidth={2.25} />
      Outra forma de pagamento
    </button>
  );
}

function PixFlow({ onBack, onApproved }: { onBack: () => void; onApproved: () => void }) {
  const [step, setStep] = useState<'form' | 'qr' | 'error'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pix, setPix] = useState<PixResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PIX_EXPIRATION_MIN * 60);
  const expirationRef = useRef<number | null>(null);

  function validate(): string | null {
    if (!nome.trim() || nome.trim().split(/\s+/).length < 2) return 'Informe seu nome completo.';
    if (!EMAIL_RE.test(email)) return 'Email inválido.';
    if (cpf.replace(/\D/g, '').length !== 11) return 'CPF deve conter 11 dígitos.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) { setValidationError(v); return; }
    setValidationError(null);
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/payments/annual/pix'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ nome, email, cpf: cpf.replace(/\D/g, '') }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Não foi possível gerar o Pix. Tente novamente.');
      }
      const data: PixResponse = await res.json();
      setPix(data);
      const expMs = new Date(data.expiration_date).getTime();
      expirationRef.current = expMs;
      setSecondsLeft(Math.max(0, Math.floor((expMs - Date.now()) / 1000)));
      setStep('qr');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (step !== 'qr' || !expirationRef.current) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((expirationRef.current! - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (step !== 'qr' || !pix) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(apiUrl(`/api/payments/status/${pix.id}`));
        if (!res.ok) return;
        const data: StatusResponse = await res.json();
        if (stopped) return;
        if (data.status === 'approved') onApproved();
        else if (data.status === 'cancelled' || data.status === 'rejected') {
          setErrorMsg('Pagamento cancelado ou recusado.');
          setStep('error');
        }
      } catch { /* silencioso */ }
    };
    const i = setInterval(poll, POLL_INTERVAL_MS);
    return () => { stopped = true; clearInterval(i); };
  }, [step, pix, onApproved]);

  async function copyCode() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* noop */ }
  }

  if (step === 'error') {
    return (
      <section className="mx-auto mt-6 max-w-[480px] px-5 pb-16 sm:px-8">
        <BackLink onBack={onBack} />
        <div className="rounded-2xl bg-white px-7 py-9 text-center" style={{ border: '1px solid rgba(180,60,60,0.18)' }}>
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#b03c3c]">Algo deu errado</p>
          <p className="mb-7 text-[15px] leading-[1.55] text-[#0a0a0a]">{errorMsg ?? 'Não foi possível gerar o Pix.'}</p>
          <button onClick={() => { setStep('form'); setErrorMsg(null); }} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-white" style={{ background: '#1A4FB5' }}>
            Tentar de novo <ArrowRight className="h-[15px] w-[15px]" strokeWidth={2.25} />
          </button>
        </div>
      </section>
    );
  }

  if (step === 'qr' && pix) {
    const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const ss = (secondsLeft % 60).toString().padStart(2, '0');
    const expired = secondsLeft <= 0;
    return (
      <section className="mx-auto mt-6 max-w-[480px] px-5 pb-16 sm:px-8">
        <BackLink onBack={onBack} />
        <div className="rounded-2xl bg-white px-6 py-8 text-center sm:px-8" style={{ border: '1px solid #e5e5e2' }}>
          <p className="mb-6 inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: '#1A4FB5' }}>
            <Zap className="h-3.5 w-3.5" strokeWidth={2.25} /> Pix gerado
          </p>
          {!expired ? (
            <>
              <h2 className="mb-2 text-[20px] font-bold text-[#0a0a0a]">Aponte a câmera ou copie o código</h2>
              <p className="mb-7 text-[13.5px] leading-[1.6] text-[#6b6b6b]">A confirmação chega em segundos e o premium é liberado automaticamente.</p>
              <div className="mx-auto mb-7 inline-block rounded-xl bg-white p-3" style={{ border: '1px solid #ececea' }}>
                <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" width={220} height={220} style={{ display: 'block', borderRadius: 8 }} />
              </div>
              <button onClick={copyCode} className="mb-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-[15px] text-[14.5px] font-bold text-white" style={{ background: copied ? '#0a0a0a' : '#1A4FB5' }}>
                {copied ? (<><Check className="h-[15px] w-[15px]" strokeWidth={2.5} /> Código copiado</>) : 'Copiar código Pix'}
              </button>
              <div className="inline-flex items-center gap-2 text-[12.5px] font-medium text-[#6b6b6b]">
                <Clock className="h-[13px] w-[13px]" strokeWidth={2.25} />
                <span>Expira em</span>
                <span className="text-[#0a0a0a]" style={{ fontWeight: 600 }}>{mm}:{ss}</span>
              </div>
              <p className="mt-4 text-[12px] leading-[1.6] text-[#999]">Estamos aguardando a confirmação. Não feche esta página.</p>
            </>
          ) : (
            <>
              <h2 className="mb-3 text-[18px] font-bold text-[#0a0a0a]">Esse código Pix expirou.</h2>
              <button onClick={() => setStep('form')} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-white" style={{ background: '#1A4FB5' }}>
                Gerar novo Pix <ArrowRight className="h-[15px] w-[15px]" strokeWidth={2.25} />
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-6 max-w-[480px] px-5 pb-16 sm:px-8">
      <BackLink onBack={onBack} />
      <form onSubmit={handleSubmit} className="rounded-2xl bg-white px-6 py-8 sm:px-8" style={{ border: '1px solid #e5e5e2' }}>
        <p className="mb-1 inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: '#1A4FB5' }}>
          <Zap className="h-3.5 w-3.5" strokeWidth={2.25} /> Pagamento via Pix
        </p>
        <h2 className="mb-2 mt-3 text-[20px] font-bold text-[#0a0a0a]">Só precisamos dos seus dados</h2>
        <p className="mb-6 text-[22px] font-black text-[#0a0a0a]">{formatBRL(PRODUCT_PRICE)}</p>
        <div className="mb-5 flex flex-col gap-4">
          <label className="block">
            <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#6b6b6b]">Nome completo</span>
            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-xl border border-[#e5e5e2] px-4 py-3 text-[15px] outline-none focus:border-[#1A4FB5]" placeholder="Como no seu RG" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#6b6b6b]">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-[#e5e5e2] px-4 py-3 text-[15px] outline-none focus:border-[#1A4FB5]" placeholder="seu@email.com" />
          </label>
          <label className="block">
            <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#6b6b6b]">CPF</span>
            <input type="text" required inputMode="numeric" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" className="w-full rounded-xl border border-[#e5e5e2] px-4 py-3 text-[15px] outline-none focus:border-[#1A4FB5]" />
          </label>
        </div>
        {validationError && <p role="alert" className="mb-4 text-[13px] font-medium" style={{ color: '#b03c3c' }}>{validationError}</p>}
        <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14.5px] font-bold text-white" style={{ background: '#1A4FB5', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Gerando QR Code…' : `Gerar Pix de ${formatBRL(PRODUCT_PRICE)}`}
        </button>
        <p className="mt-5 text-center text-[11.5px] leading-[1.6] text-[#999]">
          <Lock className="mr-1 inline h-[11px] w-[11px]" strokeWidth={2.25} style={{ color: '#1A4FB5' }} />
          Seus dados são enviados criptografados ao Mercado Pago.
        </p>
      </form>
    </section>
  );
}

function CardFlow({ onBack, onApproved }: { onBack: () => void; onApproved: () => void }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { ensureMpInit(); }, []);

  const initialization = useMemo(() => ({ amount: PRODUCT_PRICE, payer: { email: '' } }), []);
  const customization = useMemo(
    () => ({ paymentMethods: { minInstallments: 1, maxInstallments: 12 } }),
    []
  );

  if (!MP_PUBLIC_KEY) {
    return (
      <section className="mx-auto mt-6 max-w-[480px] px-5 pb-16 sm:px-8">
        <BackLink onBack={onBack} />
        <div className="rounded-2xl bg-white px-7 py-9 text-center" style={{ border: '1px solid rgba(180,60,60,0.18)' }}>
          <p className="text-[14.5px] leading-[1.6] text-[#0a0a0a]">Configuração de pagamento ausente. Use Pix ou tente novamente em instantes.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-6 max-w-[480px] px-5 pb-16 sm:px-8">
      <BackLink onBack={onBack} />
      <div className="rounded-2xl bg-white" style={{ border: '1px solid #e5e5e2' }}>
        <div className="px-6 pt-7 pb-1 sm:px-8">
          <p className="mb-3 inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: '#1A4FB5' }}>
            <CreditCard className="h-3.5 w-3.5" strokeWidth={2.25} /> Cartão de crédito
          </p>
          <h2 className="mb-1 text-[20px] font-bold text-[#0a0a0a]">Pagamento processado pelo Mercado Pago</h2>
          <p className="mb-5 text-[13px] leading-[1.55] text-[#6b6b6b]">Em até 12x. Nenhum dado de cartão fica armazenado conosco.</p>
        </div>
        <CardPayment
          initialization={initialization}
          customization={customization}
          onSubmit={async (data) => {
            const formData = (data as { formData?: unknown })?.formData ?? data;
            setErrorMsg(null);
            setProcessing(true);
            try {
              const res = await fetch(apiUrl('/api/payments/annual/card'), {
                method: 'POST',
                headers: await authHeaders(),
                body: JSON.stringify(formData),
              });
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.message || 'Não foi possível processar o pagamento.');
              }
              const resp = (await res.json()) as StatusResponse;
              if (resp.status === 'approved') { onApproved(); return; }
              if (resp.status === 'in_process' || resp.status === 'pending') {
                setErrorMsg('Pagamento em análise. Você será avisado assim que for aprovado.');
                return;
              }
              setErrorMsg(friendlyError(resp.status_detail, 'Pagamento recusado. Tente outro cartão ou use Pix.'));
            } catch (err) {
              setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado ao processar o pagamento.');
            } finally {
              setProcessing(false);
            }
          }}
          onError={(err) => {
            console.error('mp_brick_error', err);
            setErrorMsg('Erro no formulário de cartão. Recarregue a página e tente de novo.');
          }}
        />
      </div>
      {processing && <p className="mt-5 text-center text-[13px] font-medium text-[#6b6b6b]" aria-live="polite">Processando pagamento…</p>}
      {errorMsg && (
        <div className="mt-5 rounded-xl px-5 py-4" role="alert" style={{ background: 'rgba(180,60,60,0.06)', border: '1px solid rgba(180,60,60,0.22)' }}>
          <p className="text-[13.5px] leading-[1.55] text-[#0a0a0a]">{errorMsg}</p>
        </div>
      )}
      <p className="mt-6 text-center text-[11.5px] leading-[1.6] text-[#999]">
        <Lock className="mr-1 inline h-[11px] w-[11px]" strokeWidth={2.25} style={{ color: '#1A4FB5' }} />
        Seu cartão é processado diretamente pelo Mercado Pago.
      </p>
    </section>
  );
}

function SecurityFooter() {
  return (
    <footer className="mx-auto max-w-[640px] px-5 pb-12 sm:px-8">
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#999]">
        <span className="inline-flex items-center gap-1.5"><Lock className="h-[11px] w-[11px]" strokeWidth={2.25} style={{ color: '#1A4FB5' }} /> Conexão SSL</span>
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-[12px] w-[12px]" strokeWidth={2.25} style={{ color: '#1A4FB5' }} /> Mercado Pago</span>
        <span className="inline-flex items-center gap-1.5"><Clock className="h-[11px] w-[11px]" strokeWidth={2.25} style={{ color: '#1A4FB5' }} /> Cancele quando quiser</span>
      </div>
    </footer>
  );
}

export default function CheckoutAnualPage() {
  const navigate = useNavigate();
  const { user, refreshSubscription } = useAuth();
  const [method, setMethod] = useState<Method>(null);

  useEffect(() => {
    document.title = 'Checkout · Ecotopia Premium Anual';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [method]);

  // Sem login não dá pra ativar a assinatura — manda criar conta/entrar primeiro.
  useEffect(() => {
    if (!user) {
      navigate('/register?plan=annual&from=checkout_anual&returnTo=' + encodeURIComponent('/app/checkout-anual'), { replace: true });
    }
  }, [user, navigate]);

  const handleApproved = async () => {
    try { await refreshSubscription(); } catch { /* segue mesmo assim */ }
    navigate('/app', { replace: true, state: { premiumActivated: true } });
  };

  return (
    <main className="min-h-screen bg-[#fafaf7]">
      <Header />
      {!method && <PricingCard onContinue={setMethod} />}
      {method === 'pix' && <PixFlow onBack={() => setMethod(null)} onApproved={handleApproved} />}
      {method === 'card' && <CardFlow onBack={() => setMethod(null)} onApproved={handleApproved} />}
      <SecurityFooter />
    </main>
  );
}
