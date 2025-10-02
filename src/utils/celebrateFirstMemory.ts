// src/utils/celebrateFirstMemory.ts
import confetti from "canvas-confetti";

export function celebrateFirstMemory() {
  confetti({ particleCount: 180, spread: 110, startVelocity: 35, scalar: 0.9, ticks: 200, origin: { y: 0.6 } });
  // Se você usa um Toast global:
  const evt = new CustomEvent("toast", {
    detail: {
      title: "🎇 1ª memória emocional salva!",
      description: "Agora você pode consultá-la no seu painel de memórias."
    }
  });
  window.dispatchEvent(evt);
}
