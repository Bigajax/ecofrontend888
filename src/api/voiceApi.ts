// ✅ src/api/voiceApi.ts
const BACKEND_BASE =
  (import.meta as any).env.MODE === "development"
    ? (window.location.origin) // dev: usa proxy local se tiver
    : (import.meta as any).env.VITE_BACKEND_URL?.replace(/\/+$/, "");

// Se não setou a env no Vercel, falha visível:
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

// Texto -> áudio
export async function gerarAudioDaMensagem(text: string, voiceId?: string): Promise<string> {
  const url = `${BACKEND_BASE}/api/voice/tts`;
  const body = voiceId ? { text, voice_id: voiceId } : { text };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) await readError(resp);
  const ct = resp.headers.get("content-type") || "";
  if (!/audio\//i.test(ct)) await readError(resp);

  const blob = await resp.blob();
  const safe = blob.type ? blob : new Blob([blob], { type: "audio/mpeg" });
  return URL.createObjectURL(safe);
}

// Fluxo completo (grava → transcreve → responde → TTS)
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
  if (!data?.audioBase64) throw new Error("Backend não retornou áudio.");
  return { userText: data.userText, ecoText: data.ecoText, audioUrl: base64ToDataURL(data.audioBase64) };
}
