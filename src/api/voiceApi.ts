// ✅ src/api/voiceApi.ts

import { buildApiUrl } from "../constants/api";
import { buildIdentityHeaders, updateBiasHint } from "../lib/guestId";
import { computeBiasHintFromMessages, computeBiasHintFromText } from "../utils/biasHint";

const VOICE_TTS_ENDPOINT = "/api/voice/tts";
const VOICE_TRANSCRIBE_ENDPOINT = "/api/voice/transcribe-and-respond";

const buildVoiceUrl = (path: string) => buildApiUrl(path);

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
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const finalInit: RequestInit = { ...init, signal: ctrl.signal };
    console.debug("[VoiceApi] Fazendo fetch para:", String(input), { timeout: ms, method: init.method || 'GET' });
    const response = await fetch(input, finalInit);
    console.debug("[VoiceApi] Resposta recebida:", { status: response.status, statusText: response.statusText });
    return response;
  } catch (error) {
    console.error("[VoiceApi] Fetch falhou:", { error: String(error), input: String(input), timeout: ms });
    throw error;
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
  try {
    console.debug("[TTS] Iniciando geração de áudio para texto:", text.substring(0, 50) + "...");

    const url = buildVoiceUrl(VOICE_TTS_ENDPOINT);
    console.debug("[TTS] URL construída:", url);

    const body: any = { text: String(text ?? "").trim() };
    if (!body.text) throw new Error("Texto vazio para TTS.");

    // 👇 NÃO enviamos mais voice_id; o backend decide a voz
    const biasHint = computeBiasHintFromText(body.text);
    updateBiasHint(biasHint ?? null);

    console.debug("[TTS] Enviando requisição para gerar áudio...");
    const resp = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        ...buildIdentityHeaders({ biasHint }),
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      console.error("[TTS] Resposta com erro:", { status: resp.status, statusText: resp.statusText });
      await readError(resp);
    }

    console.debug("[TTS] Convertendo resposta para blob...");
    // Em alguns hosts pode vir sem content-type; força audio/mpeg
    let blob = await resp.blob();
    if (!(blob instanceof Blob)) {
      const ab = await resp.arrayBuffer();
      blob = new Blob([ab], { type: "audio/mpeg" });
    }
    if (!blob.type) blob = new Blob([blob], { type: "audio/mpeg" });

    console.debug("[TTS] Blob criado com sucesso:", { size: blob.size, type: blob.type });

    // (Opcional) Inspecionar a voz usada enviada pelo servidor:
    const voiceId = resp.headers.get("x-voice-id");
    if (voiceId) console.debug("[TTS] Voz usada:", voiceId);

    console.debug("[TTS] Convertendo para Data URL...");
    const dataUrl = await blobToDataURL(blob);
    console.debug("[TTS] Geração de áudio concluída com sucesso!");

    return dataUrl;
  } catch (error) {
    console.error("[TTS] Erro ao gerar áudio:", error);
    throw error;
  }
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
  const url = buildVoiceUrl(VOICE_TRANSCRIBE_ENDPOINT);

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
