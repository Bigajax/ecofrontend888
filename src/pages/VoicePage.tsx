import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, StopCircle, Loader, BookOpen, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sendVoiceMessage } from "../api/voiceApi";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

/** Mude para false quando quiser liberar a gravação */
const UNDER_CONSTRUCTION = true;

const VoicePage: React.FC = () => {
  const { userName, userId } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ecoAudioURL, setEcoAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const goToMemoryPage = () => navigate("/memory");
  const goToChatPage = () => navigate("/chat");

  const handleError = (msg: string) => {
    setError(msg);
    setIsListening(false);
    setIsProcessing(false);
    setEcoAudioURL(null);
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
        setEcoAudioURL(null);

        try {
          const session = await supabase.auth.getSession();
          const accessToken = session.data.session?.access_token;
          const response = await sendVoiceMessage(audioBlob, [], userName, userId, accessToken);

          const ecoTextoLimpo = response.ecoText?.replace(/\{[\s\S]*?\}$/, "").trim();
          console.log("[🧠 Eco disse]:", ecoTextoLimpo);

          const audioURL = URL.createObjectURL(response.audioBlob);
          setEcoAudioURL(audioURL);
          const ecoAudio = new Audio(audioURL);
          await ecoAudio.play();
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
        <span className="px-3 py-1.5 rounded-full border border-black/10 bg-white/80 text-neutral-700 text-sm font-medium shadow-sm">
          Em construção
        </span>
      </div>

      {/* Orb central com anéis — estilo Apple */}
      <div className="mt-10 mb-10 relative">
        {/* anel externo suave */}
        <motion.div
          className="absolute inset-[-28px] rounded-full bg-white/30 blur-2xl"
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* orb */}
        <motion.div
          className="
            relative w-[260px] h-[260px] rounded-full
            bg-white/65 backdrop-blur-xl
            border border-white/60
            shadow-[0_40px_70px_-20px_rgba(16,24,40,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]
          "
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        {/* ring pulsante */}
        <motion.div
          className="absolute inset-0 rounded-full ring-2 ring-white/60"
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.25, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
      </div>

      {/* Mensagem/erro sutil */}
      {error && (
        <div className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm mb-6 text-center max-w-md shadow-sm">
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
            border border-white/70 shadow-md hover:shadow-lg
            flex items-center justify-center transition
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
            shadow-lg hover:shadow-xl flex items-center justify-center transition
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
            border border-white/70 shadow-md hover:shadow-lg
            flex items-center justify-center transition
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
