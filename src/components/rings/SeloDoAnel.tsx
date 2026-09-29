import { RINGS } from '@/constants/rings';
import { diasDoAnel } from '@/constants/ringsJornada';
import type { DailyRitual, RingType } from '@/types/rings';
import RingIcon from './RingIcon';
import '@/components/reino/reino.css';

interface SeloDoAnelProps {
  anel: RingType;
  rituais: DailyRitual[];
}

/**
 * O Selo do anel: o que a pessoa escreveu nos 6 dias daquele anel, lido de
 * volta, em ordem. É a promessa de "ver padrões" cumprida sem inventar nada:
 * só as palavras dela.
 */
export default function SeloDoAnel({ anel, rituais }: SeloDoAnelProps) {
  const [inicio, fim] = diasDoAnel(anel);
  const registros = rituais
    .filter((r) => r.status === 'completed')
    .flatMap((r) => r.answers.filter((a) => a.ringId === anel && typeof a.metadata?.dia === 'number'))
    .filter((a) => (a.metadata.dia as number) >= inicio && (a.metadata.dia as number) <= fim)
    .sort((a, b) => (a.metadata.dia as number) - (b.metadata.dia as number));

  if (registros.length === 0) return null;

  return (
    <section className="reino-selo" aria-label={`Selo do ${RINGS[anel].titlePt}`}>
      <div className="reino-selo__topo">
        <RingIcon ringId={anel} size={34} />
        <div>
          <p className="reino-rotulo">Selo do {RINGS[anel].titlePt}</p>
          <p className="reino-selo__sub">O que você escreveu nestes dias.</p>
        </div>
      </div>
      <ol className="reino-selo__lista">
        {registros.map((a) => (
          <li key={`${a.metadata.dia}-${a.timestamp}`}>
            <span className="reino-selo__dia">Dia {a.metadata.dia}</span>
            <span className="reino-selo__pergunta">{a.metadata.pergunta}</span>
            <span className="reino-selo__resposta">{a.answer}</span>
            {a.metadata.fechamento && <span className="reino-selo__passo">Passo: {a.metadata.fechamento}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
