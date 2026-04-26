import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Moon, ChevronLeft, Loader2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useEcoDream } from '@/hooks/useEcoDream';
import type { DreamRow } from '@/api/dreamApi';

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
    <div className="rounded-xl border border-[#E8E3DD]/60 bg-white/60 p-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[#38322A]/50 mb-1">{formatDate(dream.created_at)}</p>
          <p className="text-[15px] text-[#38322A] line-clamp-2 leading-snug">{dream.dream_text}</p>
        </div>
        {expanded ? (
          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-[#A7846C]" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[#A7846C]" />
        )}
      </button>

      <AnimatePresence>
        {expanded && dream.interpretation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-[#E8E3DD]/60 pt-4 prose prose-sm prose-stone max-w-none text-[14px] leading-relaxed text-[#38322A]/80">
              <ReactMarkdown>{dream.interpretation}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EcoDreamPage() {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const interpretationRef = useRef<HTMLDivElement>(null);

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

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [dreamText]);

  // Scroll interpretation into view when streaming starts
  useEffect(() => {
    if (status === 'loading' && interpretationRef.current) {
      interpretationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status]);

  const isStreaming = status === 'loading';
  const isDone = status === 'done';
  const isError = status === 'error';
  const hasInterpretation = interpretation.trim().length > 0;

  const handleReset = () => {
    cancelar();
    setDreamText('');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FAF9F7] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#E8E3DD]/60 bg-[#FAF9F7]/95 px-4 py-4 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E3DD] bg-white text-[#38322A] transition hover:-translate-y-[1px]"
          aria-label="Voltar"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-[#A7846C]" strokeWidth={1.5} />
          <h1 className="text-[17px] font-semibold text-[#38322A] tracking-tight">Eco Dream</h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pt-6">
        {/* Input area */}
        <AnimatePresence mode="wait">
          {!hasInterpretation && !isStreaming ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div>
                <p className="text-[13px] font-medium uppercase tracking-widest text-[#A7846C] mb-2">
                  Interpretação de Sonhos
                </p>
                <h2 className="text-[22px] font-display font-normal text-[#38322A] leading-snug">
                  O que você sonhou?
                </h2>
                <p className="mt-1 text-[14px] text-[#38322A]/55 leading-relaxed">
                  Descreva seu sonho com o máximo de detalhes que lembrar. Eco vai interpretar com base em Freud e Jung.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8E3DD] bg-white/80 shadow-sm">
                <textarea
                  ref={textareaRef}
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  placeholder="Descreva seu sonho... (ex: Estava sendo perseguido e não conseguia correr)"
                  className="w-full resize-none rounded-2xl bg-transparent px-4 py-4 text-[15px] text-[#38322A] placeholder-[#38322A]/30 outline-none min-h-[140px] leading-relaxed"
                  maxLength={2000}
                  disabled={isStreaming}
                />
                <div className="flex items-center justify-between border-t border-[#E8E3DD]/50 px-4 py-2">
                  <span className="text-[12px] text-[#38322A]/30">{dreamText.length}/2000</span>
                  <button
                    onClick={interpretar}
                    disabled={dreamText.trim().length < 10 || isStreaming}
                    className="flex items-center gap-2 rounded-full bg-[#38322A] px-5 py-2 text-[14px] font-medium text-white transition-all hover:-translate-y-[1px] hover:bg-[#38322A]/90 disabled:opacity-40 disabled:translate-y-0 disabled:cursor-not-allowed"
                  >
                    {isStreaming ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Interpretando...
                      </>
                    ) : (
                      'Interpretar →'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Streaming / done interpretation */}
        <AnimatePresence>
          {(hasInterpretation || isStreaming) && (
            <motion.div
              key="interpretation"
              ref={interpretationRef}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Dream echo */}
              <div className="rounded-2xl border border-[#E8E3DD] bg-white/60 px-4 py-3">
                <p className="text-[12px] uppercase tracking-widest text-[#A7846C] mb-1">Seu sonho</p>
                <p className="text-[14px] text-[#38322A]/70 leading-relaxed italic">"{dreamText}"</p>
              </div>

              {/* Streaming indicator */}
              {isStreaming && !hasInterpretation && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-[#A7846C] animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-[13px] text-[#38322A]/50">Interpretando seu sonho...</span>
                </div>
              )}

              {/* Interpretation text */}
              {hasInterpretation && (
                <div className="rounded-2xl border border-[#E8E3DD] bg-white/80 px-5 py-5 shadow-sm">
                  <div className="prose prose-stone max-w-none text-[15px] leading-relaxed [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-[#38322A] [&_h3]:mt-5 [&_h3]:mb-2 [&_h4]:text-[14px] [&_h4]:font-semibold [&_h4]:text-[#38322A]/70 [&_h4]:mt-3 [&_h4]:mb-1 [&_p]:text-[#38322A]/80 [&_p]:mb-3 [&_hr]:border-[#E8E3DD] [&_hr]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#A7846C] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[#38322A]/70">
                    <ReactMarkdown>{interpretation}</ReactMarkdown>
                    {isStreaming && (
                      <span className="inline-block h-4 w-0.5 animate-pulse bg-[#A7846C] ml-0.5" />
                    )}
                  </div>
                </div>
              )}

              {/* Actions after done */}
              {(isDone || isError) && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 rounded-full border border-[#E8E3DD] bg-white px-4 py-2 text-[14px] text-[#38322A]/70 transition hover:-translate-y-[1px] hover:bg-[#F5F2EF]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Novo sonho
                  </button>
                </div>
              )}

              {/* Error message */}
              {isError && errorMsg && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600">
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
            transition={{ delay: 0.15 }}
            className="mt-8 space-y-3"
          >
            <p className="text-[12px] font-medium uppercase tracking-widest text-[#38322A]/40">
              Sonhos anteriores
            </p>
            <div className="space-y-2">
              {history.map((dream) => (
                <DreamHistoryItem key={dream.id} dream={dream} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
