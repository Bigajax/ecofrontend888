import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import mixpanel from '@/lib/mixpanel';

const PRODUCT_KEY = 'protocolo_sono_7_noites';
const OFFER_DURATION_MS = 12 * 60 * 1000;

type SonoMicroAnswer = 'Sim, relaxei' | 'Um pouco' | 'Ainda estou agitado';

interface SonoCutoffQuizOfferProps {
  open: boolean;
  guestId: string;
  source?: string;
  checkoutLoading: boolean;
  onCheckout: () => void;
  onDismiss: () => void;
}

const ANSWERS: SonoMicroAnswer[] = ['Sim, relaxei', 'Um pouco', 'Ainda estou agitado'];

const ANSWER_COPY: Record<SonoMicroAnswer, string> = {
  'Sim, relaxei':
    'Isso não foi sorte. Seu corpo respondeu ao primeiro estímulo. Agora ele precisa de continuidade para aprender a desacelerar sozinho.',
  'Um pouco':
    'É exatamente assim que começa. Primeiro o corpo reduz a resistência. Depois, com repetição, ele aprende a desligar com mais facilidade.',
  'Ainda estou agitado':
    'Isso também faz parte do padrão. Quando o corpo ficou muito tempo em alerta, ele precisa de repetição guiada para começar a soltar.',
};

const BENEFITS = [
  'Pagamento único',
  'Sem mensalidade',
  'Acesso imediato',
  'Noites 2 a 7 desbloqueadas',
];

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function getTimerStart(guestId: string) {
  const key = `eco.sono.offer_timer_started_at.${guestId}`;
  const stored = localStorage.getItem(key);
  if (stored) return Number(stored);

  const startedAt = Date.now();
  localStorage.setItem(key, String(startedAt));
  return startedAt;
}

export function SonoCutoffQuizOffer({
  open,
  guestId,
  source = 'quiz_sono_guest',
  checkoutLoading,
  onCheckout,
  onDismiss,
}: SonoCutoffQuizOfferProps) {
  const [step, setStep] = useState<'quiz' | 'offer'>('quiz');
  const [answer, setAnswer] = useState<SonoMicroAnswer | null>(null);
  const [timeLeft, setTimeLeft] = useState(OFFER_DURATION_MS);

  useEffect(() => {
    if (!open) return;
    setStep('quiz');
    setAnswer(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const startedAt = getTimerStart(guestId);
      setTimeLeft(Math.max(0, OFFER_DURATION_MS - (Date.now() - startedAt)));
    };

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [guestId, open]);

  const dynamicCopy = useMemo(() => {
    return ANSWER_COPY[answer ?? 'Um pouco'];
  }, [answer]);

  const handleAnswer = (selectedAnswer: SonoMicroAnswer) => {
    setAnswer(selectedAnswer);
    localStorage.setItem(`eco.sono.guest.micro_answer.${guestId}`, selectedAnswer);
    mixpanel.track('Sleep Micro Quiz Answered', {
      guest_id: guestId,
      answer: selectedAnswer,
      source,
      product_key: PRODUCT_KEY,
      cutoff_time: 240,
    });
    setStep('offer');
  };

  const handleCheckout = () => {
    mixpanel.track('Sleep Offer CTA Clicked', {
      guest_id: guestId,
      source,
      product_key: PRODUCT_KEY,
      context: 'cutoff_offer',
    });
    onCheckout();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center p-4 sm:items-center"
      style={{
        zIndex: 2147483647,
        background: 'rgba(3,6,18,0.76)',
        backdropFilter: 'blur(14px)',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl px-6 pb-6 pt-7 text-center shadow-2xl sm:px-7"
        style={{
          background: 'linear-gradient(160deg, #070B1D 0%, #050817 58%, #101733 100%)',
          border: '1px solid rgba(196,181,253,0.24)',
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-[-120px] h-80 w-80 -translate-x-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 68%)' }}
        />

        <div className="relative z-10">
          {step === 'quiz' ? (
            <>
              <h2 className="font-display mb-2 text-[25px] font-bold leading-tight text-white">
                Seu corpo já começou a mudar.
              </h2>
              <p className="mb-6 text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
                Perceba por um instante: algo ficou diferente agora?
              </p>
              <p className="mb-4 text-[15px] font-semibold text-white">Você sentiu alguma diferença?</p>
              <div className="flex flex-col gap-3">
                {ANSWERS.map((item, index) => (
                  <button
                    key={item}
                    onClick={() => handleAnswer(item)}
                    className="w-full rounded-full py-4 text-[15px] font-bold transition-transform active:scale-[0.98]"
                    style={
                      index === 0
                        ? {
                            background: 'linear-gradient(135deg, #A78BFA 0%, #6D42C9 100%)',
                            boxShadow: '0 10px 30px rgba(124,58,237,0.45)',
                            color: '#FFFFFF',
                          }
                        : {
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.13)',
                            color: 'rgba(255,255,255,0.84)',
                          }
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display mb-3 text-[23px] font-bold leading-tight text-white">
                Agora é onde o resultado acontece.
              </h2>
              <p className="mb-4 text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
                A primeira mudança já começou. As próximas noites aprofundam esse processo.
              </p>
              <p className="mb-5 text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
                {dynamicCopy}
              </p>

              <div
                className="mb-5 rounded-2xl px-5 py-4"
                style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(196,181,253,0.16)' }}
              >
                <p className="mb-3 text-[14px] font-semibold text-white">
                  Desbloqueie as 7 noites completas por R$37.
                </p>
                <div className="grid grid-cols-2 gap-2 text-left">
                  {BENEFITS.map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
                      <Check className="h-3 w-3 flex-shrink-0" style={{ color: '#C4B5FD' }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {timeLeft > 0 && (
                <div className="mb-5 text-[12px]" style={{ color: 'rgba(255,255,255,0.54)' }}>
                  Condição especial expira em:{' '}
                  <span className="font-mono font-bold" style={{ color: '#FCD34D' }}>
                    {formatCountdown(timeLeft)}
                  </span>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="mb-3 w-full rounded-full py-4 text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                  boxShadow: '0 10px 36px rgba(124,58,237,0.58)',
                }}
              >
                {checkoutLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Abrindo pagamento...
                  </span>
                ) : (
                  'Quero continuar dormindo assim'
                )}
              </button>

              <button
                onClick={onDismiss}
                disabled={checkoutLoading}
                className="w-full py-2 text-[13px] transition-colors disabled:opacity-40"
                style={{ color: 'rgba(255,255,255,0.38)' }}
              >
                Agora não
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
