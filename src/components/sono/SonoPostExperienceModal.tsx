import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import mixpanel from '@/lib/mixpanel';
import {
  trackSonoGuestCheckoutClicked,
  trackSonoGuestOfferDismissed,
  trackSonoGuestOfferViewed,
} from '@/lib/mixpanelSonoGuestEvents';

const PRODUCT_KEY = 'protocolo_sono_7_noites';

export type SonoOfferVariant = 'final' | 'locked_night';
export type SonoMicroAnswer = 'Sim, relaxei' | 'Um pouco' | 'Ainda estou agitado';

interface SonoPostExperienceModalProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  checkoutLoading: boolean;
  variant?: SonoOfferVariant;
  guestId?: string;
  source?: string;
  startWithQuiz?: boolean;
}

const ANSWERS: SonoMicroAnswer[] = ['Sim, relaxei', 'Um pouco', 'Ainda estou agitado'];

const BENEFITS = [
  '7 noites guiadas',
  'Acesso completo',
  'Acesso imediato',
  'Cancele quando quiser',
  '7 dias grátis',
];

const MAIN_OFFER_COPY = {
  eyebrow: 'Noite 1 concluída',
  title: 'Seu corpo acabou de dar o primeiro passo.',
  subtitle:
    'Esta primeira noite foi criada para tirar seu sistema nervoso do modo alerta. Mas o sono profundo raramente muda em uma única tentativa. Ele é treinado por repetição, segurança e continuidade.',
  body: '',
  offerTitle: 'Protocolo Sono Profundo — 7 noites',
  price: '7 dias grátis',
  supportingText: 'Depois R$ 15,90/mês • cancele quando quiser',
  cta: 'Começar 7 dias grátis',
  microcopy: 'Acesso imediato. Você continua exatamente de onde parou.',
};

const NIGHT_BREAKDOWN = [
  { night: 1, title: 'Desligando o estado de alerta', completed: true },
  { night: 2, title: 'Soltando o controle da mente', completed: false },
  { night: 3, title: 'Desligamento profundo do corpo', completed: false },
  { night: 4, title: 'Quebrando o ciclo de pensamentos', completed: false },
  { night: 5, title: 'Entrando em segurança profunda', completed: false },
  { night: 6, title: 'Quando o sono começa sozinho', completed: false },
  { night: 7, title: 'Seu corpo já sabe dormir', completed: false },
];

// Opções preparadas para futuro teste A/B. A versão ativa é MAIN_OFFER_COPY.
const OFFER_COPY_VARIANTS = {
  emotional: {
    title: 'Não pare no primeiro alívio.',
    subtitle:
      'Se seu corpo começou a desacelerar agora, as próximas noites servem para transformar esse alívio em um caminho mais familiar.',
    cta: 'Quero continuar desacelerando',
  },
  mechanism: {
    title: 'O sono aprende por repetição.',
    subtitle:
      'Seu sistema nervoso não muda por força. Ele muda quando recebe sinais de segurança de forma consistente.',
    cta: 'Desbloquear as próximas noites',
  },
  direct: {
    title: 'Continue de onde seu corpo parou.',
    subtitle:
      'A primeira noite iniciou o processo. As próximas aprofundam a resposta de relaxamento até o sono começar a vir com menos esforço.',
    cta: 'Desbloquear protocolo completo',
  },
} as const;

void OFFER_COPY_VARIANTS;

export function SonoPostExperienceModal({
  open,
  onClose,
  onCheckout,
  checkoutLoading,
  variant = 'final',
  guestId = localStorage.getItem('eco_guest_id') || sessionStorage.getItem('eco.sono.guest_id') || 'guest',
  source = 'quiz_sono_guest',
  startWithQuiz = false,
}: SonoPostExperienceModalProps) {
  const [step, setStep] = useState<'quiz' | 'offer'>(startWithQuiz ? 'quiz' : 'offer');
  const [, setAnswer] = useState<SonoMicroAnswer | null>(() => {
    const stored = localStorage.getItem(`eco.sono.guest.micro_answer.${guestId}`);
    return ANSWERS.includes(stored as SonoMicroAnswer) ? (stored as SonoMicroAnswer) : null;
  });

  useEffect(() => {
    if (!open) return;
    setStep(startWithQuiz ? 'quiz' : 'offer');
  }, [open, startWithQuiz]);

  useEffect(() => {
    if (!open) return;
    mixpanel.track('Sleep Offer Viewed', {
      guest_id: guestId,
      source,
      product_key: PRODUCT_KEY,
      context: variant,
    });
    trackSonoGuestOfferViewed({ guestId, source, context: variant });
  }, [guestId, open, source, variant]);

  const offer = useMemo(() => {
    if (variant === 'locked_night') {
      return {
        eyebrow: 'Noites 2 a 7',
        title: 'Continue de onde seu corpo parou.',
        subtitle:
          'A primeira noite iniciou o processo. As próximas aprofundam a resposta de relaxamento até o sono começar a vir com menos esforço.',
        body: MAIN_OFFER_COPY.supportingText,
        cta: 'Desbloquear protocolo completo',
      };
    }
    return MAIN_OFFER_COPY;
  }, [variant]);

  const handleAnswer = (selectedAnswer: SonoMicroAnswer) => {
    setAnswer(selectedAnswer);
    localStorage.setItem(`eco.sono.guest.micro_answer.${guestId}`, selectedAnswer);
    mixpanel.track('Sleep Micro Quiz Answered', {
      guest_id: guestId,
      answer: selectedAnswer,
      source: 'quiz_sono_guest',
      product_key: PRODUCT_KEY,
    });
    setStep('offer');
  };

  const handleCheckout = () => {
    mixpanel.track('Sleep Offer CTA Clicked', {
      guest_id: guestId,
      source,
      product_key: PRODUCT_KEY,
      context: variant,
    });
    trackSonoGuestCheckoutClicked({
      guestId,
      source,
      context: variant,
    });
    onCheckout();
  };

  const handleClose = () => {
    mixpanel.track('Sleep Offer Dismissed', {
      guest_id: guestId,
      source,
      product_key: PRODUCT_KEY,
      context: variant,
    });
    trackSonoGuestOfferDismissed({ guestId, source, context: variant });
    onClose();
  };

  return (
    <AnimatePresence>
      {open &&
        createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center"
            style={{ background: 'rgba(3,6,18,0.72)', backdropFilter: 'blur(12px)' }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 24 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl"
              style={{
                background: 'linear-gradient(160deg, #070B1D 0%, #050817 58%, #101733 100%)',
                border: '1px solid rgba(196,181,253,0.22)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.68), 0 8px 42px rgba(124,58,237,0.18)',
              }}
            >
              <div
                className="pointer-events-none absolute"
                style={{
                  top: '-120px',
                  left: '50%',
                  width: '320px',
                  height: '320px',
                  transform: 'translateX(-50%)',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(124,58,237,0.20) 0%, transparent 68%)',
                }}
              />

              <div className="relative z-10 px-6 pb-6 pt-7 sm:px-7">
                <AnimatePresence mode="wait">
                  {step === 'quiz' ? (
                    <motion.div
                      key="quiz"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.24 }}
                      className="text-center"
                    >
                      <p className="mb-4 text-[12px] font-semibold leading-relaxed" style={{ color: 'rgba(196,181,253,0.72)' }}>
                        Isso é exatamente onde a mudança começa.
                      </p>
                      <h2 className="font-display mb-2 text-[25px] font-bold leading-tight text-white">
                        Seu corpo já começou a mudar.
                      </h2>
                      <p className="mb-6 text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.56)' }}>
                        Perceba por um instante: algo ficou diferente agora?
                      </p>
                      <p className="mb-4 text-[15px] font-semibold text-white">Você sentiu alguma diferença?</p>
                      <div className="flex flex-col gap-3">
                        {ANSWERS.map((item, index) => (
                          <button
                            key={item}
                            onClick={() => handleAnswer(item)}
                            className="w-full rounded-full py-4 text-[15px] font-bold transition-all active:scale-[0.98]"
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
                                    color: 'rgba(255,255,255,0.82)',
                                  }
                            }
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="offer"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.24 }}
                    >
                      <div className="mb-4 flex justify-center">
                        <div
                          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                          style={{
                            background: 'rgba(167,139,250,0.12)',
                            border: '1px solid rgba(167,139,250,0.26)',
                            color: '#C4B5FD',
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#A78BFA' }} />
                          {offer.eyebrow}
                        </div>
                      </div>

                      <h2 className="font-display mb-3 whitespace-pre-line text-center text-[23px] font-bold leading-tight text-white">
                        {offer.title}
                      </h2>
                      <p className="mb-4 text-center text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.56)' }}>
                        {offer.subtitle}
                      </p>
                      {offer.body && (
                        <p className="mb-5 whitespace-pre-line text-center text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.46)' }}>
                          {offer.body}
                        </p>
                      )}

                      <div className="mb-5 space-y-1.5">
                        {NIGHT_BREAKDOWN.map(({ night, title, completed }) => (
                          <div
                            key={night}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl"
                            style={{
                              background: completed ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${completed ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.07)'}`,
                            }}
                          >
                            <span className="text-[13px] select-none flex-shrink-0">
                              {completed ? '✅' : '🔒'}
                            </span>
                            <span
                              className="text-[12px] font-medium"
                              style={{ color: completed ? 'rgba(52,211,153,0.85)' : 'rgba(255,255,255,0.45)' }}
                            >
                              Noite {night} — {title}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div
                        className="mb-5 rounded-2xl px-5 py-4"
                        style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(196,181,253,0.16)' }}
                      >
                        <p className="mb-3 text-center text-[14px] font-semibold text-white">
                          {variant === 'final' ? MAIN_OFFER_COPY.offerTitle : 'Desbloqueie o protocolo completo'}
                        </p>
                        <p className="mb-3 text-center font-display text-[34px] font-bold leading-none text-white">
                          {MAIN_OFFER_COPY.price}
                        </p>
                        <p className="mb-4 text-center text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.44)' }}>
                          {MAIN_OFFER_COPY.supportingText}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {BENEFITS.map(item => (
                            <div key={item} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.58)' }}>
                              <Check className="h-3 w-3" style={{ color: '#C4B5FD' }} />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                        className="mb-3 w-full rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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
                          offer.cta
                        )}
                      </button>

                      <p className="mb-1 text-center text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.34)' }}>
                        {MAIN_OFFER_COPY.microcopy}
                      </p>
                      <p className="mb-2 text-center text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.30)' }}>
                        Garantia tranquila de 7 dias. Se não fizer sentido para você, devolvemos o valor.
                      </p>

                      <button
                        onClick={handleClose}
                        disabled={checkoutLoading}
                        className="w-full py-2 text-[13px] transition-colors disabled:opacity-40"
                        style={{ color: 'rgba(255,255,255,0.34)' }}
                      >
                        Agora não
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
    </AnimatePresence>
  );
}
