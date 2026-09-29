import { useEffect, useState } from 'react';
import { useSubscriptionTier } from '@/hooks/usePremiumContent';
import { canAccess } from '@/constants/meditationTiers';
import { abrirPorta } from '@/utils/porta';
import { buscarRelatorio, nomeDoTema, type Relatorio } from '@/api/emocional';
import { useCasaDaMemoria } from './MemoryLayout';

/**
 * Relatório (assinatura): como foram os dias num período. Cada dia com
 * memória vira um quadrado pintado pelo clima (leve, pesado, misto, por uma
 * tabela fixa de emoções no servidor), e embaixo as emoções, os temas e as
 * palavras que mais voltaram. Antes: um mapa 2D com posição sorteada para a
 * maioria das emoções e "intensidade por dia" que era contagem.
 */

const PERIODOS = [7, 30, 90] as const;
const DIA_MS = 24 * 60 * 60 * 1000;

const chaveDoDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
        <h2 className="reino-corpo__titulo">Como foram os seus dias.</h2>
        <p>
          O relatório junta as memórias de uma semana, um mês ou três meses: quais dias foram mais leves, quais pesaram, e
          as emoções e os temas que mais voltaram.
        </p>
        <button type="button" className="reino-placa" onClick={() => abrirPorta('relatorio_emocional')}>
          Abrir o relatório <span aria-hidden="true">→</span>
        </button>
      </section>
    );
  }

  const seletor = (
    <div className="reino-filtros" role="group" aria-label="Período">
      {PERIODOS.map((p) => (
        <button key={p} type="button" className="reino-filtro" aria-pressed={dias === p} onClick={() => setDias(p)}>
          {p === 7 ? 'Últimos 7 dias' : `Últimos ${p} dias`}
        </button>
      ))}
    </div>
  );

  if (estado === 'carregando') return <>{seletor}<p className="reino-casa__carregando">Juntando os dias...</p></>;
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
          <h2 className="reino-corpo__titulo">Nenhuma memória neste período.</h2>
          <p>
            {totalGuardadas > 0
              ? 'Tente um período maior, ou converse com a Eco: os dias que marcarem aparecem aqui.'
              : 'Os dias que marcarem na conversa com a Eco aparecem aqui.'}
          </p>
        </section>
      </>
    );
  }

  const porDia = new Map(relatorio.dias.map((d) => [d.data, d]));
  const hoje = new Date();
  const quadros = Array.from({ length: relatorio.periodo_dias }, (_, i) => {
    const d = new Date(hoje.getTime() - (relatorio.periodo_dias - 1 - i) * DIA_MS);
    return { chave: chaveDoDia(d), dia: d, info: porDia.get(chaveDoDia(d)) };
  });

  return (
    <section aria-label="Relatório">
      {seletor}

      <p className="reino-relatorio__frase">
        {relatorio.total_memorias === 1 ? 'Uma memória' : `${relatorio.total_memorias} memórias`} em{' '}
        {relatorio.dias.length === 1 ? 'um dia' : `${relatorio.dias.length} dias`}:{' '}
        {[
          relatorio.clima.leve && `${relatorio.clima.leve} ${relatorio.clima.leve === 1 ? 'leve' : 'leves'}`,
          relatorio.clima.pesado && `${relatorio.clima.pesado} ${relatorio.clima.pesado === 1 ? 'pesada' : 'pesadas'}`,
          relatorio.clima.misto && `${relatorio.clima.misto} ${relatorio.clima.misto === 1 ? 'misturada' : 'misturadas'}`,
        ]
          .filter(Boolean)
          .join(', ')}
        .
      </p>

      <div className="reino-relatorio__dias" role="img" aria-label="Um quadrado por dia; pintado quando houve memória">
        {quadros.map(({ chave, dia, info }) => (
          <span
            key={chave}
            className={`reino-relatorio__dia${info ? ` is-${info.clima}` : ''}`}
            title={`${dia.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}${
              info ? `: ${info.memorias} ${info.memorias === 1 ? 'memória' : 'memórias'}, intensidade ${info.intensidade_media}` : ''
            }`}
          />
        ))}
      </div>
      <ul className="reino-relatorio__legenda">
        <li><span className="reino-relatorio__dia is-leve" /> leve</li>
        <li><span className="reino-relatorio__dia is-pesado" /> pesado</li>
        <li><span className="reino-relatorio__dia is-misto" /> misturado</li>
      </ul>

      <div className="reino-relatorio__colunas">
        <div>
          <p className="reino-rotulo">Emoções</p>
          <ul className="reino-sumario">
            {relatorio.emocoes.map((e) => (
              <li key={e.emocao} className="reino-relatorio__linha">
                <span>{e.emocao}</span>
                <span className="reino-sumario__m">{e.vezes}x</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="reino-rotulo">Temas</p>
          <ul className="reino-sumario">
            {relatorio.temas.map((t) => (
              <li key={t.tema} className="reino-relatorio__linha">
                <span>{nomeDoTema(t.tema)}</span>
                <span className="reino-sumario__m">{t.vezes}x</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {relatorio.tags.length > 0 && (
        <>
          <p className="reino-rotulo">Palavras que voltaram</p>
          <p className="reino-relatorio__palavras">{relatorio.tags.map((t) => t.tag).join(', ')}</p>
        </>
      )}
    </section>
  );
}
