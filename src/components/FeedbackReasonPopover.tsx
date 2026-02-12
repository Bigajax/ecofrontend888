import { PointerEvent, useEffect, useId, useMemo, useRef } from "react";

import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

import FeedbackPortal from "./feedback/FeedbackPortal";
import { FEEDBACK_REASONS } from "../constants/feedback";

type FeedbackReasonPopoverProps = {
  open: boolean;
  selectedReason: string | null;
  status: "idle" | "selecting" | "sending" | "success" | "error";
  onSelect: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function FeedbackReasonPopover({
  open,
  selectedReason,
  status,
  onSelect,
  onConfirm,
  onClose,
}: FeedbackReasonPopoverProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const firstReasonRef = useRef<HTMLButtonElement | null>(null);
  const descriptionId = useId();

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => {
      firstReasonRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const reasonButtons = useMemo(() => {
    return FEEDBACK_REASONS.map((reason, index) => {
      const active = selectedReason === reason.key;
      const ref = index === 0 ? firstReasonRef : undefined;
      return (
        <button
          key={reason.key}
          ref={ref}
          type="button"
          onClick={() => onSelect(reason.key)}
          className={`rounded-full border px-4 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
            active
              ? "border-slate-300 bg-slate-100 text-slate-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {reason.label}
        </button>
      );
    });
  }, [onSelect, selectedReason]);

  if (!open) return null;

  const handleBackdropClick = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === backdropRef.current) {
      onClose();
    }
  };

  const isSending = status === "sending";
  const bottomOffset = "calc(16px + env(safe-area-inset-bottom, 0px))";

  return (
    <FeedbackPortal>
      <>
        <div
          ref={backdropRef}
          className="fixed inset-0 z-[60] min-h-[100dvh] bg-black/35 backdrop-blur-[2px]"
          onPointerDown={handleBackdropClick}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[61] flex min-h-[100dvh] flex-col justify-end"
          style={{ paddingBottom: bottomOffset }}
        >
          <div className="pointer-events-auto mx-auto w-full max-w-screen-sm px-4 md:max-w-lg">
            <div
              role="dialog"
              aria-modal="true"
              aria-describedby={descriptionId}
              className="animate-[feedback-sheet-in_220ms_ease-out] rounded-3xl bg-white/95 p-4 ring-1 ring-black/5 backdrop-blur"
              style={{
                maxHeight: "min(70dvh, 520px)",
                overflow: "auto",
                WebkitOverflowScrolling: "touch",
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
              }}
            >
              <div className="flex flex-col gap-4">
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-900">
                    O que não ajudou?
                  </p>
                  <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                    Conte para a Eco como ela pode responder melhor.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2" role="group">
                  {reasonButtons}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    className="w-full rounded-full border border-transparent px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:w-auto"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    onClick={onConfirm}
                    disabled={!selectedReason || isSending}
                    aria-busy={isSending}
                  >
                    {isSending ? "Enviando…" : "Enviar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    </FeedbackPortal>
  );
}
