// ✅ src/api/voiceApi.ts (robusto)

const BACKEND_BASE =
  (import.meta as any)?.env?.VITE_BACKEND_URL?.replace(/\/+$/, "") ||
  window.location.origin; // fallback local/dev

function base64ToDataURL(base64: string, mime = "audio/mpeg") {
  return `data:${mime};base64,${base64}`;
}

async function readError(r: Response): Promise<never> {
  const ct = r.headers.get("content-type") || "";
  let msg = `Falha ${r.status}`;
  try {
    if (ct.includes("application/json")) {
      const j = await r.clone().json();
      msg = j?.error || j?.message || msg;
    } else {
      const t = await r.clone().text();
      msg = t || msg;
    }
  } catch {
    /* ignore */
  }
  throw new Error(msg);
}

/**
 * Texto -> Áudio (Eleven) via backend
 * Retorna um ObjectURL apenas se o backend realmente devolveu áudio.
 */
export async function gerarAudioDaMensagem(text: string, voiceId?: string): Promise<string> {
  const url = `${BACKEND_BASE}/api/voice/tts`;
  const body = voiceId ? { text, voice_id: voiceId } : { text };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(body),
  });

  // se status não for 2xx, lê a mensagem de erro do backend e lança
  if (!resp.ok) await readError(resp);

  const ct = resp.headers.get("content-type") || "";
  // se não veio áudio, tente ler mensagem e lançar
  if (!/audio\//i.test(ct)) await readError(resp);

  const blob = await resp.blob();
  // alguns servers podem não setar type; força mpeg como fallback
  const safeBlob = blob.type ? blob : new Blob([blob], { type: "audio/mpeg" });
  return URL.createObjectURL(safeBlob);
}

/**
 * Fluxo completo (gravação -> transcrição+resposta+tts)
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

  const formData = new FormData();
  formData.append("audio", audioBlob, "gravacao.webm");
  formData.append("nome_usuario", userName);
  formData.append("usuario_id", userId);
  formData.append("access_token", accessToken);
  formData.append("mensagens", JSON.stringify(messages));
  if (voiceId) formData.append("voice_id", voiceId);

  const resp = await fetch(url, { method: "POST", body: formData });
  if (!resp.ok) await readError(resp);

  const data = await resp.json();
  if (!data?.audioBase64) throw new Error("Backend não retornou áudio.");

  return {
    userText: data.userText,
    ecoText: data.ecoText,
    audioUrl: base64ToDataURL(data.audioBase64, "audio/mpeg"),
  };
}
