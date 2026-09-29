import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada from './ReinoChegada';
import './reino.css';

/**
 * Um artigo da Biblioteca no reino: a chegada com a pintura do lugar e, embaixo,
 * o texto como página de livro (título em serifa, corpo em Figtree, sem ícones).
 */
interface ReinoArtigoProps {
  titulo: string;
  sobre: string;
  /** ex.: "SOM.02 · Vale do Sono · leitura de 2 min" */
  lugar: string;
  imagem: string;
  foco?: string;
  children: ReactNode;
}

export default function ReinoArtigo({ titulo, sobre, lugar, imagem, foco, children }: ReinoArtigoProps) {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="reino-corpo" style={{ minHeight: '100dvh' }}>
      <HomeHeader />
      <main className="page-with-nav">
        <ReinoChegada
          mood="noite"
          imagem={imagem}
          foco={foco}
          lugar={lugar}
          titulo={titulo}
          sobre={sobre}
          voltar={{ rotulo: 'Voltar para Hoje', onClick: () => navigate('/app') }}
        />
        <article className="reino-artigo">{children}</article>
      </main>
    </div>
  );
}
