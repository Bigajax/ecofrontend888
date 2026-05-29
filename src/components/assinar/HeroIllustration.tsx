/**
 * Faixa do topo da tela de assinatura — mascote 3D da Ecotopia.
 * Banner landscape (1902x827, ~2.3:1) exibido inteiro, sem corte.
 */
export function HeroIllustration() {
  return (
    <div className="w-full overflow-hidden rounded-2xl">
      <img
        src="/images/assinar-hero.webp"
        alt=""
        aria-hidden
        className="block h-auto w-full"
      />
    </div>
  );
}
