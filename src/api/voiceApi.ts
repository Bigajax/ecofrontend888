const API_BASE =
  (import.meta as any).env?.VITE_BACKEND_URL?.replace(/\/$/, "") || ""; // ex: https://eco-backend.onrender.com

async function parseBackendError(response: Response): Promise<never> {
  try {
    const data = await response.json();
    throw new Error(data?.error || `Falha ${response.status}`);
  } catch {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Falha ${response.status}`);
  }
}

function blobToObjectURL(blob: Blob) {
  return URL.createObjectURL(blob);
}
function base64ToDataURL(base64: string, mime = "audio/mpeg") {
  return `data:${mime};base64,${base64}`;
}

/** Texto -> áudio (mp3) */
export async function gerarAudioDaMensagem(text: string, voiceId?: string): Promise<string> {
  const url = `${API_BASE}/api/voice/tts`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(voiceId ? { text, voice_id: voiceId } : { text }),
  });
  if (!response.ok) await parseBackendError(response);
  const audioBlob = await response.blob();
  return blobToObjectURL(audioBlob);
}

/** Fluxo completo (áudio -> transcrição -> resposta -> TTS) */
export async function sendVoiceMessage(
  audioBlob: Blob,
  messages: any[],
  userName: string,
  userId: string,
  accessToken: string,
  voiceId?: string
) {
  const url = `${API_BASE}/api/voice/transcribe-and-respond`;
  const formData = new FormData();
  formData.append("audio", audioBlob, "gravacao.webm");
  formData.append("nome_usuario", userName);
  formData.append("usuario_id", userId);
  formData.append("access_token", accessToken);
  formData.append("mensagens", JSON.stringify(messages));
  if (voiceId) formData.append("voice_id", voiceId);

  const response = await fetch(url, { method: "POST", body: formData });
  if (!response.ok) await parseBackendError(response);

  const data = await response.json();
  if (!data?.audioBase64) throw new Error("Resposta da IA não contém áudio.");

  return {
    userText: data.userText,
    ecoText: data.ecoText,
    audioUrl: base64ToDataURL(data.audioBase64, "audio/mpeg"),
  };
}
