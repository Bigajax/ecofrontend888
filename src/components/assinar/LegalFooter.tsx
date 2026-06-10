// src/components/assinar/LegalFooter.tsx

import { Link } from "react-router-dom";

import { LEGAL_LINKS } from "./goalsData";

export function LegalFooter() {
  return (
    <footer className="w-full" style={{ background: "#1A2330", color: "#FFFFFF" }}>
      {/* Faixa colorida estilo Headspace */}
      <div
        aria-hidden
        className="h-[6px] w-full"
        style={{
          background:
            "linear-gradient(90deg, #FFC2D1 0%, #FFD89E 25%, #FFE39A 50%, #BFE4FF 75%, #C5B6FF 100%)",
        }}
      />
      <div className="mx-auto w-full max-w-[420px] px-5 py-7 text-[13px] leading-snug">
        <p className="text-center text-[13px] font-medium" style={{ color: "#FFFFFF" }}>© 2026 Ecotopia Inc.</p>
        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
          <a href={LEGAL_LINKS.termos} className="underline-offset-2 hover:underline" style={{ color: "#FFFFFF" }}>Termos e condições</a>
          <a href={LEGAL_LINKS.privacidade} className="underline-offset-2 hover:underline" style={{ color: "#FFFFFF" }}>Política de Privacidade</a>
          <a href={LEGAL_LINKS.cookies} className="underline-offset-2 hover:underline" style={{ color: "#FFFFFF" }}>Política de cookies</a>
          <Link to="/cancelar-assinatura" className="underline-offset-2 hover:underline" style={{ color: "#FFFFFF" }}>Cancele a qualquer momento</Link>
        </div>
      </div>
    </footer>
  );
}
