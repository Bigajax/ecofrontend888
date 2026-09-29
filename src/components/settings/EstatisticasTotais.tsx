import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PincelProgresso } from '@/components/reino/ReinoScene';
import { estadoDoCaminho, fraseDoCaminho, lerDiasDePratica } from '@/utils/caminhoReino';
import { conquistas } from '@/utils/conquistas';
import { getTodayDate, toLocalDateKey } from '@/utils/dataLocal';

const DIAS_DA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/**
 * Seus dias (set/2026): o caminho no reino, o mês com os dias em que houve
 * prática e o que foi feito em cada programa, tudo lido do aparelho. Antes:
 * números de exemplo fixos (outubro de 2025) e um "insight" igual para todos.
 */
export default function EstatisticasTotais() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const hoje = getTodayDate();
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const dias = useMemo(() => new Set(lerDiasDePratica(uid)), [uid]);
  const caminho = estadoDoCaminho(dias.size);
  const feitos = useMemo(() => conquistas(uid), [uid]);

  const celulas = useMemo(() => {
    const lista: (Date | null)[] = [];
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    for (let i = 0; i < primeiro.getDay(); i++) lista.push(null);
    const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= ultimo; d++) lista.push(new Date(mes.getFullYear(), mes.getMonth(), d));
    return lista;
  }, [mes]);

  const noMes = celulas.filter((d) => d && dias.has(toLocalDateKey(d))).length;
  const nomeBruto = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const nomeDoMes = nomeBruto.charAt(0).toUpperCase() + nomeBruto.slice(1);
  const agora = new Date();
  const ehMesAtual = mes.getFullYear() === agora.getFullYear() && mes.getMonth() === agora.getMonth();
  const mudarMes = (delta: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));

  return (
    <div className="reino-dias">
      <h2 className="reino-corpo__titulo reino-conta__titulo">Seus dias</h2>

      <p className="reino-dias__frase">{fraseDoCaminho(caminho)}</p>
      <PincelProgresso value={caminho.valor} className="reino-dias__pincel" />

      <section className="reino-dias__mes" aria-label={`Dias de prática em ${nomeDoMes}`}>
        <div className="reino-dias__mes-topo">
          <button type="button" className="reino-dias__seta" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
            ←
          </button>
          <p className="reino-dias__mes-nome">{nomeDoMes}</p>
          <button
            type="button"
            className="reino-dias__seta"
            onClick={() => mudarMes(1)}
            disabled={ehMesAtual}
            aria-label="Próximo mês"
          >
            →
          </button>
        </div>
        <div className="reino-dias__grade" role="grid">
          {DIAS_DA_SEMANA.map((d, i) => (
            <span key={`s${i}`} className="reino-dias__semana" aria-hidden="true">
              {d}
            </span>
          ))}
          {celulas.map((d, i) => {
            if (!d) return <span key={`v${i}`} />;
            const chave = toLocalDateKey(d);
            const praticou = dias.has(chave);
            return (
              <span
                key={chave}
                className={`reino-dias__dia${praticou ? ' is-pratica' : ''}${chave === hoje ? ' is-hoje' : ''}`}
                aria-label={`${d.getDate()}${praticou ? ', com prática' : ''}`}
              >
                {d.getDate()}
              </span>
            );
          })}
        </div>
        <p className="reino-dias__legenda">
          {noMes === 0 ? 'Nenhum dia de prática neste mês.' : `${noMes} ${noMes === 1 ? 'dia' : 'dias'} de prática neste mês.`}
        </p>
      </section>

      <p className="reino-rotulo">Em cada caminho</p>
      {feitos.length === 0 ? (
        <p className="reino-dias__vazio">Ainda nada por aqui. O primeiro passo de cada caminho é sem pagar.</p>
      ) : (
        <ul className="reino-sumario">
          {feitos.map((f) => (
            <li key={f.texto} className="reino-dias__feito">
              {f.texto}
            </li>
          ))}
        </ul>
      )}
      <p className="reino-dias__nota">Contado neste aparelho.</p>
    </div>
  );
}
