import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import mixpanel from '@/lib/mixpanel';
import { useEcoDream } from '@/hooks/useEcoDream';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/hooks/useGuest';

// Posições determinísticas das estrelas (razão áurea) — céu estável entre renders.
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: ((i * 127.1 + 23.5) % 100).toFixed(2),
  y: ((i * 83.7 + 11.3) % 100).toFixed(2),
  r: (0.7 + ((i * 0.43) % 1.8)).toFixed(1),
  dur: (2.5 + ((i * 0.31) % 4.5)).toFixed(1),
  del: ((i * 0.19) % 8).toFixed(1),
}));

const CAPTURE_DELAY_MS = 1800; // beat após a interpretação antes de subir a captura

const DREAM_STYLES = `
  @keyframes ecoGuestTwinkle {
    0%, 100% { opacity: 0.1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.7); }
  }
  @keyframes ecoGuestCursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  .eco-guest-textarea::placeholder { color: rgba(237,229,208,0.22); }
  .eco-guest-textarea { caret-color: #C9A55A; }
  .eco-guest-prose h1, .eco-guest-prose h2 { font-size: 18px; font-weight: 600; color: #EDE5D0; margin-top: 1.5em; margin-bottom: 0.5em; }
  .eco-guest-prose h3, .eco-guest-prose h4 { font-size: 15px; font-weight: 500; color: rgba(201,165,90,0.85); margin-top: 1.2em; margin-bottom: 0.3em; letter-spacing: 0.02em; }
  .eco-guest-prose p { margin-bottom: 1em; color: rgba(237,229,208,0.82); }
  .eco-guest-prose hr { border-color: rgba(255,255,255,0.07); margin: 1.2em 0; }
  .eco-guest-prose blockquote { border-left: 2px solid rgba(201,165,90,0.45); padding-left: 1em; color: rgba(237,229,208,0.6); font-style: italic; margin: 1em 0; }
  .eco-guest-prose strong { color: rgba(237,229,208,0.95); font-weight: 600; }
  .eco-guest-prose em { color: rgba(201,165,90,0.8); font-style: italic; }
  @media (prefers-reduced-motion: reduce) {
    .eco-guest-star, .eco-guest-moon { animation: none !important; }
  }
`;

function MoonOrb() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="relative">
        <motion.div
          className="absolute rounded-full"
          style={{ inset: '-24px', background: 'radial-gradient(circle, rgba(201,165,90,0.12) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          animate={{ rotate: [0, 4, -4, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden>
            <defs>
              <radialGradient id="ecoGuestMoon" cx="38%" cy="30%" r="68%">
                <stop offset="0%" stopColor="#F5E09A" />
                <stop offset="45%" stopColor="#C9A55A" />
                <stop offset="100%" stopColor="#7A5520" />
              </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="26" fill="url(#ecoGuestMoon)" />
            <circle cx="25" cy="23" r="4" fill="rgba(0,0,0,0.13)" />
            <circle cx="38" cy="38" r="2.5" fill="rgba(0,0,0,0.1)" />
            <circle cx="22" cy="38" r="1.8" fill="rgba(0,0,0,0.08)" />
          </svg>
        </motion.div>
      </div>
      <p
        className="text-[12px] tracking-[0.22em] uppercase"
        style={{ color: 'rgba(201,165,90,0.5)', fontFamily: "'Cormorant Garamond','Playfair Display',Georgia,serif" }}
      >
        decifrando seu sonho
      </p>
    </div>
  );
}

const SERIF = "'Cormorant Garamond','Playfair Display',Georgia,serif";

export default function EcoDreamGuestPage() {
  const navigate = useNavigate();
  const { guestUser } = useGuest();
  const { register } = useAuth();
  const {
    dreamText,
    setDreamText,
    interpretation,
    status,
    errorMsg,
    interpretar,
  } = useEcoDream();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const interpretationRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const captureTrackedRef = useRef(false);

  const [focused, setFocused] = useState(false);
  const [showCapture, setShowCapture] = useState(false);

  // Form de captura
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isStreaming = status === 'loading';
  const isDone = status === 'done';
  const isError = status === 'error';
  const hasInterpretation = interpretation.trim().length > 0;
  const canInterpret = dreamText.trim().length >= 10;

  // Fonte onírica + page view
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap';
    document.head.appendChild(link);

    mixpanel.track('Dream Guest Viewed', {
      guestId: guestUser?.id ?? null,
      timestamp: new Date().toISOString(),
    });

    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [guestUser?.id]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [dreamText]);

  // Rola até o resultado quando começa o streaming
  useEffect(() => {
    if (status === 'loading' && interpretationRef.current) {
      interpretationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status]);

  // Quando a interpretação termina, sobe a captura após um beat (mecânica A: soft gate)
  useEffect(() => {
    if (isDone && hasInterpretation && !showCapture) {
      const t = window.setTimeout(() => setShowCapture(true), CAPTURE_DELAY_MS);
      return () => window.clearTimeout(t);
    }
  }, [isDone, hasInterpretation, showCapture]);

  // Tracking + scroll quando a captura aparece
  useEffect(() => {
    if (showCapture && !captureTrackedRef.current) {
      captureTrackedRef.current = true;
      mixpanel.track('Dream Capture Shown', {
        guestId: guestUser?.id ?? null,
        timestamp: new Date().toISOString(),
      });
      captureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showCapture, guestUser?.id]);

  const handleInterpret = () => {
    mixpanel.track('Dream Submitted', {
      guestId: guestUser?.id ?? null,
      length: dreamText.trim().length,
      timestamp: new Date().toISOString(),
    });
    interpretar();
  };

  useEffect(() => {
    if (isDone && hasInterpretation) {
      mixpanel.track('Dream Interpreted', {
        guestId: guestUser?.id ?? null,
        timestamp: new Date().toISOString(),
      });
    }
    // dispara uma vez por interpretação concluída
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (password.length < 6) {
      setFormError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setIsSubmitting(true);
    mixpanel.track('Dream Signup Started', {
      guestId: guestUser?.id ?? null,
      from: 'sonhos_guest',
      timestamp: new Date().toISOString(),
    });
    try {
      const nome = email.split('@')[0];
      const { needsConfirmation } = await register(email.trim(), password, nome, '');
      mixpanel.track('Dream Signup Completed', {
        guestId: guestUser?.id ?? null,
        needs_confirmation: needsConfirmation,
        from: 'sonhos_guest',
        timestamp: new Date().toISOString(),
      });
      if (needsConfirmation) {
        setConfirmed(true);
      } else {
        navigate('/app/dream');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = () => {
    mixpanel.track('Dream Signup Google Clicked', {
      guestId: guestUser?.id ?? null,
      timestamp: new Date().toISOString(),
    });
    navigate('/register?plan=annual&from=sonhos_guest&returnTo=' + encodeURIComponent('/app/dream'));
  };

  return (
    <>
      <style>{DREAM_STYLES}</style>

      <div
        className="relative flex min-h-[100dvh] flex-col pb-20"
        style={{ background: 'linear-gradient(155deg, #070917 0%, #0C1228 50%, #08091C 100%)', color: '#EDE5D0' }}
      >
        {/* Nebulosa */}
        <div
          className="pointer-events-none fixed inset-0"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 65% 45% at 18% 8%, rgba(100,140,220,0.07) 0%, transparent 60%),
              radial-gradient(ellipse 50% 55% at 82% 88%, rgba(201,165,90,0.05) 0%, transparent 55%),
              radial-gradient(ellipse 40% 35% at 55% 45%, rgba(85,55,155,0.04) 0%, transparent 65%)`,
          }}
        />
        {/* Estrelas */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          {STARS.map((star) => (
            <span
              key={star.id}
              className="eco-guest-star absolute rounded-full bg-white"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.r}px`,
                height: `${star.r}px`,
                animation: `ecoGuestTwinkle ${star.dur}s ${star.del}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-12">
          {/* ─── Entrada ─── */}
          <AnimatePresence mode="wait">
            {!hasInterpretation && !isStreaming ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <p className="mb-3 text-[11px] uppercase tracking-[0.24em]" style={{ color: 'rgba(201,165,90,0.6)' }}>
                    Ecodream · Interpretação de sonhos
                  </p>
                  <h1 className="font-light leading-tight" style={{ fontFamily: SERIF, fontSize: 'clamp(30px, 8vw, 40px)', color: '#EDE5D0', letterSpacing: '-0.01em' }}>
                    O que você{' '}
                    <em style={{ color: 'rgba(201,165,90,0.9)', fontStyle: 'italic' }}>sonhou?</em>
                  </h1>
                  <p className="mt-2.5 text-[13px] leading-relaxed" style={{ color: 'rgba(237,229,208,0.42)' }}>
                    Descreva com detalhes. A Eco interpreta pelo olhar de Freud e Jung — em segundos, de graça.
                  </p>
                </div>

                <div
                  className="overflow-hidden rounded-2xl transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: focused ? '1px solid rgba(201,165,90,0.35)' : '1px solid rgba(255,255,255,0.09)',
                    boxShadow: focused
                      ? '0 0 0 3px rgba(201,165,90,0.08), 0 8px 32px rgba(0,0,0,0.4)'
                      : '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    className="eco-guest-textarea min-h-[150px] w-full resize-none bg-transparent px-5 py-5 leading-relaxed outline-none"
                    style={{ color: '#EDE5D0', fontFamily: SERIF, fontSize: '16px', lineHeight: '1.75' }}
                    value={dreamText}
                    onChange={(e) => setDreamText(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Descreva seu sonho... (ex: Estava sendo perseguido e não conseguia correr)"
                    maxLength={2000}
                  />
                  <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-[11px]" style={{ color: 'rgba(237,229,208,0.22)' }}>{dreamText.length}/2000</span>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleInterpret}
                      disabled={!canInterpret}
                      className="flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-300"
                      style={{
                        background: canInterpret ? 'linear-gradient(135deg, #C9A55A 0%, #A07530 100%)' : 'rgba(255,255,255,0.05)',
                        color: canInterpret ? '#07091A' : 'rgba(237,229,208,0.25)',
                        cursor: canInterpret ? 'pointer' : 'not-allowed',
                        boxShadow: canInterpret ? '0 2px 12px rgba(201,165,90,0.3)' : 'none',
                      }}
                    >
                      Interpretar →
                    </motion.button>
                  </div>
                </div>
                <p className="text-center text-[11px]" style={{ color: 'rgba(237,229,208,0.25)' }}>
                  Sem cadastro para começar · sua primeira interpretação é gratuita
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* ─── Resultado ─── */}
          <AnimatePresence>
            {(hasInterpretation || isStreaming) && (
              <motion.div
                key="result"
                ref={interpretationRef}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-4"
              >
                <div className="rounded-2xl px-5 py-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'rgba(201,165,90,0.5)' }}>Seu sonho</p>
                  <p className="italic leading-relaxed" style={{ color: 'rgba(237,229,208,0.6)', fontFamily: SERIF, fontSize: '15px', lineHeight: '1.7' }}>
                    "{dreamText}"
                  </p>
                </div>

                {isStreaming && !hasInterpretation && <MoonOrb />}

                {hasInterpretation && (
                  <div
                    className="relative overflow-hidden rounded-2xl px-6 py-6"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 12px 40px rgba(0,0,0,0.45)' }}
                  >
                    <div className="absolute left-8 right-8 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,165,90,0.45), transparent)' }} />
                    <div className="eco-guest-prose" style={{ fontFamily: SERIF, fontSize: '16px', lineHeight: '1.9', color: 'rgba(237,229,208,0.88)' }}>
                      <ReactMarkdown>{interpretation}</ReactMarkdown>
                      {isStreaming && (
                        <span className="ml-0.5 inline-block w-0.5 align-text-bottom" style={{ height: '1em', background: '#C9A55A', animation: 'ecoGuestCursor 0.9s ease-in-out infinite' }} />
                      )}
                    </div>
                  </div>
                )}

                {isError && errorMsg && (
                  <p className="rounded-xl px-4 py-3 text-[13px]" style={{ background: 'rgba(220,60,60,0.1)', border: '1px solid rgba(220,60,60,0.18)', color: 'rgba(255,130,130,0.85)' }}>
                    {errorMsg}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Captura (mecânica A: aparece após a interpretação completa) ─── */}
          <AnimatePresence>
            {showCapture && (
              <motion.div
                key="capture"
                ref={captureRef}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mt-5 rounded-2xl px-6 py-7"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,165,90,0.22)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}
              >
                {confirmed ? (
                  <div className="py-2 text-center">
                    <p className="text-base font-semibold" style={{ color: '#EDE5D0' }}>Confirme seu e-mail</p>
                    <p className="mt-2 text-sm" style={{ color: 'rgba(237,229,208,0.55)' }}>
                      Enviamos um link para <span style={{ color: '#C9A55A' }}>{email}</span>. Clique nele para ativar sua conta e guardar este sonho.
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="leading-snug" style={{ fontFamily: SERIF, fontSize: '24px', fontWeight: 500, color: '#EDE5D0' }}>
                      Esse sonho diz mais sobre você.
                    </h2>
                    <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'rgba(237,229,208,0.6)' }}>
                      Crie sua conta gratuita e leve a Eco com você:
                    </p>

                    <ul className="mt-4 space-y-2.5">
                      {[
                        'Salve este sonho e acompanhe os padrões ao longo do tempo',
                        'Continue a conversa com a Eco sobre ele',
                        'Acesso completo: meditações, sono, diário estoico + Eco ilimitada',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: 'rgba(201,165,90,0.7)' }} />
                          <span className="text-[14px]" style={{ color: 'rgba(237,229,208,0.78)' }}>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <form onSubmit={handleSignup} noValidate className="mt-6 space-y-3">
                      <input
                        type="email"
                        required
                        placeholder="Seu e-mail"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setFormError(''); }}
                        className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#EDE5D0' }}
                      />
                      <input
                        type="password"
                        required
                        placeholder="Crie uma senha (mín. 6 caracteres)"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setFormError(''); }}
                        className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#EDE5D0' }}
                      />
                      {formError && <p className="text-xs" style={{ color: 'rgba(255,130,130,0.85)' }}>{formError}</p>}
                      <button
                        type="submit"
                        disabled={isSubmitting || !email || !password}
                        className="w-full rounded-full py-[14px] text-[15px] font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #C9A55A 0%, #A07530 100%)', color: '#07091A', boxShadow: '0 10px 30px rgba(201,165,90,0.28)' }}
                      >
                        {isSubmitting ? 'Criando conta…' : 'Criar conta e salvar este sonho'}
                      </button>
                    </form>

                    <button
                      onClick={handleGoogle}
                      className="mt-3 w-full rounded-full border py-[11px] text-[13px] font-medium transition-all hover:brightness-110 active:scale-[0.98]"
                      style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(237,229,208,0.7)' }}
                    >
                      Criar conta com Google →
                    </button>

                    <p className="mt-3 text-center text-[11px]" style={{ color: 'rgba(237,229,208,0.3)' }}>
                      7 dias gratuitos · cancele em 1 clique · leva menos de 30 segundos
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
