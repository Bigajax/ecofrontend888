import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRings } from '@/contexts/RingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionTier, usePremiumContent } from '@/hooks/usePremiumContent';
import { canAccess } from '@/constants/meditationTiers';
import mixpanel from '@/lib/mixpanel';
import { RINGS } from '@/constants/rings';
import {
  DIAS_DA_JORNADA,
  PERGUNTA_DE_FECHAMENTO,
  DICA_DO_ANEL,
  diasConcluidos,
  lerInicioDoCiclo,
  pontoDaJornada,
} from '@/constants/ringsJornada';
import RitualCompletion from '@/components/rings/RitualCompletion';
import RingIcon from '@/components/rings/RingIcon';
import RitualGuestGate from '@/components/rings/RitualGuestGate';
import { PincelProgresso } from '@/components/reino/ReinoScene';
import '@/components/reino/reino.css';

/**
 * O dia da jornada (set/2026): uma tela, duas perguntas. A do anel da vez muda
 * a cada dia; a de fechamento é sempre a mesma. Antes eram 5 passos com 5
 * respostas obrigatórias, as mesmas todos os dias.
 *
 * Visitante faz o dia 1 inteiro; do dia 2 em diante, a conta. Plano free
 * (logado sem assinatura) segue bloqueado como antes.
 */
export default function DailyRitual() {
  const navigate = useNavigate();
  const { currentRitual, startRitual, completeRitual, allRituals } = useRings();
  const { user, isGuestMode, isVipUser } = useAuth();
  const tier = useSubscriptionTier();
  const { requestUpgrade } = usePremiumContent();

  const isGuest = isGuestMode && !user && !isVipUser;
  const uid = user?.id ?? null;
  const feitosAntes = useMemo(() => diasConcluidos(allRituals).length, [allRituals]);
  // O primeiro passo é de todos (set/2026): o plano grátis faz o dia 1 inteiro;
  // a assinatura entra do dia 2 em diante. Antes o grátis era bloqueado já na
  // entrada, sem ver uma pergunta.
  const hojeFeito = currentRitual?.status === 'completed';
  // Só quando tenta um dia novo: revendo o dia de hoje (já feito) não há o que pedir.
  const isFreeBlocked =
    Boolean(user) && !isGuest && !canAccess('rings_daily', tier) && feitosAntes >= 1 && !hojeFeito;
  // O ponto é calculado sem contar o dia de hoje, para a tela mostrar o dia que se está fechando.
  const ponto = pontoDaJornada(hojeFeito ? feitosAntes - 1 : feitosAntes, lerInicioDoCiclo(uid));
  const anel = RINGS[ponto.anel];

  const chaveRascunho = `eco.rings.v1.rascunho.${uid || 'anon'}.${currentRitual?.date ?? ''}`;
  const [resposta, setResposta] = useState('');
  const [fechamento, setFechamento] = useState('');
  const [fechando, setFechando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (!currentRitual) startRitual();
  }, [currentRitual, startRitual]);

  // Rascunho: sair no meio não perde o que foi escrito.
  useEffect(() => {
    if (!currentRitual) return;
    try {
      const salvo = JSON.parse(localStorage.getItem(chaveRascunho) || 'null');
      if (salvo) {
        setResposta(salvo.resposta || '');
        setFechamento(salvo.fechamento || '');
      }
    } catch {
      // rascunho ilegível: começa em branco
    }
  }, [chaveRascunho, currentRitual]);

  useEffect(() => {
    if (!currentRitual || hojeFeito) return;
    try {
      localStorage.setItem(chaveRascunho, JSON.stringify({ resposta, fechamento }));
    } catch {
      // sem storage, sem rascunho
    }
  }, [resposta, fechamento, chaveRascunho, currentRitual, hojeFeito]);

  useEffect(() => {
    if (isFreeBlocked) {
      mixpanel.track('Assinatura · Limite free bloqueado', { limit_type: 'rings_premium', user_id: user?.id, tier });
      requestUpgrade('rings_dia2');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreeBlocked]);

  if (!currentRitual) return null;

  // Já fechou o dia de hoje (voltou para esta tela): mostra a chegada.
  if (concluido || hojeFeito) {
    return <RitualCompletion onBackHome={() => navigate('/app/rings')} />;
  }

  // Plano grátis depois do dia 1: a Porta abre sozinha; aqui fica o caminho para reabri-la.
  if (isFreeBlocked && !hojeFeito) {
    return (
      <div className="reino-corpo reino-ritual">
        <div className="reino-ritual__miolo">
          <button type="button" className="reino-chegada__voltar" onClick={() => navigate('/app/rings')}>
            <span aria-hidden="true">←</span> Voltar
          </button>
          <h1 className="reino-ritual__chegada">O dia {ponto.dia} abre com a assinatura.</h1>
          <p className="reino-ritual__amanha">O primeiro dia foi seu. Os outros 29 seguem com todas as portas abertas.</p>
          <button type="button" className="reino-placa" onClick={() => requestUpgrade('rings_dia2')}>
            Ver como seguir <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    );
  }

  // Visitante que já fez o dia 1: o resto é com a conta.
  if (isGuest && feitosAntes >= 1) {
    return <RitualGuestGate open currentDay={ponto.dia} completedRings={1} onBack={() => navigate('/app/rings')} />;
  }

  const podeFechar = resposta.trim().length > 0 && !fechando;

  const fecharODia = async () => {
    if (!podeFechar) return;
    setFechando(true);
    setErro(null);
    try {
      await completeRitual({
        ringId: ponto.anel,
        answer: resposta.trim(),
        metadata: { dia: ponto.dia, pergunta: ponto.pergunta, fechamento: fechamento.trim() || undefined },
      });
      try {
        localStorage.removeItem(chaveRascunho);
      } catch {
        // nada a limpar
      }
      mixpanel.track('Anéis · Dia fechado', { dia: ponto.dia, anel: ponto.anel, com_fechamento: Boolean(fechamento.trim()) });
      setConcluido(true);
    } catch {
      setErro('Não deu para fechar o dia agora. O que você escreveu está guardado; tente de novo.');
    } finally {
      setFechando(false);
    }
  };

  // O dia como uma página de caderno (set/2026): a pintura de Musashi rasgada
  // no topo, a folha com o selo do anel carimbado, a pergunta grande e o papel
  // pautado para escrever.
  return (
    <div className="reino-corpo reino-ritual">
      <div className="reino-ritual__miolo">
        <button type="button" className="reino-chegada__voltar" onClick={() => navigate('/app/rings')}>
          <span aria-hidden="true">←</span> Voltar
        </button>

        <div className="reino-ritual__faixa reino-rasgo-a" aria-hidden="true">
          <img src="/images/reino/capa-cinco-aneis.webp" alt="" decoding="async" />
        </div>

        <div className="reino-ritual__folha">
          <span className="reino-ritual__carimbo" aria-hidden="true">
            <RingIcon ringId={ponto.anel} size={34} />
          </span>

          <p className="reino-rotulo reino-ritual__dia">
            Dia {ponto.dia} de {DIAS_DA_JORNADA} · {anel.titlePt}
          </p>
          <PincelProgresso value={ponto.feitos / DIAS_DA_JORNADA} className="reino-ritual__pincel" />

          {ponto.diaNoAnel === 1 && (
            <blockquote className="reino-ritual__abertura">
              <p>
                Hoje começa o {anel.titlePt}: {anel.subtitlePt}.
              </p>
              <p>{anel.impactPhrase}</p>
            </blockquote>
          )}

          <label className="reino-ritual__pergunta">
            <span className="reino-ritual__enunciado">{ponto.pergunta}</span>
            <span className="reino-ritual__dica">{DICA_DO_ANEL[ponto.anel]}</span>
            <textarea
              className="reino-ritual__pautado"
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              rows={5}
              placeholder="Escreva do seu jeito. Uma linha já vale."
              disabled={fechando}
            />
          </label>

          <label className="reino-ritual__pergunta is-fechamento">
            <span className="reino-rotulo">Para fechar o dia</span>
            <span className="reino-ritual__enunciado is-menor">{PERGUNTA_DE_FECHAMENTO}</span>
            <textarea
              className="reino-ritual__pautado"
              value={fechamento}
              onChange={(e) => setFechamento(e.target.value)}
              rows={2}
              placeholder="Opcional"
              disabled={fechando}
            />
          </label>

          {erro && (
            <p role="alert" className="reino-ritual__erro">
              {erro}
            </p>
          )}

          <button type="button" className="reino-placa" onClick={fecharODia} disabled={!podeFechar}>
            {fechando ? 'Fechando…' : `Fechar o dia ${ponto.dia}`} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

    </div>
  );
}
