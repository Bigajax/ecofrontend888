import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada, { ReinoSessoes, type ReinoSessao } from '@/components/reino/ReinoChegada';
import { useAuth } from '@/contexts/AuthContext';
import { useAbundanciaEntitlement } from '@/hooks/useAbundanciaEntitlement';
import { PROTOCOL_SESSIONS, type ProtocolSession } from '@/data/protocolAbundancia';

function isSessionAccessible(
  session: number,
  completed: Set<number>,
  isPaid: boolean,
  isVip: boolean,
  isFree: boolean,
): boolean {
  if (isVip) return true;
  if (isFree) return true;
  if (!isPaid) return false;
  if (session === 3) return completed.has(2);
  return completed.has(session - 1);
}

export default function CodigoDaAbundanciaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isVipUser, isPremiumUser, isTrialActive } = useAuth();
  const { hasAccess: hasAbundanciaEntitlement } = useAbundanciaEntitlement();
  // Abundância agora é premium. CTA → trial; entitlement legado mantém acesso (grandfather).
  const checkoutLoading = false;
  const openCheckout = () => navigate('/assinar?step=plan&plan=annual&from=abundancia_trial');
  const isPaid = isVipUser || isPremiumUser || isTrialActive || hasAbundanciaEntitlement;
  const uid = user?.id || 'guest';

  const [completedSessions, setCompletedSessions] = useState<Set<number>>(() => {
    const raw = localStorage.getItem(`eco.abundancia.protocol.v1.${uid}`);
    if (raw) {
      try {
        return new Set<number>(JSON.parse(raw).completedSessions || []);
      } catch {
        return new Set<number>();
      }
    }
    return new Set<number>();
  });

  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    localStorage.setItem(`eco.abundancia.protocol.v1.${uid}`, JSON.stringify({
      completedSessions: [...completedSessions],
      lastActive: new Date().toISOString(),
    }));
  }, [completedSessions, uid]);

  useEffect(() => {
    if (location.state?.returnFromMeditation) {
      const lastPlayed = sessionStorage.getItem('eco.abundancia.lastPlayedSession');
      if (lastPlayed) {
        const sessionNum = parseInt(lastPlayed);
        const markerKey = `eco.meditation.completed80pct.abundancia_${sessionNum}`;
        if (localStorage.getItem(markerKey) === 'true') {
          setCompletedSessions(prev => {
            const next = new Set([...prev, sessionNum]);
            if (next.size === 7) setShowCompletion(true);
            return next;
          });
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const completedCount = completedSessions.size;
  const pct = Math.round((completedCount / 7) * 100);
  const nextSession = Math.min(completedCount + 1, 7);

  const heroButtonLabel =
    completedCount === 0
      ? 'Iniciar o Dia 1, grátis'
      : completedCount === 7
      ? 'Protocolo concluído'
      : !isPaid
      ? 'Começar os 7 dias gratuitos'
      : `Continuar Dia ${nextSession}`;

  const handleSessionClick = (session: ProtocolSession) => {
    const accessible = isSessionAccessible(session.session, completedSessions, isPaid, isVipUser, session.isFree);

    if (!accessible) {
      openCheckout();
      return;
    }
    if (!session.hasAudio || !session.audioUrl) return;

    sessionStorage.setItem('eco.abundancia.lastPlayedSession', String(session.session));

    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: session.id,
          title: `Dia ${session.session} – ${session.title}`,
          duration: session.duration,
          audioUrl: session.audioUrl,
          imageUrl: session.imageUrl ?? '/images/abundancia-hero.webp',
          backgroundMusic: 'Abundância',
          gradient: session.gradient,
          category: 'abundancia',
          isPremium: !session.isFree,
        },
        returnTo: '/app/codigo-da-abundancia',
      },
    });
  };

  const handleHeroButtonClick = () => {
    if (!isPaid && nextSession > 1) {
      openCheckout();
      return;
    }
    if (completedCount === 7) {
      setShowCompletion(true);
      return;
    }
    const targetSession = PROTOCOL_SESSIONS[nextSession - 1];
    if (targetSession) handleSessionClick(targetSession);
  };

  const sessoes: ReinoSessao[] = PROTOCOL_SESSIONS.map((session) => {
    const accessible = isSessionAccessible(session.session, completedSessions, isPaid, isVipUser, session.isFree);
    const completed = completedSessions.has(session.session);
    const paidLocked = !session.isFree && !isPaid;
    const sequentialLocked = !paidLocked && !accessible;
    const comingSoon = accessible && !session.hasAudio;
    let estado: ReinoSessao['estado'] = 'livre';
    let meta = session.duration;
    if (completed) {
      estado = 'feita';
      meta = 'feito';
    } else if (paidLocked) {
      estado = 'trancada';
      meta = `assinantes · ${session.duration}`;
    } else if (sequentialLocked) {
      estado = 'trancada';
      meta = `depois do dia ${session.session - 1}`;
    } else if (comingSoon) {
      meta = 'em breve';
    } else if (session.session === nextSession) {
      estado = 'proxima';
      meta = `hoje · ${session.duration}`;
    }
    return { id: session.id, titulo: session.title, descricao: session.description, meta, estado };
  });

  // ── Tela de Conclusão ────────────────────────────────────────────────────
  if (showCompletion) {
    return (
      <div className="reino-corpo" style={{ minHeight: '100dvh' }}>
        {user && <HomeHeader />}
        <ReinoChegada
          mood="entardecer"
          imagem="/images/reino/capa-abundancia.webp"
          foco="center 60%"
          lugar="TRI.04 · As Trilhas · 7 de 7 dias"
          titulo="Código ativado."
          sobre="Em 7 dias, você reprogramou os padrões que afastavam a prosperidade. A abundância não é um destino: agora é parte de quem você é."
          voltar={{ rotulo: 'Ver o protocolo de novo', onClick: () => setShowCompletion(false) }}
        >
          <button type="button" className="reino-placa" onClick={() => navigate('/app/mapa')}>
            Explorar outras trilhas <span aria-hidden="true">→</span>
          </button>
        </ReinoChegada>
      </div>
    );
  }

  const convite = !isPaid && (
    <section className="reino-convite" aria-labelledby="abundancia-convite">
      <p className="reino-rotulo">Você começou uma jornada. Não pare agora.</p>
      <h2 id="abundancia-convite" className="reino-corpo__titulo" style={{ fontSize: 26 }}>
        As 7 sessões, com a assinatura Ecotopia
      </h2>
      <ul className="reino-abundancia__lista">
        <li>Todas as 7 sessões e a biblioteca completa</li>
        <li>Inclui o áudio SOS: Ansiedade Financeira Aguda</li>
      </ul>
      <button type="button" className="reino-placa" onClick={openCheckout} disabled={checkoutLoading}>
        {checkoutLoading ? 'Abrindo…' : 'Começar 7 dias gratuitos'} <span aria-hidden="true">→</span>
      </button>
    </section>
  );

  // ── Página Principal ─────────────────────────────────────────────────────
  return (
    <div className="reino-corpo" style={{ minHeight: '100dvh' }}>
      {user && <HomeHeader />}

      <main className="page-with-nav">
        <ReinoChegada
          mood="entardecer"
          imagem="/images/reino/capa-abundancia.webp"
          foco="center 62%"
          lugar="TRI.04 · As Trilhas · Protocolo de 7 dias"
          titulo="Você não tem problema de dinheiro."
          sobre="Você tem uma crença que o afasta. Em 7 sessões, neurociência e meditação guiada reprogramam os padrões que fazem o dinheiro escorregar, mesmo quando você trabalha duro."
          voltar={{ rotulo: user ? 'Voltar para Hoje' : 'Voltar', onClick: () => navigate('/app') }}
          extra={
            !user ? (
              <button type="button" className="reino-chegada__voltar" onClick={() => navigate('/register')}>
                Criar conta grátis
              </button>
            ) : undefined
          }
          progresso={{
            valor: pct / 100,
            legenda: completedCount === 7 ? 'Código ativado. 7 de 7 dias.' : `Dia ${nextSession} de 7. ${completedCount} feitos.`,
          }}
        >
          <button type="button" className="reino-placa" onClick={handleHeroButtonClick} disabled={checkoutLoading}>
            {checkoutLoading ? 'Abrindo pagamento…' : heroButtonLabel} <span aria-hidden="true">→</span>
          </button>
        </ReinoChegada>

        <div className="reino-pagina">
          <div className="reino-nota">
            <p>
              Você não tem problema de dinheiro porque é fraco. Seu cérebro foi condicionado a manter um nível fixo de
              prosperidade, e sabota em silêncio tudo o que passa desse nível. É isso que vamos mudar.
            </p>
          </div>

          <p className="reino-rotulo">O que muda em 7 dias</p>
          <ul className="reino-abundancia__lista">
            <li>Identificar e dissolver crenças limitantes sobre dinheiro</li>
            <li>Criar um novo estado emocional de merecimento e abertura</li>
            <li>Alinhar sua mente inconsciente com seus objetivos financeiros</li>
          </ul>

          <p className="reino-rotulo" style={{ marginTop: 36 }}>Os sete dias</p>
          <ReinoSessoes
            sessoes={sessoes}
            onEscolher={(id) => {
              const s = PROTOCOL_SESSIONS.find((x) => x.id === id);
              if (s) handleSessionClick(s);
            }}
            depoisDe={convite ? { indice: 0, conteudo: convite } : undefined}
          />

          <section className="reino-abundancia__porque" aria-labelledby="abundancia-porque">
            <p className="reino-rotulo">Baseado em três princípios</p>
            <h2 id="abundancia-porque" className="reino-corpo__titulo" style={{ fontSize: 26 }}>
              Por que este protocolo funciona
            </h2>
            <ul className="reino-biblioteca">
              {[
                {
                  title: 'Neuroplasticidade aplicada',
                  text: 'Seu cérebro foi condicionado a um nível fixo de prosperidade. Cada sessão cria novos caminhos neurais no lugar dos padrões antigos.',
                },
                {
                  title: 'Estado emocional, não pensamento positivo',
                  text: 'Não é sobre pensar positivo. É sobre gerar o estado interno certo para que decisões e ações se alinhem com a abundância.',
                },
                {
                  title: 'Progressão deliberada',
                  text: 'Cada sessão se aprofunda onde a anterior terminou. No 7º dia, a reprogramação opera no nível da identidade.',
                },
              ].map((item) => (
                <li key={item.title}>
                  <div className="reino-livro" style={{ cursor: 'default' }}>
                    <span className="reino-livro__titulo">{item.title}</span>
                    <span className="reino-livro__sobre">{item.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
