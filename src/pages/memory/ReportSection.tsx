import { useEffect, useState } from 'react';
import { useSubscriptionTier } from '@/hooks/usePremiumContent';
import { canAccess } from '@/constants/meditationTiers';
import { abrirPorta } from '@/utils/porta';
import { buscarRelatorio, nomeDoTema, type Relatorio } from '@/api/emocional';
import { useCasaDaMemoria } from './casaDaMemoria';

/**
 * Relatórios, "o céu dos dias" (assinatura): cada dia do período é um pedaço
 * de céu. Céu claro quando o dia foi mais leve, noite quando pesou,
 * entardecer quando misturou; sem memória, o céu fica em branco. Embaixo, o
 * que mais voltou. Antes: um mapa 2D com posição sorteada e "intensidade por
 * dia" que era contagem.
 */

const PERIODOS = [7, 30, 90] as const;
const DIA_MS = 24 * 60 * 60 * 1000;

const chaveDoDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const vezes = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);

export default function ReportSection() {
  const tier = useSubscriptionTier();
  const liberado = canAccess('relatorio_emocional', tier);
  const { totalGuardadas } = useCasaDaMemoria();
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  useEffect(() => {
    if (!liberado) return;
    let vivo = true;
    setEstado('carregando');
    buscarRelatorio(dias)
      .then((r) => {
        if (!vivo) return;
        setRelatorio(r);
        setEstado('pronto');
      })
      .catch(() => vivo && setEstado('erro'));
    return () => {
      vivo = false;
    };
  }, [dias, liberado]);

  if (!liberado) {
    return (
      <section className="reino-casa__vazio">
        <p className="reino-casa__vazio-titulo">O céu dos seus dias fica aqui.</p>
        <p>
          Uma semana, um mês ou três meses de uma vez: quais dias foram de céu claro, quais foram noite, e o que mais
          voltou nas conversas.
        </p>
        <button type="button" className="reino-placa" onClick={() => abrirPorta('relatorio_emocional')}>
          Abrir os relatórios <span aria-hidden="true">→</span>
        </button>
      </section>
    );
  }

  const seletor = (
    <div className="reino-filtros reino-casa__filtros" role="group" aria-label="Período">
      {PERIODOS.map((p) => (
        <button key={p} type="button" className="reino-filtro" aria-pressed={dias === p} onClick={() => setDias(p)}>
          {p === 7 ? 'Uma semana' : p === 30 ? 'Um mês' : 'Três meses'}
        </button>
      ))}
    </div>
  );

  if (estado === 'carregando') return <>{seletor}<p className="reino-casa__carregando">Olhando o céu...</p></>;
  if (estado === 'erro' || !relatorio) {
    return (
      <>
        {seletor}
        <p className="reino-casa__carregando">
          {estado === 'erro' ? 'Não foi possível montar o relatório agora.' : 'O relatório está sendo atualizado. Volte em alguns minutos.'}
        </p>
      </>
    );
  }

  if (relatorio.total_memorias === 0) {
    return (
      <>
        {seletor}
        <section className="reino-casa__vazio">
          <p className="reino-casa__vazio-titulo">Céu em branco neste período.</p>
          <p>
            {totalGuardadas > 0
              ? 'Tente um período maior. Os dias que marcarem na conversa com a Eco aparecem aqui.'
              : 'Os dias que marcarem na conversa com a Eco aparecem aqui.'}
          </p>
        </section>
      </>
    );
  }

  const porDia = new Map(relatorio.dias.map((d) => [d.data, d]));
  const hoje = new Date();
  const ceu = Array.from({ length: relatorio.periodo_dias }, (_, i) => {
    const d = new Date(hoje.getTime() - (relatorio.periodo_dias - 1 - i) * DIA_MS);
    return { chave: chaveDoDia(d), dia: d, info: porDia.get(chaveDoDia(d)) };
  });
  const { leve, pesado, misto } = relatorio.clima;

  return (
    <section aria-label="Relatórios">
      {seletor}

      <p className="reino-ceu__frase">
        {vezes(relatorio.total_memorias, 'memória', 'memórias')} em {vezes(relatorio.dias.length, 'dia', 'dias')}.{' '}
        {[
          leve && `Céu claro ${vezes(leve, 'vez', 'vezes')}`,
          misto && `entardecer ${vezes(misto, 'vez', 'vezes')}`,
          pesado && `noite ${vezes(pesado, 'vez', 'vezes')}`,
        ]
          .filter(Boolean)
          .join(', ')}
        .
      </p>

      <div className="reino-ceu" role="img" aria-label="Um pedaço de céu por dia; pintado quando houve memória">
        {ceu.map(({ chave, dia, info }) => (
          <span
            key={chave}
            className={`reino-ceu__dia${info ? ` is-${info.clima}` : ''}`}
            title={`${dia.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}${
              info ? `: ${vezes(info.memorias, 'memória', 'memórias')}` : ''
            }`}
          />
        ))}
      </div>
      <p className="reino-ceu__pontas" aria-hidden="true">
        <span>há {relatorio.periodo_dias} dias</span>
        <span>hoje</span>
      </p>
      <ul className="reino-ceu__legenda">
        <li><span className="reino-ceu__dia is-leve" /> céu claro, dia mais leve</li>
        <li><span className="reino-ceu__dia is-misto" /> entardecer, misturado</li>
        <li><span className="reino-ceu__dia is-pesado" /> noite, dia que pesou</li>
      </ul>

      <div className="reino-espelho__colunas">
        <section>
          <h2 className="reino-casa__mes-nome">O que você sentiu</h2>
          <ul className="reino-ceu__lista">
            {relatorio.emocoes.map((e) => (
              <li key={e.emocao}>
                <span>{e.emocao}</span>
                <span>{vezes(e.vezes, 'vez', 'vezes')}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="reino-casa__mes-nome">Onde aconteceu</h2>
          <ul className="reino-ceu__lista">
            {relatorio.temas.map((t) => (
              <li key={t.tema}>
                <span>{nomeDoTema(t.tema)}</span>
                <span>{vezes(t.vezes, 'vez', 'vezes')}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {relatorio.tags.length > 0 && (
        <p className="reino-ceu__palavras">
          Palavras que voltaram: {relatorio.tags.map((t) => t.tag).join(', ')}.
        </p>
      )}
    </section>
  );
}
