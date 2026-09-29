import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import ReinoChegada from "@/components/reino/ReinoChegada";
import { getReinoMood } from "@/components/reino/reinoMood";
import { LEGAL_LINKS } from "./goalsData";
import { OFFER } from "@/constants/offerCopy";
import type { PlanId } from "./types";
import "@/components/reino/reino.css";

/**
 * O /assinar de quem já está dentro do app: a mesma assinatura, contada como
 * continuação do reino (pintura, papel, placa de caminho) e não como a página
 * azul das landings. Só apresentação; plano, cartão e eventos seguem na
 * AssinarPage. Visitante vindo de fora continua vendo a versão das landings.
 */

const IMAGEM = "/images/reino/panorama-1200.webp";

const PLANOS: { id: PlanId; nome: string; preco: string; nota?: string }[] = [
  { id: "monthly", nome: "Mensal", preco: OFFER.priceMonthly },
  { id: "annual", nome: "Anual", preco: OFFER.priceAnnualMonthly, nota: "R$ 142,80 por ano, economize 25%" },
];

const cobranca = (plan: PlanId) =>
  plan === "monthly"
    ? "Começa a mensalidade de R$ 15,90. Cancele antes e não paga nada."
    : "Cobramos R$ 142,80 pelo primeiro ano. Cancele antes e não paga nada.";

function RodapeReino() {
  return (
    <footer className="reino-assinar__rodape">
      <span>© 2026 Ecotopia</span>
      <a href={LEGAL_LINKS.termos}>Termos</a>
      <a href={LEGAL_LINKS.privacidade}>Privacidade</a>
      <a href={LEGAL_LINKS.cookies}>Cookies</a>
      <Link to="/cancelar-assinatura">Como cancelar</Link>
    </footer>
  );
}

interface PlanoReinoProps {
  plan: PlanId;
  onSelectPlan: (plan: PlanId) => void;
  onContinue: () => void;
  onVoltar: () => void;
}

export function PlanoReino({ plan, onSelectPlan, onContinue, onVoltar }: PlanoReinoProps) {
  return (
    <div className="reino-assinar">
      <ReinoChegada
        mood={getReinoMood()}
        imagem={IMAGEM}
        foco="50% 60%"
        lugar="Ecotopia · o reino inteiro"
        titulo="Abra todas as portas"
        sobre="Sete dias com tudo aberto, sem pagar nada hoje. Se não fizer sentido, você cancela antes."
        voltar={{ rotulo: "Voltar ao reino", onClick: onVoltar }}
      >
        <div className="reino-assinar__planos" role="radiogroup" aria-label="Escolha o plano">
          {PLANOS.map((p) => {
            const ativo = p.id === plan;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                className={`reino-assinar__plano${ativo ? " is-ativo" : ""}`}
                onClick={() => onSelectPlan(p.id)}
              >
                <span className="reino-assinar__plano-nome">{p.nome}</span>
                <span className="reino-assinar__plano-preco">{p.preco}</span>
                {p.nota && <span className="reino-assinar__plano-nota">{p.nota}</span>}
              </button>
            );
          })}
        </div>
        <button type="button" className="reino-placa" onClick={onContinue}>
          Começar os 7 dias <span aria-hidden="true">→</span>
        </button>
        <p className="reino-assinar__miudo">
          {OFFER.trial}, depois {plan === "monthly" ? "R$ 15,90/mês" : "R$ 142,80/ano"}.{" "}
          <Link to="/cancelar-assinatura" target="_blank" rel="noopener noreferrer">
            Cancele quando quiser.
          </Link>
        </p>
      </ReinoChegada>

      <section className="reino-corpo reino-assinar__corpo" aria-labelledby="assinar-caminho">
        <p id="assinar-caminho" className="reino-rotulo">
          Como correm os 7 dias
        </p>
        <ol className="reino-assinar__caminho">
          <Marco quando="Hoje" titulo="Tudo se abre">
            O Protocolo do Sono completo, as meditações, os sons para dormir e a conversa com a Eco.
          </Marco>
          <Marco quando="Dia 5" titulo="Um lembrete">
            Mandamos um e-mail avisando que o teste está terminando.
          </Marco>
          <Marco quando="Dia 7" titulo="A primeira cobrança">
            {cobranca(plan)}
          </Marco>
        </ol>
      </section>

      <RodapeReino />
    </div>
  );
}

function Marco({ quando, titulo, children }: { quando: string; titulo: string; children: ReactNode }) {
  return (
    <li className="reino-assinar__marco">
      <span className="reino-assinar__quando">{quando}</span>
      <span className="reino-assinar__marco-texto">
        <span className="reino-assinar__marco-titulo">{titulo}</span>
        <span className="reino-assinar__marco-sobre">{children}</span>
      </span>
    </li>
  );
}

interface CartaoReinoProps {
  plan: PlanId;
  onTrocarPlano: () => void;
  /** o brick do cartão, montado pela AssinarPage (props estáveis) */
  formulario: ReactNode;
  processando: boolean;
  erro: string | null;
}

export function CartaoReino({ plan, onTrocarPlano, formulario, processando, erro }: CartaoReinoProps) {
  return (
    <div className="reino-assinar">
      <ReinoChegada
        mood={getReinoMood()}
        imagem={IMAGEM}
        foco="50% 60%"
        lugar="Ecotopia · o reino inteiro"
        titulo="Confirme seu teste"
        sobre="Nada é cobrado hoje. A primeira cobrança só vem no sétimo dia."
        voltar={{ rotulo: "Trocar o plano", onClick: onTrocarPlano }}
      >
        <dl className="reino-assinar__resumo">
          <div>
            <dt>Plano</dt>
            <dd>{plan === "monthly" ? "Mensal, R$ 15,90/mês" : "Anual, R$ 142,80/ano"}</dd>
          </div>
          <div>
            <dt>Hoje</dt>
            <dd>R$ 0,00 por 7 dias</dd>
          </div>
        </dl>
      </ReinoChegada>

      <section className="reino-corpo reino-assinar__corpo" aria-labelledby="assinar-cartao">
        <p id="assinar-cartao" className="reino-rotulo">
          Último passo
        </p>
        <div className="reino-assinar__cartao">{formulario}</div>
        {processando && (
          <p aria-live="polite" className="reino-assinar__miudo">
            Processando…
          </p>
        )}
        {erro && (
          <p role="alert" className="reino-assinar__erro">
            {erro}
          </p>
        )}
        <p className="reino-assinar__miudo">
          Lembrete por e-mail antes de qualquer cobrança.{" "}
          <Link to="/cancelar-assinatura" target="_blank" rel="noopener noreferrer">
            Cancele a qualquer momento.
          </Link>
        </p>
      </section>

      <RodapeReino />
    </div>
  );
}
