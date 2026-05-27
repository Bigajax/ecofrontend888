/**
 * Ilustração do topo da tela de assinatura — céu calmo da Ecotopia.
 * CSS puro: gradiente baby-blue → sol/orbe suave + nuvens + estrelas.
 * Respeita prefers-reduced-motion (sem animação essencial).
 */
export function HeroIllustration() {
  return (
    <div
      aria-hidden
      className="relative h-[150px] w-full overflow-hidden rounded-2xl"
      style={{ background: "linear-gradient(to bottom, #6EC8FF 0%, #9BD8FF 52%, #F3EEE7 100%)" }}
    >
      {/* estrelas */}
      <span className="absolute h-[5px] w-[5px] rounded-full bg-white" style={{ top: 26, left: 64, opacity: 0.9 }} />
      <span className="absolute h-[4px] w-[4px] rounded-full bg-white" style={{ top: 42, right: 74, opacity: 0.8 }} />
      <span className="absolute h-[5px] w-[5px] rounded-full bg-white" style={{ top: 20, right: 44, opacity: 0.85 }} />

      {/* sol/orbe da Ecotopia com rostinho calmo */}
      <div
        className="absolute left-1/2 bottom-[26px] h-[80px] w-[80px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle at 32% 30%, #FFFFFF 0%, #6EC8FF 42%, #36A8E8 100%)", boxShadow: "0 8px 28px rgba(54,168,232,0.35)" }}
      >
        {/* olhos */}
        <span className="absolute h-[7px] w-[14px] rounded-b-full border-2 border-t-0" style={{ top: 32, left: 18, borderColor: "#0D3461" }} />
        <span className="absolute h-[7px] w-[14px] rounded-b-full border-2 border-t-0" style={{ top: 32, right: 18, borderColor: "#0D3461" }} />
      </div>

      {/* nuvens */}
      <span className="absolute bottom-0 -left-5 h-[40px] w-[120px] bg-white" style={{ borderRadius: "50% 50% 0 0" }} />
      <span className="absolute bottom-0 -right-7 h-[50px] w-[140px] bg-white" style={{ borderRadius: "50% 50% 0 0" }} />
    </div>
  );
}
