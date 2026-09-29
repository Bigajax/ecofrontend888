import { useEffect, useState } from 'react';
import { useCaminho } from '@/hooks/useCaminho';
import {
  EVENTO_CAMINHO,
  MARCOS,
  fraseDoCaminho,
  tirarMarcoPendente,
  type DetalheEventoCaminho,
  type Marco,
} from '@/utils/caminhoReino';
import { Astro, PincelProgresso } from './ReinoScene';
import { getReinoMood } from './reinoMood';
import './reino.css';

/**
 * A linha do caminho: "Dia 12 no reino. Faltam 9 dias para Tem casa aqui.",
 * com a pincelada até o próximo marco. Uma linha só, em qualquer tela.
 */
export function LinhaDoCaminho({ className }: { className?: string }) {
  const estado = useCaminho();
  return (
    <div className={`reino-caminho${className ? ` ${className}` : ''}`}>
      <p className="reino-caminho__frase">{fraseDoCaminho(estado)}</p>
      <PincelProgresso value={estado.valor} className="reino-caminho__pincel" />
      {estado.marco && <p className="reino-caminho__marco">{estado.marco.nome}</p>}
    </div>
  );
}

/**
 * A folha de quando um marco é alcançado. Fica montada no layout do app e
 * escuta o registro de prática; se o marco foi alcançado numa tela que já
 * saiu (ex.: o player), aparece na próxima.
 */
export function FolhaDoMarco() {
  const [marco, setMarco] = useState<Marco | null>(null);

  useEffect(() => {
    const pendente = tirarMarcoPendente();
    if (pendente) setMarco(pendente);
    const ouvir = (e: Event) => {
      const detalhe = (e as CustomEvent<DetalheEventoCaminho>).detail;
      if (detalhe?.marcoNovo) {
        tirarMarcoPendente();
        setMarco(detalhe.marcoNovo);
      }
    };
    window.addEventListener(EVENTO_CAMINHO, ouvir);
    return () => window.removeEventListener(EVENTO_CAMINHO, ouvir);
  }, []);

  if (!marco) return null;
  const proximo = MARCOS.find((m) => m.dias > marco.dias);

  return (
    <div
      className="reino-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="marco-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) setMarco(null);
      }}
    >
      <div className="reino-gate__folha reino-corpo">
        <Astro className="reino-gate__astro" mood={getReinoMood()} />
        <p className="reino-rotulo" style={{ marginTop: 14 }}>
          Novo marco no caminho
        </p>
        <h2 id="marco-titulo" className="reino-gate__titulo" style={{ marginTop: 4 }}>
          {marco.nome}
        </h2>
        <p className="reino-gate__texto">{marco.frase}</p>
        {proximo && (
          <p className="reino-gate__nota">
            Próximo: {proximo.nome}, aos {proximo.dias} dias de prática.
          </p>
        )}
        <div className="reino-gate__acoes">
          <button type="button" className="reino-placa" onClick={() => setMarco(null)}>
            Seguir <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
