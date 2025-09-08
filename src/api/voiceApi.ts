// ✅ src/api/voiceApi.ts

const IS_DEV = (import.meta as any).env.MODE === "development";
const ENV_BASE = (import.meta as any).env.VITE_BACKEND_URL?.replace(/\/+$/, "") || "";
const BACKEND_BASE = IS_DEV ? (ENV_BASE || window.location.origin.replace(/\/+$/, "")) : ENV_BASE;

if (!BACKEND_BASE) {
  throw new Error("VITE_BACKEND_URL ausente no build do front.");
}

const apiUrl = (path: string) =>
  `${BACKEND_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

/* ------------------------------- helpers -------------------------------- */

function base64ToDataURL(b64: string, mime = "audio/mpeg") {
  return `data:${mime};base64,${b64}`;
}

async function readError(resp: Response): Promise<never> {
  let msg = `Falha ${resp.status}`;
  try {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await resp.clone().json();
      msg = j?.error || j?.message || msg;
    } else {
      const t = await resp.clone().text();
      msg = t || msg;
    }
  } catch {}
  throw new Error(msg);
}

/** Converte Blob -> Data URL (sem createObjectURL) */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error || new Error("FileReader falhou"));
    fr.readAsDataURL(blob);
  });
}

/* ------------------------------- APIs ----------------------------------- */

/** Texto -> áudio (MP3) usando /api/voice/tts. Retorna **Data URL**. */
export async function gerarAudioDaMensagem(text: string, voiceId?: string): Promise<string> {
  const url = apiUrl("/api/voice/tts");
  const body = voiceId ? { text, voice_id: voiceId } : { text };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) await readError(resp);

  // Garante Blob com MIME de áudio mesmo que o servidor mande octet-stream
  const buf = await resp.arrayBuffer();
  const ct = resp.headers.get("content-type") || "audio/mpeg";
  const blob = new Blob([buf], { type: /audio\//i.test(ct) ? ct : "audio/mpeg" });

  // ❌ NÃO usa createObjectURL; ✅ usa Data URL (compat Safari/iOS)
  return blobToDataURL(blob);
}

/** Fluxo completo: grava -> transcreve -> responde -> TTS. Retorna **Data URL**. */
export async function sendVoiceMessage(
  audioBlob: Blob,
  messages: any[],
  userName: string,
  userId: string,
  accessToken: string,
  voiceId?: string
): Promise<{ userText: string; ecoText: string; audioUrl: string }> {
  const url = apiUrl("/api/voice/transcribe-and-respond");

  const fd = new FormData();
  fd.append("audio", audioBlob, "gravacao.webm");
  fd.append("nome_usuario", userName);
  fd.append("usuario_id", userId);
  fd.append("access_token", accessToken);
  fd.append("mensagens", JSON.stringify(messages));
  if (voiceId) fd.append("voice_id", voiceId);

  const resp = await fetch(url, { method: "POST", body: fd });
  if (!resp.ok) await readError(resp);

  const data = await resp.json();
  if (!data?.audioBase64) throw new Error("Backend não retornou áudio (audioBase64 ausente).");

  return {
    userText: data.userText,
    ecoText: data.ecoText,
    audioUrl: base64ToDataURL(data.audioBase64, "audio/mpeg"),
  };
}
