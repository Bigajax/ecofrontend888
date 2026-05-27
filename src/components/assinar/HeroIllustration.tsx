/**
 * Faixa do topo da tela de assinatura — mascote 3D da Ecotopia.
 * Banner landscape baixo (estilo Headspace): altura fixa + object-cover.
 */
export function HeroIllustration() {
  return (
    <div className="h-[150px] w-full overflow-hidden rounded-2xl sm:h-[170px]">
      <img
        src="/images/assinar-hero.png"
        alt=""
        aria-hidden
        className="h-full w-full object-cover"
        style={{ objectPosition: "center 42%" }}
      />
    </div>
  );
}
