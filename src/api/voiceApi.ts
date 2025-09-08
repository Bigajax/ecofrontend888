// src/api/voiceApi.ts
const API_BASE = (import.meta as any).env?.VITE_BACKEND_URL?.replace(/\/$/, "") || "";

function requireApiBase() {
  if (!API_BASE) {
    // Em produção, sem API_BASE não deve rodar
    if (import.meta.env.PROD) {
      throw new Error("VITE_BACKEND_URL ausente no front. Configure no Vercel.");
    }
  }
}

// ...helpers parseBackendError/blobToObjectURL/base64ToDataURL iguais

export async function gerarAudioDaMensagem(text: string, voiceId?: string): Promise<string> {
  requireApiBase();
  const url = `${API_BASE}/api/voice/tts`;
  console.log("[TTS →]", url);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(voiceId ? { text, voice_id: voiceId } : { text }),
  });
  if (!response.ok) await parseBackendError(response);
  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}

export async function sendVoiceMessage(
  audioBlob: Blob,
  messages: any[],
  userName: string,
  userId: string,
  accessToken: string,
  voiceId?: string
) {
  requireApiBase();
  const url = `${API_BASE}/api/voice/transcribe-and-respond`;
  console.log("[Full voice →]", url);

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
  return { userText: data.userText, ecoText: data.ecoText, audioUrl: `data:audio/mpeg;base64,${data.audioBase64}` };
}
