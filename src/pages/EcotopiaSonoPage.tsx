import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ReinoChegada from '@/components/reino/ReinoChegada';
import { Astro } from '@/components/reino/ReinoScene';
import { supabase } from '@/lib/supabaseClient';
import { useSonoHeroVariant } from '@/hooks/useSonoHeroVariant';
import { useSonoSectionInView } from '@/hooks/useSonoSectionInView';
import { useStickyCtaVisibility } from '@/hooks/useStickyCtaVisibility';
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import {
  trackLandingVista,
  trackCtaClicado,
  trackAmostraAudioTocada,
  trackAmostraAudioConcluida,
} from '@/lib/mixpanelAssinarFunnel';
import { fbq, fbqCustom } from '@/lib/fbpixel';
import { SONO_PIX_PRICE_LABEL } from '@/constants/offerCopy';
import '@/components/reino/reino.css';
import '@/components/reino-landing/reino-landing.css';

/**
 * /sono: o Vale do Sono. Uma oferta só, a que existe de verdade: a Noite 1 é
 * grátis e as 7 noites saem por um Pix único (sem assinatura). Todo botão leva
 * à experiência (/sono/experiencia), que é onde o funil acontece.
 *
 * Preservado do funil: variantes do herói por ?hero= (useSonoHeroVariant),
 * "Funil Sono · Landing vista" + ViewContent, "CTA clicado" + SonoCtaClique com
 * os mesmos `source` de antes, posicao heroi/sticky/rodape, barra fixa, amostra
 * de 30s da Noite 1, "Seção vista" e a prova social real (rpc, piso de 25).
 * Saiu o que não tinha fonte: "846 pessoas", "4,9★", "32% menos estresse",
 * depoimentos, "devolvemos em até 7 dias" e a copy de trial de assinatura.
 */

const NOITE_1 = PROTOCOL_NIGHTS[0];
const REPASSAR = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

export default function EcotopiaSonoPage() {
  const hero = useSonoHeroVariant();
  const location = useLocation();

  // UTMs e fbclid seguem para a experiência (antes ficavam para trás).
  const repasse = useMemo(() => {
    const atual = new URLSearchParams(location.search);
    const saida = new URLSearchParams();
    for (const chave of REPASSAR) {
      const valor = atual.get(chave);
      if (valor) saida.set(chave, valor);
    }
    const s = saida.toString();
    return s ? `&${s}` : '';
  }, [location.search]);

  const ctaTo = (from: string) => `/sono/experiencia?source=${from}&play=1${repasse}`;
  const ctaClick = (from: string, posicao?: 'heroi' | 'sticky' | 'rodape') => () => {
    trackCtaClicado({ plan: 'monthly', placement: `${from}_experiencia`, posicao });
    try {
      fbqCustom('SonoCtaClique', { placement: from, plan: 'monthly', posicao });
    } catch {
      // o Pixel nunca trava a navegação
    }
  };

  // "Landing vista" e ViewContent uma vez por pageview (guarda contra o StrictMode).
  const vista = useRef(false);
  useEffect(() => {
    if (vista.current) return;
    vista.current = true;
    try {
      trackLandingVista();
    } catch {
      // noop
    }
    fbq('ViewContent', { content_name: 'Protocolo do Sono', content_category: 'sono' });
  }, []);

  // Prova social real: quantas pessoas concluíram a Noite 1 nos últimos 7 dias.
  const [prova, setProva] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.rpc('sono_social_proof_count');
        if (!error && typeof data === 'number') setProva(data);
      } catch {
        // sem o dado, sem a linha
      }
    })();
  }, []);

  // Amostra de 30s da Noite 1.
  const amostra = useAudioPreview(NOITE_1?.audioUrl ?? '', 30);
  const amostraTocada = useRef(false);
  const amostraConcluida = useRef(false);
  useEffect(() => {
    if (!amostra.done || amostraConcluida.current) return;
    amostraConcluida.current = true;
    try {
      trackAmostraAudioConcluida();
    } catch {
      // noop
    }
  }, [amostra.done]);
  const tocarAmostra = () => {
    if (!amostra.playing && !amostraTocada.current) {
      amostraTocada.current = true;
      try {
        trackAmostraAudioTocada();
      } catch {
        // noop
      }
    }
    amostra.toggle();
  };

  const heroCtaRef = useRef<HTMLAnchorElement>(null);
  const ofertaCtaRef = useRef<HTMLAnchorElement>(null);
  const mostrarBarra = useStickyCtaVisibility([heroCtaRef, ofertaCtaRef]);

  const comoUsarRef = useSonoSectionInView<HTMLElement>('como_usar');
  const noitesRef = useSonoSectionInView<HTMLElement>('sete_noites');
  const diferencialRef = useSonoSectionInView<HTMLElement>('diferencial');
  const ofertaRef = useSonoSectionInView<HTMLElement>('oferta_final');

  const titulo = `${hero.h1Line1 ? `${hero.h1Line1} ` : ''}${hero.h1Pre}${hero.h1Mark}${hero.h1Pos ?? ''}`;
  const mostraProva = prova !== null && prova >= 25;

  return (
    <div className="rl" data-mood="noite">
      <header className="rl-topo" data-mood="noite">
        <Link to="/" className="rl-topo__marca">
          <Astro className="rl-topo__astro" mood="noite" />
          Ecotopia
        </Link>
        <nav className="rl-topo__nav" aria-label="Principal">
          <a href="#como-usar">Como usar</a>
          <a href="#as-7-noites">As 7 noites</a>
          <Link to="/login">Entrar</Link>
        </nav>
        <Link to={ctaTo('sono_topbar')} className="rl-topo__cta" onClick={ctaClick('sono_topbar')}>
          Ouvir a Noite 1
        </Link>
      </header>

      <ReinoChegada
        mood="noite"
        imagem="/images/reino/vale.webp"
        foco="45% 50%"
        lugar="SOM.02 · Vale do Sono · Protocolo do Sono"
        titulo={titulo}
        sobre={hero.lead}
      >
        <Link ref={heroCtaRef} to={ctaTo('sono_hero')} className="reino-placa" onClick={ctaClick('sono_hero', 'heroi')}>
          {hero.cta} <span aria-hidden="true">→</span>
        </Link>
        <p className="rl-oferta-linha">
          Noite 1 grátis, sem cadastro. Depois, as 7 noites por {SONO_PIX_PRICE_LABEL} no Pix: pagamento único, sem
          assinatura.
        </p>
        {mostraProva && <p className="rl-sono-prova">{prova} pessoas concluíram a Noite 1 nos últimos 7 dias.</p>}
      </ReinoChegada>

      <main className="reino-corpo rl-corpo">
        <section className="rl-secao" aria-labelledby="rl-cena">
          <h2 id="rl-cena" className="rl-titulo">
            Você conhece essa cena.
          </h2>
          <p className="rl-sobre">
            Você apaga a luz cansado. Mas, em vez de relaxar, a mente acelera: o que ficou pendente, o que vem amanhã,
            aquilo que você não devia ter dito.
          </p>
          <ul className="rl-dores">
            <li>
              <span className="rl-dores__titulo">Deito cansado, mas a mente não desliga.</span>
            </li>
            <li>
              <span className="rl-dores__titulo">Acordo no meio da noite e não volto a dormir.</span>
            </li>
            <li>
              <span className="rl-dores__titulo">Durmo, mas acordo como se não tivesse descansado.</span>
            </li>
            <li>
              <span className="rl-dores__titulo">Já tentei chá, melatonina, remédio. Resolve uma noite.</span>
            </li>
          </ul>
          <p className="rl-sono-virada">
            O problema não é o seu cansaço. É o estado de alerta que o corpo não aprendeu a desligar.
          </p>
        </section>

        <section className="rl-secao" id="como-usar" ref={comoUsarRef} aria-labelledby="rl-como">
          <h2 id="rl-como" className="rl-titulo">
            Como usar hoje à noite
          </h2>
          <ol className="rl-passos rl-passos--4">
            <li>
              <span className="rl-passos__n">01</span>
              <span className="rl-passos__titulo">Apague a luz</span>
              <span className="rl-passos__texto">Deite-se como já faria normalmente.</span>
            </li>
            <li>
              <span className="rl-passos__n">02</span>
              <span className="rl-passos__titulo">Coloque os fones</span>
              <span className="rl-passos__texto">A voz guia o corpo para sair do modo alerta.</span>
            </li>
            <li>
              <span className="rl-passos__n">03</span>
              <span className="rl-passos__titulo">Dê play na Noite 1</span>
              <span className="rl-passos__texto">Você só precisa ouvir. O resto a voz conduz.</span>
            </li>
            <li>
              <span className="rl-passos__n">04</span>
              <span className="rl-passos__titulo">Repita por 7 noites</span>
              <span className="rl-passos__texto">Cada noite prepara a próxima.</span>
            </li>
          </ol>

          <div className="rl-amostra">
            <button
              type="button"
              className="rl-amostra__play"
              onClick={tocarAmostra}
              aria-label={amostra.playing ? 'Pausar amostra' : 'Ouvir 30 segundos da Noite 1'}
            >
              {amostra.playing ? (
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path d="M11.2 8.6c.2 5 .1 10-.2 14.8M20.6 8.8c-.2 4.8 0 9.8.3 14.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 32 32" aria-hidden="true" className="is-play">
                  <path d="M11.4 7.8c5.4 2.4 10 5.3 13.4 8.3-3.6 2.8-8.3 5.8-13.3 8.2-.4-5.5-.5-11 0-16.5Z" />
                </svg>
              )}
            </button>
            <span className="rl-amostra__texto">
              <span className="rl-amostra__titulo">Ouça 30 segundos da Noite 1</span>
              <span className="rl-amostra__sub">
                {amostra.done
                  ? 'Essa voz conduz as 7 noites. A primeira é grátis.'
                  : amostra.playing
                    ? 'A voz que conduz você hoje à noite.'
                    : 'Aperte o play, de preferência com fones.'}
              </span>
              <span className="rl-amostra__barra" aria-hidden="true">
                <span style={{ width: `${Math.round(amostra.progress * 100)}%` }} />
              </span>
            </span>
          </div>
        </section>

        <section className="rl-secao" id="as-7-noites" ref={noitesRef} aria-labelledby="rl-noites">
          <p className="reino-rotulo">O protocolo</p>
          <h2 id="rl-noites" className="rl-titulo">
            Sete noites, uma sequência
          </h2>
          <p className="rl-sobre">
            Cada noite trabalha uma parte do estado de alerta: respiração, controle mental, tensão do corpo, pensamentos
            repetitivos e segurança interna.
          </p>
          <ol className="rl-noites">
            {PROTOCOL_NIGHTS.map((n) => (
              <li key={n.id}>
                <Link
                  to={ctaTo(`sono_protocolo_${n.id}`)}
                  onClick={ctaClick(`sono_protocolo_${n.id}`)}
                  className="rl-noites__item"
                >
                  <span className="rl-noites__n">Noite {n.night}</span>
                  <span className="rl-noites__texto">
                    <span className="rl-noites__titulo">{n.title}</span>
                    <span className="rl-noites__desc">{n.description}</span>
                  </span>
                  <span className="rl-noites__meta">{n.isFree ? `${n.duration} · grátis` : n.duration}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="rl-secao" ref={diferencialRef} aria-labelledby="rl-diferencial">
          <h2 id="rl-diferencial" className="rl-titulo">
            Não é uma biblioteca de meditações. É um caminho de 7 noites.
          </h2>
          <p className="rl-sobre">
            Quando você está exausto, a última coisa que precisa é escolher entre centenas de áudios. Aqui, a noite de
            hoje já está pronta.
          </p>
          <ul className="rl-dentro" style={{ '--rl-cols': 3 } as CSSProperties}>
            <li>
              <span className="rl-dentro__titulo">Você não escolhe o que fazer</span>
              <span className="rl-dentro__texto">A prática da noite já está pronta. É deitar, dar play e seguir a voz.</span>
            </li>
            <li>
              <span className="rl-dentro__titulo">Cada noite prepara a próxima</span>
              <span className="rl-dentro__texto">
                A sequência começa tirando o corpo do modo alerta e avança para pensamentos, tensão e sono profundo.
              </span>
            </li>
            <li>
              <span className="rl-dentro__titulo">Não depende de força de vontade</span>
              <span className="rl-dentro__texto">
                Feito para o momento em que você está cansado demais para pensar em técnica.
              </span>
            </li>
          </ul>
        </section>

        <section className="rl-secao rl-preco" ref={ofertaRef} aria-labelledby="rl-oferta">
          <p className="reino-rotulo">Como funciona o acesso</p>
          <h2 id="rl-oferta" className="rl-titulo">
            Comece pela Noite 1, grátis
          </h2>
          <p className="rl-sobre">
            Ouça a primeira noite agora, sem pagar e sem cadastro. Se fizer sentido, libere as 7 noites com um Pix.
          </p>
          <div className="rl-sono-oferta">
            <div className="rl-sono-oferta__preco">
              <span className="rl-plano__nome">As 7 noites</span>
              <span className="rl-sono-oferta__valor">{SONO_PIX_PRICE_LABEL}</span>
              <span className="rl-plano__nota">Pix, pagamento único. Sem assinatura e sem renovação.</span>
            </div>
            <ul className="rl-destaques">
              <li>As 7 noites em sequência, de 5 a 10 minutos cada.</li>
              <li>Feito para ouvir deitado, com fones.</li>
              <li>Sem remédio e sem precisar escolher meditações.</li>
              <li>A Noite 1 é grátis: você ouve antes de decidir.</li>
            </ul>
          </div>
          <Link
            ref={ofertaCtaRef}
            to={ctaTo('sono_oferta_cta')}
            className="reino-placa"
            onClick={ctaClick('sono_oferta_cta', 'rodape')}
          >
            Ouvir a Noite 1 grátis <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section className="rl-secao" aria-labelledby="rl-faq">
          <h2 id="rl-faq" className="rl-titulo">
            Perguntas frequentes
          </h2>
          <div className="rl-faq">
            {[
              ['Preciso saber meditar?', 'Não. As noites são feitas para você só ouvir e acompanhar a voz.'],
              ['Quanto tempo leva por noite?', 'Entre 5 e 10 minutos. A Noite 1 tem 10.'],
              ['E se eu dormir antes de acabar?', 'Tudo bem. A ideia é justamente ajudar o corpo a relaxar.'],
              [
                'É remédio ou tratamento?',
                'Não. É uma prática guiada de relaxamento. Se você já toma medicação para dormir, não pare nada por conta própria: converse com o seu médico.',
              ],
              [
                'Quanto custa?',
                `A Noite 1 é grátis. As 7 noites saem por ${SONO_PIX_PRICE_LABEL} no Pix, um pagamento único, sem assinatura e sem renovação.`,
              ],
              [
                'Preciso criar conta para começar?',
                'Não. Você ouve a Noite 1 direto. Ao liberar as 7 noites, você cria a conta para guardar o acesso.',
              ],
            ].map(([p, r]) => (
              <details key={p}>
                <summary>{p}</summary>
                <div className="rl-faq__r">{r}</div>
              </details>
            ))}
          </div>
        </section>

        <div className="rl-secao reino-nota">
          <p>
            O Protocolo do Sono é uma prática de relaxamento e não substitui acompanhamento médico. Em sofrimento intenso,
            ligue para o CVV no 188 (gratuito, 24 horas).
          </p>
        </div>
      </main>

      <section className="reino-hero rl-fechamento" data-mood="noite" aria-labelledby="rl-fechamento">
        <div className="rl-fechamento__miolo">
          <h2 id="rl-fechamento" className="reino-hero__ola">
            Deite-se hoje. A primeira noite é por nossa conta.
          </h2>
          <p className="reino-hero__pergunta">Dez minutos, fones e a luz apagada.</p>
          <Link to={ctaTo('sono_cta_mid')} className="reino-placa" onClick={ctaClick('sono_cta_mid')}>
            Ouvir a Noite 1 grátis <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <footer className="reino-corpo rl-rodape">
        <div className="rl-rodape__colunas">
          <div>
            <p className="reino-rotulo">Ecotopia</p>
            <Link to="/">Início</Link>
            <Link to="/login">Entrar</Link>
          </div>
          <div>
            <p className="reino-rotulo">O que tem</p>
            <Link to="/eco-ia">Conversar com a Eco</Link>
            <Link to="/meditacao">Meditação</Link>
            <Link to="/estoicismo">Diário Estoico</Link>
          </div>
          <div>
            <p className="reino-rotulo">Ajuda</p>
            <Link to="/cancelar-assinatura">Como cancelar</Link>
            <a href="tel:188">CVV 188</a>
          </div>
        </div>
        <p className="rl-rodape__fim">© 2026 Ecotopia</p>
      </footer>

      <div className={`rl-barra${mostrarBarra ? ' is-visivel' : ''}`} aria-hidden={!mostrarBarra}>
        <span className="rl-barra__texto">Noite 1 grátis · sem cadastro</span>
        <Link
          to={ctaTo('sono_sticky')}
          className="rl-barra__cta"
          tabIndex={mostrarBarra ? 0 : -1}
          onClick={ctaClick('sono_sticky', 'sticky')}
        >
          Ouvir agora
        </Link>
      </div>
    </div>
  );
}
