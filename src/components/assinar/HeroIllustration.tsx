/**
 * Faixa do topo da tela de assinatura — mascote 3D da Ecotopia com touca de
 * dormir, em céu noturno (continuidade da promessa de sono do funil /sono).
 * Banner landscape (1847x852, ~2.2:1) exibido inteiro, sem corte.
 */
export function HeroIllustration() {
  return (
    <div className="w-full overflow-hidden rounded-2xl">
      <img
        src="/images/assinar-hero-noite.webp"
        alt=""
        aria-hidden
        className="block h-auto w-full"
      />
    </div>
  );
}
