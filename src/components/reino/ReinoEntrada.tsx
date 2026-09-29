import type { ReactNode } from 'react';
import { ReinoPintura, type ReinoRegiao } from './ReinoScene';
import { getReinoMood, type ReinoMood } from './reinoMood';
import './reino.css';

// Mesma pintura e foco da home em cada hora (HomeReinoHero).
const CENA_ENTRADA: Record<ReinoMood, { regiao: ReinoRegiao; foco: string }> = {
  amanhecer: { regiao: 'portico', foco: '85% 50%' },
  entardecer: { regiao: 'casa', foco: '15% 50%' },
  noite: { regiao: 'vale', foco: '45% 50%' },
};

/**
 * A moldura das telas de entrada (cadastro, nova senha): a pintura da hora de
 * um lado, a folha do outro. Mesmas classes do login.
 */
export default function ReinoEntrada({ children }: { children: ReactNode }) {
  const mood = getReinoMood();
  const cena = CENA_ENTRADA[mood];
  return (
    <div className="reino-entrada" data-mood={mood}>
      <div className="reino-entrada__pintura reino-rasgo-a" aria-hidden="true">
        <ReinoPintura regiao={cena.regiao} foco={cena.foco} />
      </div>
      <main className="reino-corpo reino-entrada__folha">
        <div className="reino-entrada__miolo">{children}</div>
      </main>
    </div>
  );
}
