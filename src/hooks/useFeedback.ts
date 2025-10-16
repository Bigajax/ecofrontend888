import { useCallback, useMemo, useRef, useState } from "react";

import { sendFeedback } from "../api/feedbackApi";

const createToast = () => {
  if (typeof window === "undefined") {
    return {
      success: () => undefined,
      error: () => undefined,
    };
  }

  const dispatch = (title: string) => {
    window.dispatchEvent(
      new CustomEvent("toast", {
        detail: { title },
      }),
    );
  };

  return {
    success: (title: string) => dispatch(title),
    error: (title: string) => dispatch(title),
  };
};

const toast = createToast();

export function useFeedback() {
  const sent = useRef<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | undefined>();
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasInteraction = interactionId && interactionId.trim().length > 0;

  const close = useCallback(() => {
    setIsOpen(false);
    setIsSubmitting(false);
    setSelectedReason(undefined);
    setInteractionId(null);
    setError(null);
  }, []);

  const openDislike = useCallback((id: string) => {
    const trimmed = (id ?? "").trim();
    if (!trimmed) return;
    if (sent.current.has(trimmed)) {
      toast.success("Obrigado pelo feedback.");
      return;
    }
    setInteractionId(trimmed);
    setSelectedReason(undefined);
    setError(null);
    setIsOpen(true);
  }, []);

  const sendLike = useCallback(
    async (id: string) => {
      const trimmed = (id ?? "").trim();
      if (!trimmed) return false;
      if (sent.current.has(trimmed)) {
        toast.success("👍 registrado");
        return true;
      }

      setError(null);
      const result = await sendFeedback({
        interaction_id: trimmed,
        vote: "up",
      });

      if (result.ok) {
        sent.current.add(trimmed);
        toast.success("👍 registrado");
        return true;
      }
      toast.error("Não foi possível enviar agora.");
      return false;
    },
    [],
  );

  const submitDislike = useCallback(
    async (reason?: string) => {
      if (!hasInteraction) return false;
      const trimmedId = interactionId!.trim();
      if (sent.current.has(trimmedId)) {
        toast.success("Obrigado pelo feedback.");
        close();
        return true;
      }
      if (isSubmitting) return false;

      setIsSubmitting(true);
      setError(null);
      const resolvedReason = (reason ?? selectedReason)?.trim();

      try {
        const result = await sendFeedback({
          interaction_id: trimmedId,
          vote: "down",
          reason: resolvedReason && resolvedReason.length > 0 ? resolvedReason : undefined,
        });

        if (result.ok) {
          sent.current.add(trimmedId);
          toast.success("Obrigado pelo feedback.");
          close();
          return true;
        }

        setError("Não foi possível enviar agora.");
        toast.error("Não foi possível enviar agora.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [close, hasInteraction, interactionId, isSubmitting, selectedReason],
  );

  return useMemo(
    () => ({
      isOpen,
      isSubmitting,
      selectedReason,
      interactionId,
      error,
      openDislike,
      close,
      sendLike,
      submitDislike,
      setSelectedReason,
    }),
    [
      close,
      error,
      interactionId,
      isOpen,
      isSubmitting,
      openDislike,
      selectedReason,
      sendLike,
      submitDislike,
      setSelectedReason,
    ],
  );
}
