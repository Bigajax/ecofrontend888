import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, StopCircle, Loader, BookOpen, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sendVoiceMessage } from "../api/voiceApi";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import EcoBubbleOneEye from "../components/EcoBubbleOneEye";
import { useGuestExperience } from "../contexts/GuestExperienceContext";

/** Mude para false quando quiser liberar a gravação */
const UNDER_CONSTRUCTION = true;

const VoicePage: React.FC = () => {
  const { userName, userId, user } = useAuth();
  const { trackInteraction } = useGuestExperience();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ecoAudioURL, setEcoAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const bubbleState: 'idle' | 'listening' | 'speaking' | 'thinking' | 'focus' =
    isProcessing ? 'thinking' : isListening ? 'listening' : ecoAudioURL ? 'speaking' : 'focus';

  const navigate = useNavigate();
  const goToMemoryPage = () => navigate('/app/memory');
  const goToChatPage = () => navigate('/app');

  const ecoAudioURLRef = useRef<string | null>(null);

  const revokeEcoAudioURL = () => {
    const current = ecoAudioURLRef.current;
    if (current && current.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(current);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[VoicePage] Falha ao revogar URL de áudio", error);
        }
      }
    }
    ecoAudioURLRef.current = null;
    setEcoAudioURL(null);
  };

  const handleError = (msg: string) => {
    setError(msg);
    setIsListening(false);
    setIsProcessing(false);
    revokeEcoAudioURL();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      audioChunks.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.current.push(event.data);
      };

      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunks.current, { type: recorder.mimeType });
        if (audioBlob.size === 0) {
          setIsProcessing(false);
          return;
        }

        setIsProcessing(true);
        revokeEcoAudioURL();

        try {
          const session = await supabase.auth.getSession();
          const accessToken = session.data.session?.access_token;
          const response = await sendVoiceMessage(audioBlob, [], userName, userId, accessToken);

          const ecoTextoLimpo = response.ecoText?.replace(/\{[\s\S]*?\}$/, "").trim();
          console.log("[🧠 Eco disse]:", ecoTextoLimpo);

          const audioURL = response.audioUrl;
          ecoAudioURLRef.current = audioURL.startsWith("blob:") ? audioURL : null;
          setEcoAudioURL(audioURL);
          const ecoAudio = new Audio(audioURL);
          await ecoAudio.play();

          // Rastrear interação para guests
          if (!user) {
            const recordingDuration = audioBlob.size / 1024; // Aproximação em KB

            trackInteraction('voice_message_sent', {
              recording_size_kb: recordingDuration,
              transcription_length: response.userText?.length || 0,
              page: '/app/voice',
            });

            // Disparar evento customizado para GuestExperienceTracker
            window.dispatchEvent(new CustomEvent('eco:voice:message-sent', {
              detail: {
                recording_size_kb: recordingDuration,
                transcription_length: response.userText?.length || 0,
              },
            }));
          }
        } catch (err: any) {
          handleError(`Falha na interação de voz: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.onerror = (event) => {
        handleError(`Erro no MediaRecorder: ${(event as MediaRecorderErrorEvent).error.name}`);
      };

      recorder.start();
      setIsListening(true);
      mediaRecorderRef.current = recorder;
    } catch (err: any) {
      handleError(
        `Erro ao acessar o microfone: ${
          err.message || "Permissão de microfone negada ou não disponível."
        }`
      );
    }
  };

  const toggleRecording = () => {
    if (UNDER_CONSTRUCTION) {
      setError("O modo Voz está em construção. Em breve você poderá conversar com a Eco por áudio ✨");
      return;
    }
    if (isListening) stopRecording();
    else startRecording();
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      revokeEcoAudioURL();
    };
  }, []);

  return (
    <motion.div
      className="
        relative min-h-screen flex flex-col items-center
        bg-[radial-gradient(1200px_600px_at_60%_15%,rgba(255,255,255,0.9),transparent),
            radial-gradient(900px_600px_at_20%_70%,rgba(255,255,255,0.85),transparent),
            linear-gradient(to_br,#f7fbff,#faf7ff,#fff0f4)]
        px-4 pt-[calc(var(--eco-topbar-h,56px)+18px)] pb-16
      "
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Selo “Em construção” */}
      <div className="absolute top-[calc(var(--eco-topbar-h,56px)+8px)]">
        <span className="px-3 py-1.5 rounded-full border border-black/10 bg-white/80 text-neutral-700 text-sm font-medium">
          Em construção
        </span>
      </div>

      {/* Eco bolha unificada */}
      <motion.div
        className="mt-10 mb-10 relative flex items-center justify-center"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <EcoBubbleOneEye variant="voice" state={bubbleState} />
      </motion.div>

      {/* Mensagem/erro sutil */}
      {error && (
        <div className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm mb-6 text-center max-w-md">
          {error}
        </div>
      )}

      <div className="mt-auto mb-2 text-center">
        <p className="text-neutral-500 text-sm">
          Converse por voz com a Eco — design preview.
        </p>
      </div>

      {/* Botões em glass */}
      <div className="mb-4 flex items-center justify-center gap-5">
        <motion.button
          onClick={goToMemoryPage}
          className="
            h-14 w-14 rounded-full bg-white/80 backdrop-blur-md
            border border-white/70 flex items-center justify-center transition
            hover:border-white/80
          "
          aria-label="Memórias"
          whileTap={{ scale: 0.96 }}
        >
          <BookOpen size={22} className="text-gray-700" />
        </motion.button>

        <motion.button
          onClick={toggleRecording}
          disabled={UNDER_CONSTRUCTION || isProcessing}
          className={`
            h-16 w-16 rounded-full
            ${UNDER_CONSTRUCTION ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
            bg-white/90 backdrop-blur-md border border-white/80
            flex items-center justify-center transition
            hover:border-white/90
          `}
          aria-label={isListening ? "Parar gravação" : "Iniciar gravação"}
          whileTap={!UNDER_CONSTRUCTION ? { scale: 0.95 } : undefined}
        >
          {isProcessing ? (
            <Loader className="animate-spin text-gray-700" size={24} />
          ) : isListening ? (
            <StopCircle className="text-red-500" size={28} />
          ) : (
            <Mic className="text-gray-700" size={24} />
          )}
        </motion.button>

        <motion.button
          onClick={goToChatPage}
          className="
            h-14 w-14 rounded-full bg-white/80 backdrop-blur-md
            border border-white/70 flex items-center justify-center transition
            hover:border-white/80
          "
          aria-label="Voltar ao chat"
          whileTap={{ scale: 0.96 }}
        >
          <X size={22} className="text-gray-700" />
        </motion.button>
      </div>

      <div className="text-[11px] text-neutral-400">
        Eco Voz – prévia de design
      </div>
    </motion.div>
  );
};

export default VoicePage;
