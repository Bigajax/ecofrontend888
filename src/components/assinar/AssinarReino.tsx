import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import ReinoChegada from "@/components/reino/ReinoChegada";
import { getReinoMood } from "@/components/reino/reinoMood";
import { LEGAL_LINKS } from "./goalsData";
import { OFFER } from "@/constants/offerCopy";
import type { PlanId } from "./types";
import "@/components/reino/reino.css";

/**
 * O /assinar no reino: plano, cadastro e cartão como continuação do reino
 * (pintura, papel, placa de caminho). Vale para quem já está no app e para
 * quem chega das landings (set/2026: a versão azul saiu junto com as landings
 * antigas). Só apresentação; plano, cartão e eventos seguem na AssinarPage.
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
  /** "Voltar ao reino" para quem está no app; "Voltar" para quem veio de uma landing */
  voltarRotulo?: string;
}

export function PlanoReino({ plan, onSelectPlan, onContinue, onVoltar, voltarRotulo = "Voltar ao reino" }: PlanoReinoProps) {
  return (
    <div className="reino-assinar">
      <ReinoChegada
        mood={getReinoMood()}
        imagem={IMAGEM}
        foco="50% 60%"
        lugar="Ecotopia"
        titulo="Abra todas as portas"
        sobre="Sete dias com tudo aberto. Nada é cobrado hoje."
        voltar={{ rotulo: voltarRotulo, onClick: onVoltar }}
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
        <h2 id="assinar-caminho" className="reino-corpo__titulo reino-assinar__titulo">
          Como correm os 7 dias
        </h2>
        <ol className="reino-assinar__caminho">
          <Marco quando="Hoje" titulo="Tudo se abre">
            A Eco, o Protocolo do Sono, as meditações e o Diário.
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

interface CadastroReinoProps {
  onVoltar: () => void;
  children: ReactNode;
}

/** O cadastro do funil: a mesma chegada, com o formulário na folha. */
export function CadastroReino({ onVoltar, children }: CadastroReinoProps) {
  return (
    <div className="reino-assinar">
      <ReinoChegada
        mood={getReinoMood()}
        imagem={IMAGEM}
        foco="50% 60%"
        lugar="Ecotopia"
        titulo="Crie a sua conta"
        sobre="Depois vem o cartão. Nada é cobrado hoje."
        voltar={{ rotulo: "Trocar o plano", onClick: onVoltar }}
      >
        {/* o formulário fica na chegada, ao lado da pintura: sem rolar para achar os campos */}
        <div className="reino-assinar__cadastro">{children}</div>
      </ReinoChegada>
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
        lugar="Ecotopia"
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
        {/* o cartão fica na chegada, ao lado da pintura: o último passo não se esconde abaixo da dobra */}
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
      </ReinoChegada>

      <RodapeReino />
    </div>
  );
}
