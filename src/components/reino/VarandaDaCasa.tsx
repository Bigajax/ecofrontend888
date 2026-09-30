import { useEffect, useState } from 'react';
import { GlifoEco } from './ReinoGlifos';
import { buscarMemorias, nomeDoTema } from '@/api/emocional';
import './reino.css';

/**
 * A varanda da Casa (set/2026): a chegada da conversa. A pintura da casa com a
 * janela acesa, a Eco falando primeiro (e, se houver, lembrando da última
 * memória de verdade), e três portas para começar no lugar das sugestões
 * genéricas. Antes: um título, uma frase e chips como "mini-scan de presença".
 */
interface Porta {
  id: string;
  rotulo: string;
  sub: string;
  texto: string;
}

const PORTAS: Porta[] = [
  { id: 'dia', rotulo: 'Contar como foi o dia', sub: 'do começo, sem pressa', texto: 'Quero contar como foi o meu dia.' },
  {
    id: 'desabafo',
    rotulo: 'Desabafar',
    sub: 'sobre o que está pesando',
    texto: 'Preciso desabafar sobre uma coisa que está pesando.',
  },
  {
    id: 'respirar',
    rotulo: 'Só respirar um pouco',
    sub: 'sem precisar explicar',
    texto: 'Quero só respirar um pouco com você, sem precisar explicar nada.',
  },
];

const DIA_MS = 24 * 60 * 60 * 1000;

function fraseDaHora(saudacao: string): string {
  const s = saudacao.toLowerCase();
  if (s.includes('noite')) return 'A lamparina está acesa.';
  if (s.includes('tarde')) return 'A porta está aberta, e eu estou aqui.';
  return 'A janela está aberta, e eu estou aqui.';
}

interface VarandaDaCasaProps {
  saudacao: string;
  nome?: string | null;
  isGuest: boolean;
  disabled?: boolean;
  onPorta: (texto: string, id: string) => void;
}

export default function VarandaDaCasa({ saudacao, nome, isGuest, disabled, onPorta }: VarandaDaCasaProps) {
  // A última memória (só de verdade, dos últimos 30 dias): a Eco lembra.
  const [lembranca, setLembranca] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) return;
    let vivo = true;
    buscarMemorias()
      .then((lista) => {
        const ultima = [...lista]
          .filter((m) => m.created_at && Date.now() - new Date(m.created_at).getTime() < 30 * DIA_MS)
          .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0];
        const tema = ultima?.dominio_vida || ultima?.categoria;
        if (vivo && tema) setLembranca(nomeDoTema(tema).toLowerCase());
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [isGuest]);

  return (
    <section className="reino-varanda" aria-labelledby="varanda-titulo">
      <img
        src="/images/reino/casa-800.webp"
        alt=""
        decoding="async"
        className="reino-varanda__casa reino-rasgo-a"
      />
      <h1 id="varanda-titulo" className="reino-varanda__titulo">
        {saudacao}
        {nome ? `, ${nome}` : ''}.
      </h1>
      <p className="reino-varanda__eco" data-testid="chat-hero-subtitle">
        <GlifoEco ativo className="reino-varanda__glifo" />
        <span>
          {fraseDaHora(saudacao)}{' '}
          {lembranca
            ? `Da última vez, você falou de ${lembranca}. Como ficou?`
            : 'Pode começar por onde quiser. Eu escuto.'}
        </span>
      </p>

      <ul className="reino-varanda__portas" aria-label="Três jeitos de começar">
        {PORTAS.map((p) => (
          <li key={p.id}>
            <button type="button" className="reino-porta-entrada" disabled={disabled} onClick={() => onPorta(p.texto, p.id)}>
              <span className="reino-porta-entrada__rotulo">{p.rotulo}</span>
              <span className="reino-porta-entrada__sub">{p.sub}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
