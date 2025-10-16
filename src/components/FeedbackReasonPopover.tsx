import {
  MutableRefObject,
  MouseEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { FEEDBACK_REASONS } from "./FeedbackPrompt";

type FeedbackReasonPopoverProps = {
  anchorRef: MutableRefObject<HTMLElement | null>;
  open: boolean;
  selectedReason: string | null;
  status: "idle" | "selecting" | "sending" | "success" | "error";
  onSelect: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

type Position = {
  top: number;
  left: number;
};

const DEFAULT_POSITION: Position = { top: 0, left: 0 };

export function FeedbackReasonPopover({
  anchorRef,
  open,
  selectedReason,
  status,
  onSelect,
  onConfirm,
  onClose,
}: FeedbackReasonPopoverProps) {
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const firstReasonRef = useRef<HTMLButtonElement | null>(null);
  const descriptionId = useId();

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      return;
    }

    const rect = anchor.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updatePosition]);

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
          className={`rounded-full border px-3 py-1 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
            active ? "bg-slate-100 border-slate-300" : "bg-white hover:bg-slate-50"
          }`}
        >
          {reason.label}
        </button>
      );
    });
  }, [onSelect, selectedReason]);

  if (!open) return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === backdropRef.current) {
      onClose();
    }
  };

  const isSending = status === "sending";

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] bg-black/20"
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-describedby={descriptionId}
        className="absolute min-w-[280px] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
        style={{
          top: position.top,
          left: position.left,
          transform: "translate(-50%, 0)",
        }}
      >
        <p id={descriptionId} className="mb-3 text-sm font-medium text-slate-700">
          O que não ajudou?
        </p>
        <div className="mb-4 flex flex-wrap gap-2">{reasonButtons}</div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="text-sm text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
            disabled={!selectedReason || isSending}
            aria-busy={isSending}
          >
            {isSending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
