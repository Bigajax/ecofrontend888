import { Link } from 'react-router-dom';

interface SonoStickyCtaProps {
  /** Destino — mesmo do CTA do herói (resolvido por `sonoCtaTo`). */
  to: string;
  /** Label — mesmo do CTA do herói (`hero.cta`). */
  label: string;
  /** Tracking do clique — mesmo handler dos demais CTAs (`sonoCtaClick`). */
  onClick: () => void;
  /** Visível quando o usuário passou do herói e ainda não chegou na oferta. */
  visible: boolean;
  /** Variante deite_se: barra fosca navy + botão de vidro (herói noturno). */
  night: boolean;
}

/**
 * CTA fixo no rodapé da viewport da landing /sono. Surge quando o CTA do herói
 * sai da tela e some quando herói ou oferta voltam a aparecer — mantendo uma
 * ação à mão no meio do scroll. Reusa a classe visual do CTA do herói
 * (`lp-sono-hero-cta-primary`) pra garantir mesmo label e mesma cor.
 *
 * `position: fixed` → fora do fluxo, sem layout shift (CLS). Quando escondido,
 * fica inerte (sem foco/clique) via `pointer-events:none` + `aria-hidden`.
 */
export default function SonoStickyCta({
  to,
  label,
  onClick,
  visible,
  night,
}: SonoStickyCtaProps) {
  return (
    <div
      className={`lp-sono-sticky-bar${night ? ' lp-sono-sticky-bar--night' : ''}`}
      data-visible={visible}
      aria-hidden={!visible}
    >
      <Link
        to={to}
        className="lp-sono-hero-cta-primary lp-sono-sticky-cta"
        onClick={onClick}
        tabIndex={visible ? undefined : -1}
      >
        {night && (
          <svg className="lp-sono-cta-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        {label}
      </Link>
    </div>
  );
}
