import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { abrirPorta } from '@/utils/porta';
import { useCasaDaMemoria } from './casaDaMemoria';
import { climaDe, nomeDoTema, type Memoria } from '@/api/emocional';

/**
 * Memórias, "o que ficou": cada uma é um bilhete que a Eco escreveu depois de
 * uma conversa que pesou. Mês a mês, da mais recente para a mais antiga, com
 * um ponto de tinta na cor do tempo daquela emoção (claro, noite, entardecer).
 */

const tema = (m: Memoria) => {
  const t = (m.dominio_vida || m.categoria || '').trim();
  return t ? nomeDoTema(t) : '';
};

function resumo(m: Memoria): string {
  const bruto = (m.analise_resumo || m.resumo_eco || '').trim();
  // resumos antigos vinham com rótulos e emoji ("Tags:", "Intensidade:"); fica só o texto
  const primeira = bruto.split('\n').find((l) => l.trim() && !/^\W*(tags|emoção|intensidade|resumo)/i.test(l.trim()));
  return (primeira ?? bruto).replace(/^[^\p{L}"]+/u, '').replace(/^"|"$/g, '');
}

const mes = (iso: string) => {
  const t = new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

export default function MemoriesSection() {
  const navigate = useNavigate();
  const { memorias, totalGuardadas, janela } = useCasaDaMemoria();
  const [filtro, setFiltro] = useState<string | null>(null);

  const temas = useMemo(() => {
    const freq = new Map<string, number>();
    for (const m of memorias) {
      const t = tema(m);
      if (t) freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  }, [memorias]);

  const grupos = useMemo(() => {
    const lista = memorias
      .filter((m) => m.created_at && (!filtro || tema(m) === filtro))
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    const porMes = new Map<string, Memoria[]>();
    for (const m of lista) {
      const chave = mes(m.created_at!);
      porMes.set(chave, [...(porMes.get(chave) ?? []), m]);
    }
    return [...porMes.entries()];
  }, [memorias, filtro]);

  if (memorias.length === 0) {
    return (
      <section className="reino-casa__vazio">
        <p className="reino-casa__vazio-titulo">O caderno ainda está em branco.</p>
        <p>
          Uma conversa vira memória quando pesa: quando você conta algo que mexe forte com você. A Eco anota o
          essencial, a emoção, o tema e poucas linhas do que aconteceu.
        </p>
        <button type="button" className="reino-placa" onClick={() => navigate('/app/chat')}>
          Conversar com a Eco <span aria-hidden="true">→</span>
        </button>
      </section>
    );
  }

  const escondidas = janela ? Math.max(0, totalGuardadas - memorias.length) : 0;

  return (
    <section aria-label="Memórias">
      {temas.length > 1 && (
        <div className="reino-filtros reino-casa__filtros" role="group" aria-label="Filtrar por tema">
          <button type="button" className="reino-filtro" aria-pressed={!filtro} onClick={() => setFiltro(null)}>
            Todas
          </button>
          {temas.map((t) => (
            <button
              key={t}
              type="button"
              className="reino-filtro"
              aria-pressed={filtro === t}
              onClick={() => setFiltro(filtro === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {grupos.map(([nome, lista]) => (
        <div key={nome} className="reino-casa__mes">
          <h2 className="reino-casa__mes-nome">{nome}</h2>
          <ol className="reino-bilhetes">
            {lista.map((m) => (
              <li key={m.id} className={`reino-bilhete is-${climaDe(m.emocao_principal)}`}>
                <p className="reino-bilhete__quando">
                  <span className="reino-bilhete__tinta" aria-hidden="true" />
                  {dia(m.created_at!)}
                  {m.emocao_principal ? ` · ${m.emocao_principal.toLowerCase()}` : ''}
                </p>
                <p className="reino-bilhete__texto">{resumo(m)}</p>
                {tema(m) && <p className="reino-bilhete__tema">{tema(m)}</p>}
              </li>
            ))}
          </ol>
        </div>
      ))}

      {janela && (
        <p className="reino-casa__janela">
          Você vê os últimos {janela.dias} dias
          {escondidas > 0 ? `. Há mais ${escondidas} ${escondidas === 1 ? 'bilhete guardado' : 'bilhetes guardados'}.` : '.'}{' '}
          <button type="button" className="reino-aviso__acao" onClick={() => abrirPorta('memory_historico')}>
            Ver o caderno inteiro
          </button>
        </p>
      )}
    </section>
  );
}
