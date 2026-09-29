import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ReinoChegada from '@/components/reino/ReinoChegada';
import { Astro, ReinoScene, type ReinoCrop } from '@/components/reino/ReinoScene';
import { getReinoMood, type ReinoMood } from '@/components/reino/reinoMood';
import { OFFER, PRICE } from '@/constants/offerCopy';
import { trackLandingCta, type LandingSection } from '@/components/landing/trackLandingCta';
import mixpanel from '@/lib/mixpanel';
import '@/components/reino/reino.css';
import './reino-landing.css';

/**
 * Molde das landings no reino. Cada landing é uma configuração (textos, pintura,
 * dores, o que tem dentro, passos, perguntas); as peças e a ordem são as mesmas,
 * pensadas para conversão: promessa, para quem é, o que tem, como funciona,
 * preço real, dúvidas, fechamento. Nada de número ou depoimento sem fonte.
 */

export type Plano = 'monthly' | 'annual';

export interface ItemTexto {
  titulo: string;
  texto: string;
}

export interface LandingConfig {
  /** slug da prop `pagina` do "Landing · Vista" (mesmo do trackLandingCta) */
  pagina: string;
  /** prefixo do ?from= de cada botão (ex.: "eco_ia" vira from=eco_ia_hero) */
  from: string;
  /** plano que os botões abrem no /assinar */
  plano?: Plano;
  /** humor fixo (ex.: o sono é sempre noite); sem ele, segue a hora */
  mood?: ReinoMood;
  /** pintura da chegada; sem ela, a da hora */
  imagem?: { src: string; foco?: string };
  rotulo: string;
  titulo: string;
  sobre: string;
  /** três fatos curtos sob a promessa */
  destaques?: string[];
  cta?: string;
  dores?: { titulo: string; itens: ItemTexto[] };
  dentro?: { rotulo?: string; titulo: string; sobre?: string; itens: (ItemTexto & { imagem?: string; meta?: string })[] };
  /** mostra as 5 áreas do app com as pinturas (a landing principal e as de módulo) */
  regioes?: boolean;
  passos?: { titulo: string; itens: ItemTexto[] };
  citacao?: { texto: string; autor: string };
  /** blocos próprios da página, entre "como funciona" e o preço */
  extra?: ReactNode;
  /** aviso de cuidado (ex.: a Eco não substitui terapia) */
  aviso?: ReactNode;
  faq: { p: string; r: ReactNode }[];
  fechamento: { titulo: string; sobre: string };
}

const REGIOES: { titulo: string; lugar: string; texto: string; crop: ReinoCrop }[] = [
  { titulo: 'Conversar com a Eco', lugar: 'Casa da Eco', texto: 'Uma conversa para organizar o que você sente, a qualquer hora.', crop: [0, 190, 460, 460] },
  { titulo: 'Dormir melhor', lugar: 'Vale do Sono', texto: 'Um protocolo de 7 noites, meditações e sons para desacelerar.', crop: [430, 190, 460, 460] },
  { titulo: 'Entender um sonho', lugar: 'Lago dos Sonhos', texto: 'Conte um sonho e receba uma leitura inspirada em Freud e Jung.', crop: [880, 190, 460, 460] },
  { titulo: 'Programas guiados', lugar: 'As Trilhas', texto: 'Meditações e programas de vários dias, um passo por vez.', crop: [1300, 190, 460, 460] },
  { titulo: 'Reflexão do dia', lugar: 'O Pórtico', texto: 'O Diário Estoico: uma lição curta para cada dia do ano.', crop: [1712, 190, 460, 460] },
];

const CENA: Record<ReinoMood, { src: string; foco: string }> = {
  amanhecer: { src: '/images/reino/portico.webp', foco: '85% 50%' },
  entardecer: { src: '/images/reino/casa.webp', foco: '15% 50%' },
  noite: { src: '/images/reino/vale.webp', foco: '45% 50%' },
};

// 4 itens em 4 colunas, 5 em 5; o resto em 3 (6 vira 3 + 3): nunca sobra um item sozinho.
const colunasPara = (n: number) => (n === 4 ? 4 : n === 5 ? 5 : 3);

const precoDoPlano =(plano: Plano) => (plano === 'annual' ? 'R$ 142,80/ano' : OFFER.priceMonthly);

export default function ReinoLanding({ config }: { config: LandingConfig }) {
  const mood = config.mood ?? getReinoMood();
  const cena = config.imagem ?? CENA[mood];
  const [plano, setPlano] = useState<Plano>(config.plano ?? 'monthly');
  const chegadaRef = useRef<HTMLDivElement>(null);
  const [mostrarBarra, setMostrarBarra] = useState(false);

  useEffect(() => {
    try {
      mixpanel.track('Landing · Vista', { pagina: config.pagina });
    } catch {
      // medir nunca quebra a página
    }
  }, [config.pagina]);

  // Barra fixa do celular: aparece quando a promessa sai da tela.
  useEffect(() => {
    const alvo = chegadaRef.current;
    if (!alvo || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setMostrarBarra(!e.isIntersecting), { threshold: 0 });
    io.observe(alvo);
    return () => io.disconnect();
  }, []);

  const href = (posicao: string, p: Plano = plano) => `/assinar?step=plan&plan=${p}&from=${config.from}_${posicao}`;
  const medir = (section: LandingSection, posicao: string, p: Plano = plano) =>
    trackLandingCta({ section, plan: p, from: `${config.from}_${posicao}` });
  const cta = config.cta ?? OFFER.ctaStartTrial;

  const Botao = ({ section, posicao, texto = cta }: { section: LandingSection; posicao: string; texto?: string }) => (
    <Link to={href(posicao)} className="reino-placa" onClick={() => medir(section, posicao)}>
      {texto} <span aria-hidden="true">→</span>
    </Link>
  );

  return (
    <div className="rl" data-mood={mood}>
      {/* ── Topo ── */}
      <header className="rl-topo" data-mood={mood}>
        <Link to="/" className="rl-topo__marca">
          <Astro className="rl-topo__astro" mood={mood} />
          Ecotopia
        </Link>
        <nav className="rl-topo__nav" aria-label="Principal">
          <a href="#o-que-tem">O que tem</a>
          <a href="#preco">Preço</a>
          <Link to="/login">Entrar</Link>
        </nav>
        <Link to={href('topo')} className="rl-topo__cta" onClick={() => medir('topbar', 'topo')}>
          Começar grátis
        </Link>
      </header>

      {/* ── Chegada: a promessa ── */}
      <div ref={chegadaRef}>
        <ReinoChegada mood={mood} imagem={cena.src} foco={cena.foco} lugar={config.rotulo} titulo={config.titulo} sobre={config.sobre}>
          <Botao section="hero" posicao="hero" />
          <p className="rl-oferta-linha">{OFFER.trialAfterPrice}. Cancele quando quiser.</p>
          {config.destaques && (
            <ul className="rl-destaques">
              {config.destaques.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </ReinoChegada>
      </div>

      <main className="reino-corpo rl-corpo">
        {/* ── Para quem é ── */}
        {config.dores && (
          <section className="rl-secao" aria-labelledby="rl-dores">
            <h2 id="rl-dores" className="rl-titulo">
              {config.dores.titulo}
            </h2>
            <ul className="rl-dores">
              {config.dores.itens.map((d) => (
                <li key={d.titulo}>
                  <span className="rl-dores__titulo">{d.titulo}</span>
                  <span className="rl-dores__texto">{d.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── O que tem dentro ── */}
        {config.dentro && (
          <section className="rl-secao" id="o-que-tem" aria-labelledby="rl-dentro">
            {config.dentro.rotulo && <p className="reino-rotulo">{config.dentro.rotulo}</p>}
            <h2 id="rl-dentro" className="rl-titulo">
              {config.dentro.titulo}
            </h2>
            {config.dentro.sobre && <p className="rl-sobre">{config.dentro.sobre}</p>}
            <ul
              className="rl-dentro"
              style={{ '--rl-cols': colunasPara(config.dentro.itens.length) } as CSSProperties}
            >
              {config.dentro.itens.map((item, i) => (
                <li key={item.titulo}>
                  {item.imagem && (
                    <img src={item.imagem} alt="" loading="lazy" className={i % 2 ? 'reino-rasgo-b' : 'reino-rasgo-a'} />
                  )}
                  {item.meta && <span className="rl-dentro__meta">{item.meta}</span>}
                  <span className="rl-dentro__titulo">{item.titulo}</span>
                  <span className="rl-dentro__texto">{item.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {config.regioes && (
          <section className="rl-secao" id={config.dentro ? undefined : 'o-que-tem'} aria-labelledby="rl-regioes">
            <p className="reino-rotulo">Tudo o que tem no Ecotopia</p>
            <h2 id="rl-regioes" className="rl-titulo">
              Cinco lugares, um para cada parte do seu dia
            </h2>
            <ul className="rl-regioes">
              {REGIOES.map((r, i) => (
                <li key={r.lugar}>
                  <ReinoScene crop={r.crop} small className={i % 2 ? 'reino-rasgo-b' : 'reino-rasgo-a'} />
                  <span className="rl-regioes__titulo">{r.titulo}</span>
                  <span className="rl-regioes__lugar">{r.lugar}</span>
                  <span className="rl-regioes__texto">{r.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Como funciona (uma sequência de verdade, por isso numerada) ── */}
        {config.passos && (
          <section className="rl-secao" aria-labelledby="rl-passos">
            <h2 id="rl-passos" className="rl-titulo">
              {config.passos.titulo}
            </h2>
            <ol className="rl-passos">
              {config.passos.itens.map((p, i) => (
                <li key={p.titulo}>
                  <span className="rl-passos__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="rl-passos__titulo">{p.titulo}</span>
                  <span className="rl-passos__texto">{p.texto}</span>
                </li>
              ))}
            </ol>
            <Botao section="hero" posicao="passos" />
          </section>
        )}

        {config.citacao && (
          <figure className="rl-secao rl-citacao">
            <blockquote>{config.citacao.texto}</blockquote>
            <figcaption>{config.citacao.autor}</figcaption>
          </figure>
        )}

        {config.extra}

        {/* ── Preço real, do mesmo arquivo do /assinar ── */}
        <section className="rl-secao rl-preco" id="preco" aria-labelledby="rl-preco">
          <p className="reino-rotulo">{OFFER.trial}</p>
          <h2 id="rl-preco" className="rl-titulo">
            Experimente tudo por 7 dias, sem pagar nada
          </h2>
          <p className="rl-sobre">
            O cartão é pedido no cadastro e a primeira cobrança só acontece depois dos 7 dias. Se não fizer sentido,
            cancele antes e não paga nada.
          </p>
          <div className="rl-planos" role="radiogroup" aria-label="Escolha o plano">
            {(
              [
                { id: 'monthly', nome: 'Mensal', preco: OFFER.priceMonthly, nota: 'Renova todo mês.' },
                {
                  id: 'annual',
                  nome: 'Anual',
                  preco: OFFER.priceAnnualMonthly,
                  nota: `R$ 142,80 por ano. Economize R$ ${(PRICE.monthly * 12 - PRICE.annualTotal).toFixed(0)}.`,
                },
              ] as { id: Plano; nome: string; preco: string; nota: string }[]
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={plano === p.id}
                className={`rl-plano${plano === p.id ? ' is-ativo' : ''}`}
                onClick={() => setPlano(p.id)}
              >
                <span className="rl-plano__nome">{p.nome}</span>
                <span className="rl-plano__preco">{p.preco}</span>
                <span className="rl-plano__nota">{p.nota}</span>
              </button>
            ))}
          </div>
          <Botao section="pricing" posicao="preco" />
          <p className="rl-miudo">
            {OFFER.trial}, depois {precoDoPlano(plano)}.{' '}
            <Link to="/cancelar-assinatura">Como cancelar</Link>
          </p>
        </section>

        {config.aviso && <div className="rl-secao reino-nota">{config.aviso}</div>}

        {/* ── Dúvidas ── */}
        <section className="rl-secao" aria-labelledby="rl-faq">
          <h2 id="rl-faq" className="rl-titulo">
            Perguntas frequentes
          </h2>
          <div className="rl-faq">
            {config.faq.map((f) => (
              <details key={f.p}>
                <summary>{f.p}</summary>
                <div className="rl-faq__r">{f.r}</div>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* ── Fechamento ── */}
      <section className="reino-hero rl-fechamento" data-mood={mood} aria-labelledby="rl-fechamento">
        <div className="rl-fechamento__miolo">
          <h2 id="rl-fechamento" className="reino-hero__ola">
            {config.fechamento.titulo}
          </h2>
          <p className="reino-hero__pergunta">{config.fechamento.sobre}</p>
          <Botao section="fechamento" posicao="fechamento" />
          <p className="rl-oferta-linha">{OFFER.trialAfterPrice}. Cancele quando quiser.</p>
        </div>
      </section>

      <footer className="reino-corpo rl-rodape">
        <div className="rl-rodape__colunas">
          <div>
            <p className="reino-rotulo">Ecotopia</p>
            <Link to="/">Início</Link>
            <Link to="/precos">Preço</Link>
            <Link to="/login">Entrar</Link>
          </div>
          <div>
            <p className="reino-rotulo">O que tem</p>
            <Link to="/eco-ia">Conversar com a Eco</Link>
            <Link to="/sono">Dormir melhor</Link>
            <Link to="/meditacao">Meditação</Link>
            <Link to="/estoicismo">Diário Estoico</Link>
            <Link to="/disciplina">5 Anéis da Disciplina</Link>
            <Link to="/dr-joe-dispenza">Dr. Joe Dispenza</Link>
            <Link to="/ansiedade">Ansiedade</Link>
          </div>
          <div>
            <p className="reino-rotulo">Assinatura</p>
            <Link to={href('rodape')} onClick={() => medir('fechamento', 'rodape')}>
              Começar 7 dias gratuitos
            </Link>
            <Link to="/cancelar-assinatura">Como cancelar</Link>
            <Link to="/termos">Termos de uso</Link>
            <Link to="/privacidade">Política de privacidade</Link>
          </div>
        </div>
        <p className="rl-rodape__fim">© 2026 Ecotopia</p>
      </footer>

      {/* ── Barra fixa do celular ── */}
      <div className={`rl-barra${mostrarBarra ? ' is-visivel' : ''}`} aria-hidden={!mostrarBarra}>
        <span className="rl-barra__texto">{OFFER.trialAfterPrice}</span>
        <Link
          to={href('barra')}
          className="rl-barra__cta"
          tabIndex={mostrarBarra ? 0 : -1}
          onClick={() => medir('sticky', 'barra')}
        >
          Começar
        </Link>
      </div>
    </div>
  );
}
