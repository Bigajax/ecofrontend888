import { useCallback, useEffect, useRef, useState } from "react";
import { interpretarSonho, buscarHistoricoSonhos, type DreamRow } from "../api/dreamApi";
import { useAuth } from "../contexts/AuthContext";

type Status = "idle" | "loading" | "done" | "error";

interface SseChunkData { text?: string }
interface SseDoneData { ok?: boolean; reason?: string }


export function useEcoDream() {
  const { user } = useAuth();
  const [dreamText, setDreamText] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dreamId, setDreamId] = useState<string | null>(null);
  const [history, setHistory] = useState<DreamRow[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  const carregarHistorico = useCallback(async () => {
    if (!user) return;
    const rows = await buscarHistoricoSonhos();
    setHistory(rows);
  }, [user]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const cancelar = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const interpretar = useCallback(async () => {
    const text = dreamText.trim();
    if (!text || text.length < 10) return;

    cancelar();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setInterpretation("");
    setErrorMsg(null);
    setDreamId(null);

    try {
      const res = await interpretarSonho(text, controller.signal);

      if (!res.ok || !res.body) {
        setStatus("error");
        setErrorMsg("Não consegui conectar ao servidor. Tente novamente.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const processEvent = (rawEvent: string) => {
        const lines = rawEvent.split(/\r?\n/);
        let eventName = "message";
        let dataPayload = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataPayload = line.slice(5).trim();
          }
        }

        if (!dataPayload || dataPayload === "[DONE]") return;

        try {
          const parsed = JSON.parse(dataPayload) as Record<string, unknown>;

          if (eventName === "prompt_ready") {
            const id = parsed.interaction_id;
            if (typeof id === "string") setDreamId(id);
          } else if (eventName === "chunk") {
            const chunk = parsed as SseChunkData;
            if (chunk.text) {
              setInterpretation((prev) => prev + chunk.text);
            }
          } else if (eventName === "done") {
            const done = parsed as SseDoneData;
            if (done.ok !== false) {
              setStatus("done");
              carregarHistorico();
            }
          } else if (eventName === "error") {
            const msg = typeof parsed.message === "string" ? parsed.message : "Erro na interpretação.";
            setStatus("error");
            setErrorMsg(msg);
          }
        } catch {
          // ignore malformed SSE data
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx = buffer.indexOf("\n\n");
        while (idx >= 0) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (rawEvent.trim()) processEvent(rawEvent);
          idx = buffer.indexOf("\n\n");
        }
      }

      setStatus((prev) => prev === "loading" ? "done" : prev);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setStatus("error");
      setErrorMsg("Conexão interrompida. Tente novamente.");
    }
  }, [dreamText, cancelar, carregarHistorico]);

  return {
    dreamText,
    setDreamText,
    interpretation,
    status,
    errorMsg,
    dreamId,
    history,
    interpretar,
    cancelar,
    carregarHistorico,
  };
}
