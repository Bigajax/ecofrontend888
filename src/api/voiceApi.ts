// ✅ src/api/voiceApi.ts

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

// Converte Blob -> Data URL (sem createObjectURL)
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error || new Error("FileReader falhou"));
      fr.readAsDataURL(blob);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Texto -> áudio (POST /api/voice/tts)
 * Retorna SEMPRE um Data URL (data:audio/mpeg;base64,...)
 */
export async function gerarAudioDaMensagem(text: string, voiceId?: string): Promise<string> {
  const url = `${BACKEND_BASE}/api/voice/tts`;
  const body = voiceId ? { text, voice_id: voiceId } : { text };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) await readError(resp);

  // Em alguns hosts pode vir sem content-type; força audio/mpeg
  let blob = await resp.blob();
  if (!(blob instanceof Blob)) {
    blob = new Blob([await resp.arrayBuffer()], { type: "audio/mpeg" });
  }
  if (!blob.type) {
    blob = new Blob([blob], { type: "audio/mpeg" });
  }

  // 🔥 sem createObjectURL — sempre Data URL
  return await blobToDataURL(blob);
}

/**
 * Fluxo completo (grava -> transcreve -> responde -> TTS)
 * Já vem como Base64 do backend; converte para Data URL.
 */
export async function sendVoiceMessage(
  audioBlob: Blob,
  messages: any[],
  userName: string,
  userId: string,
  accessToken: string,
  voiceId?: string
): Promise<{ userText: string; ecoText: string; audioUrl: string }> {
  const url = `${BACKEND_BASE}/api/voice/transcribe-and-respond`;

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
