/**
 * Ilustração do topo da tela de assinatura — mascote 3D da Ecotopia.
 */
export function HeroIllustration() {
  return (
    <div className="w-full overflow-hidden rounded-2xl">
      <img
        src="/images/assinar-hero.png"
        alt=""
        aria-hidden
        className="block h-auto w-full object-cover"
      />
    </div>
  );
}
