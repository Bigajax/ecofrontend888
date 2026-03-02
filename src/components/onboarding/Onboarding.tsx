import { useCallback, useMemo, useState } from "react";
import Slide from "./Slide";
import "../../styles/onboarding.css";

type SlideContent = {
  title: string;
  sub?: string;
  text: string;
  note?: string;
  chips?: string[];
  mini?: string;
  cta?: string;
  ctaMode?: "next" | "complete";
};

type OnboardingProps = {
  onComplete?: () => void;
};

const SLIDES: SlideContent[] = [
  {
    title: "A Eco é uma inteligência que reflete você.",
    sub: "Um espaço guiado de autoconhecimento.",
    text:
      "A Eco conversa com você, reconhece o que sente e transforma suas palavras em clareza emocional — com calma, privacidade e foco.",
    note: "Sem julgamentos. Só reflexão.",
    cta: "Começar agora →",
    ctaMode: "next",
  },
  {
    title: "Ela cria um espelho emocional.",
    text:
      "A cada conversa, a Eco registra padrões e emoções para você perceber mudanças ao longo do tempo. Quando algo é intenso, vira memória emocional. Depois, você vê isso em um mapa simples do seu crescimento.",
    chips: ["🧠 Memórias", "🌫️ Emoções", "📈 Evolução"],
  },
  {
    title: "Fale, escreva ou apenas sinta.",
    text:
      "Converse por texto ou voz. A Eco escuta e responde de forma calma e objetiva, ajudando a organizar o que está dentro. Tudo é privado e criptografado.",
    mini: "Texto · Voz · Pausa guiada",
    cta: "Entendi →",
    ctaMode: "complete",
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const totalSlides = SLIDES.length;

  const handleDotClick = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleAdvance = useCallback(() => {
    setActiveIndex((prev) => Math.min(prev + 1, totalSlides - 1));
  }, [totalSlides]);

  const handleCta = useCallback(() => {
    const { ctaMode } = SLIDES[activeIndex];

    if (ctaMode === "next") {
      handleAdvance();
      return;
    }

    if (ctaMode === "complete" && onComplete) {
      onComplete();
    }
  }, [activeIndex, handleAdvance, onComplete]);

  const slide = useMemo(() => SLIDES[activeIndex], [activeIndex]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <Slide {...slide} onCtaClick={slide.cta ? handleCta : undefined} />

      <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleDotClick(index)}
            aria-label={`Ir para slide ${index + 1}`}
            aria-current={index === activeIndex}
            className="onboarding-dot"
          />
        ))}
      </div>
    </div>
  );
}

export default Onboarding;
