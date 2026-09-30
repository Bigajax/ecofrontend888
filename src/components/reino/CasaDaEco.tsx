import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import './reino.css';

/**
 * A moldura da Casa da Eco (set/2026): a mesma do chat. Lateral com os cômodos
 * (Conversa, Memórias, Perfil emocional, Relatórios), o cabeço "ECO.01 · Casa
 * da Eco" com o nome do cômodo, e o quadro pequeno da casa, cada cômodo num
 * pedaço da mesma pintura. Antes, memórias e relatório abriam como outra
 * página, com cabeçalho e pintura grande: não pareciam continuação da conversa.
 */
interface CasaDaEcoProps {
  /** nome do cômodo, à direita do cabeço */
  comodo: string;
  titulo: string;
  sobre: ReactNode;
  /** que pedaço da pintura da casa este cômodo mostra */
  foco: string;
  children: ReactNode;
  isGuest?: boolean;
}

export default function CasaDaEco({ comodo, titulo, sobre, foco, children, isGuest }: CasaDaEcoProps) {
  const navigate = useNavigate();
  const sair = () => navigate('/app');

  return (
    <div className="reino-corpo flex overflow-hidden" style={{ height: '100dvh' }}>
      <Sidebar variant="desktop" isGuest={isGuest} onLogout={sair} />
      <Sidebar variant="bottom" isGuest={isGuest} onLogout={sair} />

      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 min-h-0 overflow-y-auto pt-14 lg:pt-0 pb-10">
          <div className="reino-chat-cabeco hidden lg:flex">
            <span>ECO.01 · Casa da Eco</span>
            <span>{comodo}</span>
          </div>

          <div className="reino-casa__miolo">
            <header className="reino-casa__cabeca">
              <img
                src="/images/reino/casa-800.webp"
                alt=""
                decoding="async"
                className="reino-chat-casa reino-rasgo-a"
                style={{ objectPosition: foco }}
              />
              <h1 className="reino-casa__titulo">{titulo}</h1>
              <p className="reino-casa__sobre">{sobre}</p>
            </header>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
