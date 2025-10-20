// ✅ src/api/voiceApi.ts

// Base do backend (Render) — no dev usamos o origin local (proxy do Vite)
import { buildIdentityHeaders, updateBiasHint } from "../lib/guestId";
import { computeBiasHintFromMessages, computeBiasHintFromText } from "../utils/biasHint";

const BACKEND_BASE =
  (import.meta as any).env.MODE === "development"
    ? window.location.origin
    : (import.meta as any).env.VITE_BACKEND_URL?.replace(/\/+$/, "");

if (!BACKEND_BASE) {
  throw new Error("VITE_BACKEND_URL ausente no build do front.");
}

function base64ToDataURL(b64: string, mime = "audio/mpeg") {
  return `data:${mime};base64,${b64}`;
}

async function readError(r: Response): Promise<never> {
  let msg = `Falha ${r.status}`;
  const ct = r.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const j = await r.clone().json();
      msg = j?.error || j?.message || msg;
    } else {
      const t = await r.clone().text();
      msg = t || msg;
    }
  } catch {}
  throw new Error(msg);
}

// Converte Blob -> Data URL (não usa createObjectURL)
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error || new Error("FileReader falhou"));
    fr.readAsDataURL(blob);
  });
}

// Pequeno helper de timeout p/ fetch
async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, ms = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Texto -> áudio (POST /api/voice/tts)
 * Retorna SEMPRE um Data URL (data:audio/mpeg;base64,...)
 * Mantém o 2º parâmetro pra compatibilidade, mas IGNORA.
 */
export async function gerarAudioDaMensagem(text: string, _voiceId?: string): Promise<string> {
  const url = `${BACKEND_BASE}/api/voice/tts`;
  const body: any = { text: String(text ?? "").trim() };
  if (!body.text) throw new Error("Texto vazio para TTS.");

  // 👇 NÃO enviamos mais voice_id; o backend decide a voz
  const biasHint = computeBiasHintFromText(body.text);
  updateBiasHint(biasHint ?? null);

  const resp = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      ...buildIdentityHeaders({ biasHint }),
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) await readError(resp);

  // Em alguns hosts pode vir sem content-type; força audio/mpeg
  let blob = await resp.blob();
  if (!(blob instanceof Blob)) {
    const ab = await resp.arrayBuffer();
    blob = new Blob([ab], { type: "audio/mpeg" });
  }
  if (!blob.type) blob = new Blob([blob], { type: "audio/mpeg" });

  // (Opcional) Inspecionar a voz usada enviada pelo servidor:
  // console.debug("x-voice-id:", resp.headers.get("x-voice-id"));

  return await blobToDataURL(blob);
}

/**
 * Fluxo completo (grava -> transcreve -> responde -> TTS)
 * Já vem como Base64 do backend; converte para Data URL.
 * Mantém o 6º parâmetro pra compatibilidade, mas IGNORA.
 */
export async function sendVoiceMessage(
  audioBlob: Blob,
  messages: any[],
  userName: string,
  userId: string,
  accessToken: string,
  _voiceId?: string
): Promise<{ userText: string; ecoText: string; audioUrl: string }> {
  const url = `${BACKEND_BASE}/api/voice/transcribe-and-respond`;

  const fd = new FormData();
  fd.append("audio", audioBlob, "gravacao.webm");
  fd.append("nome_usuario", userName);
  fd.append("usuario_id", userId);
  fd.append("access_token", accessToken);
  fd.append("mensagens", JSON.stringify(messages || []));

  // 👇 NÃO enviamos voice_id; o backend decide a voz
  const biasHint = computeBiasHintFromMessages(messages as any);
  updateBiasHint(biasHint ?? null);

  const resp = await fetchWithTimeout(url, {
    method: "POST",
    body: fd,
    headers: buildIdentityHeaders({ biasHint }),
  });

  if (!resp.ok) await readError(resp);

  const data = await resp.json();
  if (!data?.audioBase64) {
    throw new Error("Backend não retornou áudio (audioBase64 ausente).");
  }

  return {
    userText: data.userText,
    ecoText: data.ecoText,
    audioUrl: base64ToDataURL(data.audioBase64, "audio/mpeg"),
  };
}
