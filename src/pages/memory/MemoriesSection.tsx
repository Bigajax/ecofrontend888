import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { abrirPorta } from '@/utils/porta';
import { useCasaDaMemoria } from './MemoryLayout';
import { nomeDoTema, type Memoria } from '@/api/emocional';

/**
 * Memórias: o que a Eco guardou, mês a mês, da mais recente para a mais
 * antiga. Filtra por tema. Sem memória ainda, explica o que vira memória.
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
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

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
        <h2 className="reino-corpo__titulo">Ainda não há memórias.</h2>
        <p>
          Uma conversa vira memória quando pesa: quando você conta algo que mexe forte com você. A Eco guarda o
          essencial, a emoção, o tema e um resumo. Só você vê.
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
        <div className="reino-filtros" role="group" aria-label="Filtrar por tema">
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
          <p className="reino-rotulo">{nome}</p>
          <ol className="reino-sumario reino-sessoes">
            {lista.map((m) => (
              <li key={m.id}>
                <div className="reino-sessao reino-sessao--leitura">
                  <span className="reino-sumario__n">{dia(m.created_at!)}</span>
                  <span className="reino-sessao__texto">
                    <span className="reino-casa__resumo">{resumo(m)}</span>
                    <span className="reino-sessao__descricao">
                      {[m.emocao_principal, tema(m)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="reino-sumario__m">
                    {typeof m.intensidade === 'number' ? `${m.intensidade}/10` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}

      {janela && (
        <div className="reino-nota reino-casa__janela">
          <p>
            Você vê os últimos {janela.dias} dias
            {escondidas > 0 ? `. Há mais ${escondidas} ${escondidas === 1 ? 'memória guardada' : 'memórias guardadas'}.` : '.'}{' '}
            <button type="button" className="reino-aviso__acao" onClick={() => abrirPorta('memory_historico')}>
              Ver tudo com a assinatura
            </button>
          </p>
        </div>
      )}
    </section>
  );
}
