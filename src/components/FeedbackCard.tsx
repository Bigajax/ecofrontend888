import { useEffect, useMemo, useRef, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const DEFAULT_REASONS = [
  "Não entendi",
  "Resposta incorreta",
  "Incompleta",
  "Não é relevante",
];

type FeedbackCardProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  selectedReason?: string;
  error?: string | null;
  reasons?: string[];
  onSelectReason: (reason: string) => void;
  onSubmit: (reason?: string) => void | Promise<void>;
  onClose: () => void;
};

export default function FeedbackCard({
  isOpen,
  isSubmitting,
  selectedReason,
  error,
  reasons,
  onSelectReason,
  onSubmit,
  onClose,
}: FeedbackCardProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const firstChipRef = useRef<HTMLButtonElement | null>(null);
  const chips = useMemo(() => reasons?.slice(0, 5) ?? DEFAULT_REASONS, [reasons]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      if (!selectedReason) {
        firstChipRef.current?.focus();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, selectedReason]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (typeof document === "undefined" || !isOpen) {
    return null;
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === backdropRef.current) {
      onClose();
    }
  };

  const handleSubmit = () => {
    onSubmit(selectedReason);
  };

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-card-title"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 id="feedback-card-title" className="text-lg font-semibold text-slate-800">
          O que não ajudou?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Compartilhe o motivo para melhorarmos as próximas respostas.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip, index) => {
            const active = chip === selectedReason;
            return (
              <button
                key={chip}
                ref={index === 0 ? firstChipRef : undefined}
                type="button"
                onClick={() => onSelectReason(chip)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 ${
                  active
                    ? "border-red-400 bg-red-50 text-red-600"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                aria-pressed={active}
                disabled={isSubmitting}
              >
                {chip}
              </button>
            );
          })}
        </div>
        {error && <p className="mt-3 text-sm text-red-500" role="alert">{error}</p>}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
