import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useEcoDream } from '@/hooks/useEcoDream';
import type { DreamRow } from '@/api/dreamApi';
import HomeHeader from '@/components/home/HomeHeader';
import BottomNav from '@/components/BottomNav';

// Deterministic star positions via golden-ratio distribution
const STARS = Array.from({ length: 65 }, (_, i) => ({
  id: i,
  x: ((i * 127.1 + 23.5) % 100).toFixed(2),
  y: ((i * 83.7 + 11.3) % 100).toFixed(2),
  r: (0.7 + ((i * 0.43) % 1.8)).toFixed(1),
  dur: (2.5 + ((i * 0.31) % 4.5)).toFixed(1),
  del: ((i * 0.19) % 8).toFixed(1),
}));

const DREAM_STYLES = `
  @keyframes dreamTwinkle {
    0%, 100% { opacity: 0.1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.7); }
  }
  @keyframes dreamCursor {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .dream-textarea::placeholder { color: rgba(237,229,208,0.2); }
  .dream-textarea { caret-color: #C9A55A; }
  .dream-prose h1,
  .dream-prose h2 { font-size: 18px; font-weight: 600; color: #EDE5D0; margin-top: 1.5em; margin-bottom: 0.5em; }
  .dream-prose h3,
  .dream-prose h4 { font-size: 15px; font-weight: 500; color: rgba(201,165,90,0.85); margin-top: 1.2em; margin-bottom: 0.3em; letter-spacing: 0.02em; }
  .dream-prose p { margin-bottom: 1em; color: rgba(237,229,208,0.82); }
  .dream-prose hr { border-color: rgba(255,255,255,0.07); margin: 1.2em 0; }
  .dream-prose blockquote {
    border-left: 2px solid rgba(201,165,90,0.45);
    padding-left: 1em;
    color: rgba(237,229,208,0.6);
    font-style: italic;
    margin: 1em 0;
  }
  .dream-prose strong { color: rgba(237,229,208,0.95); font-weight: 600; }
  .dream-prose em { color: rgba(201,165,90,0.8); font-style: italic; }
`;

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function DreamHistoryItem({ dream }: { dream: DreamRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] mb-1 tracking-wide"
            style={{ color: 'rgba(201,165,90,0.55)' }}
          >
            {formatDate(dream.created_at)}
          </p>
          <p
            className="text-[14px] leading-snug line-clamp-2"
            style={{ color: 'rgba(237,229,208,0.7)' }}
          >
            {dream.dream_text}
          </p>
        </div>
        <span className="mt-0.5 shrink-0" style={{ color: 'rgba(201,165,90,0.4)' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      <AnimatePresence>
        {expanded && dream.interpretation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              className="dream-prose px-4 pb-4 pt-3"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                fontSize: '14px',
                lineHeight: '1.8',
                color: 'rgba(237,229,208,0.78)',
              }}
            >
              <ReactMarkdown>{dream.interpretation}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MoonOrb() {
  return (
    <div className="flex flex-col items-center py-10 gap-5">
      <div className="relative">
        {/* Outer ambient glow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: '-28px',
            background: 'radial-gradient(circle, rgba(201,165,90,0.1) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Inner glow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: '-12px',
            background: 'radial-gradient(circle, rgba(201,165,90,0.18) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />
        {/* Moon */}
        <motion.div
          animate={{ rotate: [0, 4, -4, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
            <defs>
              <radialGradient id="moonGrad" cx="38%" cy="30%" r="68%">
                <stop offset="0%" stopColor="#F5E09A" />
                <stop offset="45%" stopColor="#C9A55A" />
                <stop offset="100%" stopColor="#7A5520" />
              </radialGradient>
              <filter id="moonGlow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="32" cy="32" r="26" fill="url(#moonGrad)" filter="url(#moonGlow)" />
            <circle cx="25" cy="23" r="4" fill="rgba(0,0,0,0.13)" />
            <circle cx="38" cy="38" r="2.5" fill="rgba(0,0,0,0.1)" />
            <circle cx="22" cy="38" r="1.8" fill="rgba(0,0,0,0.08)" />
            <circle cx="40" cy="22" r="1.2" fill="rgba(0,0,0,0.07)" />
          </svg>
        </motion.div>
      </div>

      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block rounded-full"
            style={{ width: 5, height: 5, background: 'rgba(201,165,90,0.55)' }}
            animate={{ scale: [0.4, 1, 0.4], opacity: [0.25, 0.9, 0.25] }}
            transition={{ duration: 1.6, delay: i * 0.28, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <p
        className="text-[12px] tracking-[0.22em] uppercase"
        style={{
          color: 'rgba(201,165,90,0.5)',
          fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
        }}
      >
        decifrando seu sonho
      </p>
    </div>
  );
}

export default function EcoDreamPage() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const interpretationRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  const {
    dreamText,
    setDreamText,
    interpretation,
    status,
    errorMsg,
    interpretar,
    cancelar,
    history,
  } = useEcoDream();

  // Load Cormorant Garamond for this page only
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap';
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [dreamText]);

  // Scroll to result when streaming starts
  useEffect(() => {
    if (status === 'loading' && interpretationRef.current) {
      interpretationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status]);

  const isStreaming = status === 'loading';
  const isDone = status === 'done';
  const isError = status === 'error';
  const hasInterpretation = interpretation.trim().length > 0;
  const canInterpret = dreamText.trim().length >= 10;

  const handleReset = () => {
    cancelar();
    setDreamText('');
  };

  return (
    <>
      <style>{DREAM_STYLES}</style>

      {/* Standard app navigation */}
      <HomeHeader />

      <div
        className="relative flex min-h-[100dvh] flex-col pb-28"
        style={{
          background: 'linear-gradient(155deg, #070917 0%, #0C1228 50%, #08091C 100%)',
          color: '#EDE5D0',
        }}
      >
        {/* Nebula atmosphere */}
        <div
          className="pointer-events-none fixed inset-0"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 65% 45% at 18% 8%, rgba(100,140,220,0.07) 0%, transparent 60%),
              radial-gradient(ellipse 50% 55% at 82% 88%, rgba(201,165,90,0.05) 0%, transparent 55%),
              radial-gradient(ellipse 40% 35% at 55% 45%, rgba(85,55,155,0.04) 0%, transparent 65%)
            `,
          }}
        />

        {/* Star field */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          {STARS.map((star) => (
            <span
              key={star.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.r}px`,
                height: `${star.r}px`,
                animation: `dreamTwinkle ${star.dur}s ${star.del}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        {/* Page content */}
        <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-8">

          {/* Input section */}
          <AnimatePresence mode="wait">
            {!hasInterpretation && !isStreaming ? (
              <motion.div
                key="input-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Heading */}
                <div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.08 }}
                    className="text-[11px] tracking-[0.24em] uppercase mb-3"
                    style={{ color: 'rgba(201,165,90,0.6)' }}
                  >
                    Portal dos Sonhos
                  </motion.p>
                  <motion.h2
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 }}
                    className="font-light leading-tight"
                    style={{
                      fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                      fontSize: 'clamp(28px, 8vw, 36px)',
                      color: '#EDE5D0',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    O que você<br />
                    <em style={{ color: 'rgba(201,165,90,0.9)', fontStyle: 'italic' }}>sonhou?</em>
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2.5 text-[13px] leading-relaxed"
                    style={{ color: 'rgba(237,229,208,0.4)' }}
                  >
                    Descreva com detalhes. Eco interpreta pelo olhar de Freud e Jung.
                  </motion.p>
                </div>

                {/* Textarea */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 }}
                  className="rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: focused
                      ? '1px solid rgba(201,165,90,0.35)'
                      : '1px solid rgba(255,255,255,0.09)',
                    boxShadow: focused
                      ? '0 0 0 3px rgba(201,165,90,0.08), 0 8px 32px rgba(0,0,0,0.4)'
                      : '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    className="dream-textarea w-full resize-none bg-transparent px-5 py-5 outline-none min-h-[160px] leading-relaxed"
                    style={{
                      color: '#EDE5D0',
                      fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                      fontSize: '16px',
                      lineHeight: '1.75',
                    }}
                    value={dreamText}
                    onChange={(e) => setDreamText(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Descreva seu sonho... (ex: Estava sendo perseguido e não conseguia correr)"
                    maxLength={2000}
                    disabled={isStreaming}
                  />
                  <div
                    className="flex items-center justify-between px-5 py-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span className="text-[11px]" style={{ color: 'rgba(237,229,208,0.22)' }}>
                      {dreamText.length}/2000
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={interpretar}
                      disabled={!canInterpret}
                      className="flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-300"
                      style={{
                        background: canInterpret
                          ? 'linear-gradient(135deg, #C9A55A 0%, #A07530 100%)'
                          : 'rgba(255,255,255,0.05)',
                        color: canInterpret ? '#07091A' : 'rgba(237,229,208,0.25)',
                        cursor: canInterpret ? 'pointer' : 'not-allowed',
                        letterSpacing: '0.025em',
                        boxShadow: canInterpret ? '0 2px 12px rgba(201,165,90,0.3)' : 'none',
                      }}
                    >
                      Interpretar →
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Streaming / Interpretation area */}
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
                {/* Dream echo */}
                <div
                  className="rounded-2xl px-5 py-4"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <p
                    className="text-[11px] tracking-[0.22em] uppercase mb-2"
                    style={{ color: 'rgba(201,165,90,0.5)' }}
                  >
                    Seu sonho
                  </p>
                  <p
                    className="leading-relaxed italic"
                    style={{
                      color: 'rgba(237,229,208,0.6)',
                      fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                      fontSize: '15px',
                      lineHeight: '1.7',
                    }}
                  >
                    "{dreamText}"
                  </p>
                </div>

                {/* Moon animation while waiting for first chunk */}
                {isStreaming && !hasInterpretation && <MoonOrb />}

                {/* Interpretation text */}
                {hasInterpretation && (
                  <div
                    className="relative rounded-2xl px-6 py-6 overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.09)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
                    }}
                  >
                    {/* Gold shimmer line at top */}
                    <div
                      className="absolute top-0 left-8 right-8 h-px"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, rgba(201,165,90,0.45), transparent)',
                      }}
                    />

                    <div
                      className="dream-prose"
                      style={{
                        fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                        fontSize: '16px',
                        lineHeight: '1.9',
                        color: 'rgba(237,229,208,0.88)',
                      }}
                    >
                      <ReactMarkdown>{interpretation}</ReactMarkdown>
                      {isStreaming && (
                        <span
                          className="inline-block w-0.5 align-text-bottom ml-0.5"
                          style={{
                            height: '1em',
                            background: '#C9A55A',
                            animation: 'dreamCursor 0.9s ease-in-out infinite',
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Post-interpretation actions */}
                {(isDone || isError) && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                    className="flex items-center gap-3 pt-1"
                  >
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleReset}
                      className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] transition"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(237,229,208,0.65)',
                      }}
                    >
                      <RotateCcw size={13} strokeWidth={2} />
                      Novo sonho
                    </motion.button>
                  </motion.div>
                )}

                {/* Error state */}
                {isError && errorMsg && (
                  <p
                    className="rounded-xl px-4 py-3 text-[13px]"
                    style={{
                      background: 'rgba(220,60,60,0.1)',
                      border: '1px solid rgba(220,60,60,0.18)',
                      color: 'rgba(255,130,130,0.85)',
                    }}
                  >
                    {errorMsg}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dream history */}
          {history.length > 0 && !isStreaming && !hasInterpretation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-12 space-y-3"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex-1 h-px"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
                <p
                  className="text-[11px] tracking-[0.2em] uppercase shrink-0"
                  style={{ color: 'rgba(237,229,208,0.28)' }}
                >
                  Sonhos anteriores
                </p>
                <div
                  className="flex-1 h-px"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
              </div>
              <div className="space-y-2">
                {history.map((dream) => (
                  <DreamHistoryItem key={dream.id} dream={dream} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </>
  );
}
