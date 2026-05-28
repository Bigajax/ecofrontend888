// src/components/assinar/LegalFooter.tsx

import { LEGAL_LINKS } from "./goalsData";

export function LegalFooter() {
  return (
    <footer className="mt-12 w-full" style={{ background: "#1A2330", color: "rgba(255,255,255,0.72)" }}>
      <div className="mx-auto w-full max-w-[420px] px-5 py-6 text-[12px]">
        <p className="text-center text-[12px]">© 2026 Ecotopia Inc.</p>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <a href={LEGAL_LINKS.termos} className="underline-offset-2 hover:underline">Termos e condições</a>
          <a href={LEGAL_LINKS.privacidade} className="underline-offset-2 hover:underline">Política de Privacidade</a>
          <a href={LEGAL_LINKS.cookies} className="underline-offset-2 hover:underline">Política de cookies</a>
          <a href={LEGAL_LINKS.opcoesPrivacidade} className="underline-offset-2 hover:underline">Suas opções de privacidade</a>
          <a href={LEGAL_LINKS.avisoCalifornia} className="underline-offset-2 hover:underline">Aviso de Privacidade da Califórnia</a>
          <a href={LEGAL_LINKS.dadosSaude} className="underline-offset-2 hover:underline">Dados de saúde do consumidor</a>
        </div>
      </div>
    </footer>
  );
}
