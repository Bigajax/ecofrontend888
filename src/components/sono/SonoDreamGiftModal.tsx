import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useEcoDream } from '@/hooks/useEcoDream';
import {
  trackSonoGuestDreamGiftSubmitted,
  trackSonoGuestDreamGiftCompleted,
} from '@/lib/mixpanelSonoGuestEvents';

/**
 * Presente da Noite 1: UMA interpretação de sonho da Eco, grátis, dentro do
 * funil do sono (tela de continuidade). Reciprocidade — o presente chega ANTES
 * da oferta — e degustação do bônus EcoDream vendido no card R$37.
 *
 * Motor reaproveitado: useEcoDream (POST /api/dream/interpret com
 * X-Eco-Guest-Id, streaming SSE) — o mesmo da /sonhos e do /app/dream.
 * Limite de 1 por navegador via localStorage (eco.sono.dream_gift.v1);
 * reabrir mostra a leitura salva. Quota real por guest_id fica pro backend.
 *
 * Identidade visual do EcoDream (lua dourada + Cormorant), como no
 * SonoEcoDreamBonusModal — deixa claro que é OUTRO produto, de presente.
 */
interface SonoDreamGiftModalProps {
  open: boolean;
  onClose: () => void;
}

const SERIF = "'Cormorant Garamond', Georgia, serif";
const GIFT_LS_KEY = 'eco.sono.dream_gift.v1';

export interface DreamGiftRecord {
  dream: string;
  interpretation: string;
  at: string;
}

/** Leitura salva do presente (null = ainda não usado). */
export function readDreamGift(): DreamGiftRecord | null {
  try {
    const raw = localStorage.getItem(GIFT_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DreamGiftRecord;
    return parsed && typeof parsed.interpretation === 'string' && parsed.interpretation
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function saveDreamGift(record: DreamGiftRecord): void {
  try {
    localStorage.setItem(GIFT_LS_KEY, JSON.stringify(record));
  } catch {
    // storage indisponível — o presente segue funcionando, só não persiste
  }
}

/** Logo do EcoDream (mascote) — tile branco estilo ícone de app, moldura dourada. */
function EcoDreamLogo({ size = 48 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center overflow-hidden rounded-2xl"
      style={{
        width: size,
        height: size,
        background: '#FFFFFF',
        border: '1px solid rgba(238,192,121,0.4)',
        boxShadow: '0 6px 22px rgba(238,192,121,0.18)',
      }}
    >
      <img src="/images/eco-dream-icon.webp" alt="" className="h-full w-full object-cover" />
    </span>
  );
}

export function SonoDreamGiftModal({ open, onClose }: SonoDreamGiftModalProps) {
  const reduceMotion = useReducedMotion();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const submittedRef = useRef(false);
  const completedRef = useRef(false);

  const { dreamText, setDreamText, interpretation, status, errorMsg, interpretar } =
    useEcoDream();

  const saved = readDreamGift();
  // Presente já usado E sem interpretação nova em andamento → modo releitura.
  const rereading = !!saved && status === 'idle' && !interpretation;

  const canInterpret = dreamText.trim().length >= 10 && status !== 'loading';

  // Cormorant sob demanda (mesmo padrão do SonoEcoDreamBonusModal).
  useEffect(() => {
    if (!open) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&display=swap';
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [open]);

  // Esc fecha; foco no fechar (a11y).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Consumo do presente: só no done (erro não gasta). Salva a leitura pra
  // releitura e fecha o funil do presente no Mixpanel.
  useEffect(() => {
    if (status !== 'done' || !interpretation || completedRef.current) return;
    completedRef.current = true;
    saveDreamGift({ dream: dreamText.trim(), interpretation, at: new Date().toISOString() });
    trackSonoGuestDreamGiftCompleted();
  }, [status, interpretation, dreamText]);

  const handleInterpret = () => {
    if (!canInterpret) return;
    if (!submittedRef.current) {
      submittedRef.current = true;
      trackSonoGuestDreamGiftSubmitted();
    }
    void interpretar();
  };

  // O que mostrar como leitura: a nova (streaming/done) ou a salva (releitura).
  const readingText = interpretation || saved?.interpretation || '';
  const showReading = readingText.length > 0;
  const showInput = !showReading && !rereading;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-5 py-8"
          style={{ background: 'rgba(5,3,14,0.88)', backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)' }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sono-dream-gift-title"
        >
          {/* Clarão de lua dourado atrás do painel */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[24%] -translate-x-1/2"
            style={{
              width: '260px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(238,192,121,0.22) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />

          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 14 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-full w-full max-w-[420px] flex-col overflow-y-auto rounded-3xl p-6"
            style={{
              background: 'linear-gradient(180deg, #100B22 0%, #0A0718 100%)',
              border: '1px solid rgba(238,192,121,0.22)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(238,192,121,0.08)',
            }}
          >
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <X className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.45)' }} />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <EcoDreamLogo />
              <p
                className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.2em]"
                style={{ color: '#EEC079' }}
              >
                Presente da Noite 1
              </p>
              <h2
                id="sono-dream-gift-title"
                className="mt-1.5 text-[24px] font-semibold leading-snug text-white"
                style={{ fontFamily: SERIF }}
              >
                {rereading || showReading ? 'A leitura do seu sonho' : 'Um presente pela sua primeira noite'}
              </h2>
              {showInput && (
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'rgba(232,226,255,0.65)' }}>
                  Conte um sonho — a Eco lê os símbolos pelo olhar de Freud e Jung.
                </p>
              )}
            </div>

            {/* Entrada do sonho (presente ainda não usado) */}
            {showInput && (
              <div className="mt-5 flex flex-col gap-3">
                <textarea
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  rows={4}
                  placeholder="Eu estava em uma casa que não conhecia, e…"
                  className="w-full resize-none rounded-2xl px-4 py-3.5 text-[14px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(238,192,121,0.18)' }}
                />
                {status === 'error' && (
                  <p role="alert" className="text-[12.5px]" style={{ color: '#F8B4B4' }}>
                    {errorMsg || 'Não consegui interpretar agora. Tente de novo.'}
                  </p>
                )}
                <button
                  onClick={handleInterpret}
                  disabled={!canInterpret}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-45"
                  style={{
                    background: 'linear-gradient(135deg, #EEC079 0%, #B8863B 100%)',
                    color: '#1A1206',
                    boxShadow: '0 8px 28px rgba(238,192,121,0.25)',
                  }}
                >
                  {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status === 'loading' ? 'A Eco está lendo seu sonho…' : 'Interpretar meu sonho'}
                </button>
                <p className="text-center text-[11px]" style={{ color: 'rgba(232,226,255,0.4)' }}>
                  Vale uma interpretação — por nossa conta.
                </p>
              </div>
            )}

            {/* Leitura (streaming, concluída ou salva) */}
            {showReading && (
              <div className="mt-5">
                <div
                  className="rounded-2xl px-4 py-4 text-left text-[14px] leading-relaxed"
                  style={{
                    background: 'rgba(238,192,121,0.06)',
                    border: '1px solid rgba(238,192,121,0.16)',
                    color: 'rgba(240,232,255,0.88)',
                    fontFamily: SERIF,
                    fontSize: '15.5px',
                  }}
                >
                  <ReactMarkdown>{readingText}</ReactMarkdown>
                  {status === 'loading' && (
                    <Loader2 className="mt-2 h-4 w-4 animate-spin" style={{ color: '#EEC079' }} />
                  )}
                </div>

                {status !== 'loading' && (
                  <>
                    {/* Ponte pro funil: o presente é a degustação do bônus. */}
                    <p className="mt-4 text-center text-[12.5px] leading-relaxed" style={{ color: 'rgba(232,226,255,0.6)' }}>
                      O EcoDream completo vem junto com as 7 noites.
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-3 w-full rounded-full py-3 text-[14px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
                    >
                      Fechar
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
