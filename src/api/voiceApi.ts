// ✅ src/api/voiceApi.ts
const BACKEND_BASE =
  (import.meta as any).env.MODE === "development"
    ? window.location.origin // dev: proxy local
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

// --- helpers robustos p/ blob->URL ---
function createObjectURLSafe(blob: Blob): string | null {
  try {
    const WURL = (window as any).URL || (window as any).webkitURL;
    if (WURL?.createObjectURL && blob) {
      return WURL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn("[voiceApi] createObjectURL falhou:", (e as Error)?.message || e);
  }
  return null;
}

function readBlobAsDataURL(blob: Blob): Promise<string> {
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

// Texto -> áudio (TTS direto)
export async function gerarAudioDaMensagem(text: string, voiceId?: string): Promise<string> {
  const url = `${BACKEND_BASE}/api/voice/tts`;
  const body = voiceId ? { text, voice_id: voiceId } : { text };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) await readError(resp);

  // pode vir sem content-type em alguns hosts — trate como áudio mesmo assim
  let blob = await resp.blob();
  if (!(blob instanceof Blob)) {
    // fallback paranoico (não deve acontecer em browsers modernos)
    blob = new Blob([await resp.arrayBuffer()], { type: "audio/mpeg" });
  }
  if (!blob.type) {
    // padroniza o mime
    blob = new Blob([blob], { type: "audio/mpeg" });
  }

  // 1ª tentativa: blob: URL
  const objUrl = createObjectURLSafe(blob);
  if (objUrl) return objUrl;

  // Fallback seguro: Data URL
  return await readBlobAsDataURL(blob);
}

// Fluxo completo (grava -> transcreve -> responde -> TTS)
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
  if (!data?.audioBase64) {
    throw new Error("Backend não retornou áudio (audioBase64 ausente).");
  }

  return {
    userText: data.userText,
    ecoText: data.ecoText,
    audioUrl: base64ToDataURL(data.audioBase64, "audio/mpeg"),
  };
}
