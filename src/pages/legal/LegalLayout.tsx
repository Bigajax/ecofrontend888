import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Astro } from '@/components/reino/ReinoScene';
import { getReinoMood } from '@/components/reino/reinoMood';
import '@/components/reino/reino.css';
import '@/components/reino-landing/reino-landing.css';
import { ATUALIZADO_EM, RESPONSAVEL } from './responsavel';

export function Contato() {
  return <a href={`mailto:${RESPONSAVEL.email}`}>{RESPONSAVEL.email}</a>;
}

interface LegalLayoutProps {
  rotulo: string;
  titulo: string;
  sobre: string;
  children: ReactNode;
}

/** Página de documento no reino: topo simples, título e o texto como página de livro. */
export default function LegalLayout({ rotulo, titulo, sobre, children }: LegalLayoutProps) {
  const mood = getReinoMood();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="rl" data-mood={mood}>
      <header className="rl-topo" data-mood={mood}>
        <Link to="/" className="rl-topo__marca">
          <Astro className="rl-topo__astro" mood={mood} />
          Ecotopia
        </Link>
        <nav className="rl-topo__nav" aria-label="Documentos">
          <Link to="/termos">Termos de uso</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/login">Entrar</Link>
        </nav>
      </header>

      <main className="reino-corpo">
        <header className="rl-secao rl-legal__cabeca">
          <p className="reino-rotulo">{rotulo}</p>
          <h1 className="rl-titulo">{titulo}</h1>
          <p className="rl-sobre">{sobre}</p>
          <p className="rl-legal__data">Última atualização: {ATUALIZADO_EM}</p>
        </header>
        <article className="reino-artigo rl-legal">{children}</article>
      </main>

      <footer className="reino-corpo rl-rodape">
        <div className="rl-rodape__colunas">
          <div>
            <p className="reino-rotulo">Ecotopia</p>
            <Link to="/">Início</Link>
            <Link to="/precos">Preço</Link>
          </div>
          <div>
            <p className="reino-rotulo">Documentos</p>
            <Link to="/termos">Termos de uso</Link>
            <Link to="/privacidade">Política de privacidade</Link>
            <Link to="/cancelar-assinatura">Como cancelar</Link>
          </div>
          <div>
            <p className="reino-rotulo">Contato</p>
            <Contato />
          </div>
        </div>
        <p className="rl-rodape__fim">© 2026 Ecotopia</p>
      </footer>
    </div>
  );
}
