// ✅ src/api/voiceApi.ts

// Base da API: em produção (Vercel) use VITE_API_BASE apontando para o Render.
// Ex.: VITE_API_BASE="https://seu-backend.onrender.com/api"
const RAW_BASE = import.meta.env.VITE_API_BASE?.trim();
const API_BASE = (RAW_BASE && RAW_BASE.replace(/\/+$/, "")) || "/api"; // fallback p/ dev com proxy

async function parseBackendError(response: Response): Promise<never> {
  // tenta JSON { error }, senão texto puro
  let bodyText = "";
  try {
    const data = await response.clone().json();
    throw new Error(data?.error || `Falha ${response.status}`);
  } catch {
    try {
      bodyText = await response.text();
    } catch {}
    throw new Error(bodyText || `Falha ${response.status}`);
  }
}

function blobToObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

function base64ToDataURL(base64: string, mime = "audio/mpeg"): string {
  return `data:${mime};base64,${base64}`;
}

/**
 * Gera TTS direto (texto -> áudio) usando POST {API_BASE}/voice/tts.
 * Retorna uma URL tocável no <audio/>.
 */
export async function gerarAudioDaMensagem(
  text: string,
  voiceId?: string
): Promise<string> {
  const response = await fetch(`${API_BASE}/voice/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(voiceId ? { text, voice_id: voiceId } : { text }),
  });

  if (!response.ok) await parseBackendError(response);

  const audioBlob = await response.blob(); // backend retorna audio/mpeg
  return blobToObjectURL(audioBlob);
}

/**
 * Fluxo completo: gravação (Blob) -> /transcribe-and-respond
 * Retorna texto do usuário, texto da Eco e uma URL tocável do áudio.
 */
export async function sendVoiceMessage(
  audioBlob: Blob,
  messages: any[],
  userName: string,
  userId: string,
  accessToken: string,
  voiceId?: string
): Promise<{ userText: string; ecoText: string; audioUrl: string }> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "gravacao.webm");
  formData.append("nome_usuario", userName);
  formData.append("usuario_id", userId);
  formData.append("access_token", accessToken);
  formData.append("mensagens", JSON.stringify(messages));
  if (voiceId) formData.append("voice_id", voiceId);

  const response = await fetch(`${API_BASE}/voice/transcribe-and-respond`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) await parseBackendError(response);

  const data = await response.json();

  if (!data?.audioBase64) {
    throw new Error("Resposta da IA não contém áudio (audioBase64 ausente).");
  }

  // Converte base64 -> data URL (compatível com seu AudioPlayerOverlay)
  const audioUrl = base64ToDataURL(data.audioBase64, "audio/mpeg");

  return {
    userText: data.userText,
    ecoText: data.ecoText,
    audioUrl,
  };
}
