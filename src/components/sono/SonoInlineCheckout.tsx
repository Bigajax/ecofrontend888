import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, ChevronLeft, Heart, Lock, Moon, Plus, QrCode, ShieldCheck, Sparkles, X } from 'lucide-react';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { apiUrl } from '@/config/apiBase';
import { registerFunilSono } from '@/lib/mixpanelAssinarFunnel';
import {
  trackSonoGuestOfferViewed,
  trackSonoGuestCheckoutClicked,
  trackSonoGuestOfferDismissed,
  trackSonoGuestAppInviteShown,
  trackSonoGuestAppInviteClicked,
  trackSonoGuestPostNight1Response,
  trackSonoGuestPostNight1QuestionView,
  trackSonoGuestContinueNight2,
  trackSonoGuestBonusInfoOpened,
  trackSonoGuestDecideTomorrowClicked,
  trackSonoGuestReminderSubmitted,
  trackSonoGuestReminderFailed,
  trackSonoGuestOfferExitViaBack,
} from '@/lib/mixpanelSonoGuestEvents';
import mixpanel from '@/lib/mixpanel';
import { trackWithCAPI } from '@/lib/fbpixel';
import { isPaywallFoco } from '@/lib/paywallFoco';
import { isOfertaBonus } from '@/lib/ofertaBonus';
import { OFFER } from '@/constants/offerCopy';
import { getSonoGuestId } from '@/lib/sonoGuestId';
import { LS_KEYS } from '@/components/sono-guest/types';
import { useSonoCheckoutState, type SonoCheckoutStep } from './useSonoCheckoutState';
import { SonoInlineSignup } from './SonoInlineSignup';
import { SonoInlinePix } from './SonoInlinePix';
import { SonoEcoDreamBonusModal } from './SonoEcoDreamBonusModal';
import { SonoConfettiBurst } from './SonoConfettiBurst';
import { readSonoLifetime } from './sonoLifetime';

/**
 * Orquestrador do checkout inline do funil do sono (modelo C). Substitui o
 * SonoGuestPostFlow: após a Noite 1, conduz reflexão calma → oferta suave →
 * cadastro → cartão → confirmação → desbloqueio, tudo no tema escuro da
 * experiência, sem pular pro /assinar. Roda em modo guest; o convidado só vira
 * conta no passo de cadastro.
 *
 * `onUnlocked` é chamado quando a assinatura é confirmada — o pai destrava as
 * noites 2–7 ali mesmo. `onDismiss` fecha o overlay ("agora não").
 */
interface SonoInlineCheckoutProps {
  /**
   * Passo de abertura solicitado pelo pai (`null` = não abrir). Só é honrado
   * quando o overlay está fechado; uma vez aberto, a navegação interna manda. A
   * restauração pós-remount NÃO depende disto — vem do `?checkout=` na URL.
   */
  openAt: SonoCheckoutStep | null;
  onUnlocked: () => void;
  onDismiss: () => void;
  /** Quando definido, o passo `offer` mostra um "<" pra voltar à meditação no ponto
   *  salvo (só quando a oferta foi aberta a partir da Noite 1 em andamento). */
  onBackToMeditation?: () => void;
}

type ReflectionAnswer = 'yes' | 'little' | 'no';

const RETURN_TO = '/sono/experiencia?checkout=save_account';

/** Preço de fallback (exibição) caso o /config do backend não responda. */
const FALLBACK_SONO_PRICE = 37;

function priceLabel(price: number): string {
  return Number.isInteger(price) ? `R$${price}` : `R$${price.toFixed(2).replace('.', ',')}`;
}

/** Âncora honesta por noite (preço ÷ 7), arredondada pra CIMA no centavo —
 *  nunca subestima. R$37 → "R$5,29". */
function perNightLabel(price: number): string {
  return `R$${(Math.ceil((price / 7) * 100) / 100).toFixed(2).replace('.', ',')}`;
}

/** Resposta da reflexão persistida em sessionStorage — sobrevive ao remount do
 *  RootProviders (o state `answer` se perde), pra oferta manter a headline
 *  personalizada. Gravada em selectAnswer. */
function getPersistedReflectionAnswer(): ReflectionAnswer | null {
  try {
    const s = sessionStorage.getItem('eco.sono.reflection_answer');
    return s === 'yes' || s === 'little' || s === 'no' ? s : null;
  } catch {
    return null;
  }
}

/** Noite 1 concluída (chave gravada por markGuestNight1Completed no pai). */
function isNight1Completed(): boolean {
  try {
    return localStorage.getItem(LS_KEYS.completed) === 'true';
  } catch {
    return false;
  }
}

/** Variante da headline da oferta → prop headline_variant no "Oferta vista". */
function resolveHeadlineVariant(answer: ReflectionAnswer | null): string {
  const a = answer ?? getPersistedReflectionAnswer();
  if (a === 'yes') return 'corpo_soltou';
  if (a === 'little') return 'comecou_desacelerar';
  if (a === 'no' || isNight1Completed()) return 'alerta_de_anos';
  return 'continue_noite_2';
}


/** Mapa das chaves internas (estáveis, gravadas em sono_guest_flow_events) para o
 *  valor legível enviado ao Mixpanel na "Resposta pós-noite 1". */
const RESPONSE_KEY: Record<ReflectionAnswer, 'mais_leve' | 'um_pouco_mais_calmo' | 'ainda_acelerado'> = {
  yes: 'mais_leve',
  little: 'um_pouco_mais_calmo',
  no: 'ainda_acelerado',
};

/** Opções da reflexão pós-Noite 1 — badge (imagem) + título + microcopy. As
 *  chaves (yes/little/no) batem com selectAnswer/RESPONSE_KEY. */
const REFLECTION_OPTIONS: { key: ReflectionAnswer; img: string; title: string; desc: string }[] = [
  { key: 'yes',    img: '/images/sono-reflexao-icone-1.webp', title: 'Mais leve',           desc: 'Sinto meu corpo mais solto e a mente mais tranquila.' },
  { key: 'little', img: '/images/sono-reflexao-icone-2.webp', title: 'Um pouco mais calmo', desc: 'Ainda sinto tensão, mas já estou desacelerando.' },
  { key: 'no',     img: '/images/sono-reflexao-icone-3.webp', title: 'Ainda acelerado',     desc: 'Minha mente não para e meu corpo ainda está tenso.' },
];

const stepVariants = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

function getGuestId(): string {
  // Fonte ÚNICA — o mesmo id atravessa eventos → pagamento → entitlement → /check.
  return getSonoGuestId();
}

function getSource(): string {
  return sessionStorage.getItem('eco.sono.source') || 'direct';
}

/** Analytics fire-and-forget no mesmo registro por guest (sono_guest_flow_events). */
async function upsertEvent(patch: Record<string, unknown>) {
  try {
    await supabase
      .from('sono_guest_flow_events')
      .upsert(
        { guest_id: getGuestId(), source: getSource(), ...patch },
        { onConflict: 'guest_id' },
      );
  } catch {
    // analytics — silencia erros
  }
}

export function SonoInlineCheckout({ openAt, onUnlocked, onDismiss, onBackToMeditation }: SonoInlineCheckoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { step, open, goTo, close } = useSonoCheckoutState();

  const [answer, setAnswer] = useState<ReflectionAnswer | null>(null);
  // Resposta tocada aguardando a transição (~280ms): o radio acende e o card
  // ganha glow ANTES de trocar de tela — sem isso o toque não "registra" e os
  // cards não se leem como pergunta de 1 toque (affordance de quiz).
  const [pendingAnswer, setPendingAnswer] = useState<ReflectionAnswer | null>(null);
  const [price, setPrice] = useState<number>(FALLBACK_SONO_PRICE);
  // Gatilho que abriu a oferta (KISS #4). Define a proeminência: nos novos
  // gatilhos (noite bloqueada / continuar n2) o card R$37 vai pro topo; no banner
  // (baseline) a lista das 7 noites vem primeiro.
  const [offerOrigem, setOfferOrigem] = useState<string | null>(null);
  // Modal explicativo do bônus EcoDream (abre ao tocar na linha do bônus).
  const [bonusInfoOpen, setBonusInfoOpen] = useState(false);
  // "Decidir amanhã" (guest): expande captura de contato inline; o lembrete é
  // enviado MANUALMENTE no dia seguinte via deep link ?oferta=1&g={guest_id}.
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderContact, setReminderContact] = useState('');
  const [reminderState, setReminderState] = useState<'idle' | 'sending' | 'done'>('idle');
  // Confete na chegada à oferta VINDA da conquista (Continuar Noite 2 / Ver as
  // próximas noites). Não dispara nas outras origens (noite bloqueada, banner,
  // lembrete) — sem conquista, confete soa falso.
  const [confettiOn, setConfettiOn] = useState(false);
  const convertedTrackedRef = useRef(false);
  const funnelSourceRef = useRef(false);
  const appInviteShownRef = useRef(false);
  const offerViewedRef = useRef(false);
  const questionViewRef = useRef(false);

  // Preço do Pix vem do backend (env), pra mudar sem rebuild do front. Buscado uma
  // vez quando o overlay abre; cai no fallback se o /config falhar.
  useEffect(() => {
    if (step === null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/payments/sono-pix/config'));
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.price === 'number') setPrice(data.price);
      } catch {
        /* mantém fallback */
      }
    })();
    return () => { cancelled = true; };
  }, [step]);

  // Ao abrir o checkout, registra funnel_source='sono_experiencia' (super
  // property): os eventos Cadastro/Cartão de mixpanelAssinarFunnel herdam a
  // atribuição do funil da experiência (no /assinar isso vem do registerFunilSono
  // de lá; aqui ele não roda).
  useEffect(() => {
    if (step === null || funnelSourceRef.current) return;
    funnelSourceRef.current = true;
    registerFunilSono('sono_experiencia');
    // Versão das telas/copy como super properties: todos os eventos do funil
    // passam a carregar a versão, permitindo comparar variações sem tocar em cada
    // track. Bumpar estes valores ao iterar a copy.
    mixpanel.register({
      post_meditation_version: 'v2_continuidade',
      offer_version: 'v2_camadas',
      checkout_version: 'trial_r0_copy_v2',
    });
  }, [step]);

  // "Oferta vista" — dispara quando o passo offer aparece, por qualquer caminho
  // (reflexão→oferta ou abertura direta via openAt='offer' vinda da landing).
  useEffect(() => {
    if (step !== 'offer') return;
    // Lê o gatilho (gravado no sessionStorage por quem abriu a oferta) pra decidir
    // a proeminência do card. Reavalia toda vez que o passo vira 'offer'.
    try {
      setOfferOrigem(sessionStorage.getItem('eco.sono.offer_origem'));
    } catch {
      setOfferOrigem(null);
    }
    if (offerViewedRef.current) return;
    offerViewedRef.current = true;
    trackSonoGuestOfferViewed({
      source: getSource(),
      guestId: getGuestId(),
      // Qual headline esta pessoa viu (personalizada pela resposta da reflexão) —
      // permite comparar a conversão de cada variante no Mixpanel.
      headlineVariant: resolveHeadlineVariant(answer),
    });
    // Meta Pixel + CAPI: oferta das 7 noites exibida.
    void trackWithCAPI('ViewContent', {
      contentName: 'Oferta 7 Noites',
      contentCategory: 'sono',
    });
  }, [step, answer]);

  // "Convite app exibido" — ponte pro app quando o free autenticado desiste.
  useEffect(() => {
    if (step !== 'app_invite' || appInviteShownRef.current) return;
    appInviteShownRef.current = true;
    trackSonoGuestAppInviteShown({ source: getSource(), guestId: getGuestId() });
  }, [step]);

  // "Pergunta pós-noite 1 vista" — dispara quando a pergunta ("Como seu corpo
  // está agora?") aparece, antes de qualquer resposta. Fecha o gap entre Noite 1
  // concluída e a resposta no Mixpanel.
  useEffect(() => {
    if (step !== 'reflection' || answer !== null || questionViewRef.current) return;
    questionViewRef.current = true;
    trackSonoGuestPostNight1QuestionView({ source: getSource(), guestId: getGuestId() });
  }, [step, answer]);

  // Abre no passo solicitado pelo pai quando ainda não há estado restaurado da
  // URL/sessionStorage. Após aberto, a navegação interna assume.
  useEffect(() => {
    if (openAt && step === null) open(openAt);
  }, [openAt, step, open]);

  // Voltar (gesto/botão) com a oferta aberta: fecha o overlay e mantém o usuário
  // na página do protocolo — antes, o back saía da /sono/experiencia (landing).
  // Ao abrir, empurramos UMA entrada extra no history (mesma URL) que absorve o
  // gesto; o popstate então fecha o overlay em vez de navegar. Trade-off aceito:
  // se o overlay fechar por outro caminho, a entrada duplicada fica — o 1º back
  // seguinte é um no-op visual e o 2º sai da página. Inofensivo e simples.
  const pushedHistoryRef = useRef(false);
  useEffect(() => {
    if (step === null) {
      pushedHistoryRef.current = false;
      return;
    }
    if (!pushedHistoryRef.current) {
      pushedHistoryRef.current = true;
      window.history.pushState({ sonoCheckout: true }, '', window.location.href);
    }
  }, [step]);

  // Listener só age nos passos PRÉ-pagamento (reflection/offer/pix) — depois de
  // pagar (unlocked/save_account) e no app_invite o back não fecha nada à força.
  //
  // Anexado UMA vez, lendo step/onDismiss por refs: com deps [step, onDismiss] o
  // efeito re-anexava a cada render — e no back real o Router processa o pop
  // primeiro, o pai re-renderiza e o remove/re-add acontecia NO MEIO do dispatch
  // do popstate (listener removido é pulado; re-adicionado não roda pro evento em
  // voo) → o handler nunca via o back. Refs mantêm o listener estável.
  const stepRef = useRef(step);
  stepRef.current = step;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  useEffect(() => {
    const onPopState = () => {
      const s = stepRef.current;
      if (s !== 'reflection' && s !== 'offer' && s !== 'pix') return;
      // Evento ANTES de sair da oferta (brief item 6).
      trackSonoGuestOfferExitViaBack({ source: getSource(), guestId: getGuestId() });
      close();
      onDismissRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [close]);

  // Conversão (uma vez) ao destravar — fecha o funil no Mixpanel. Pagamento ÚNICO
  // (não-assinatura), por isso evento dedicado em vez dos helpers de subscription.
  // O Purchase do Meta sai no SonoInlinePix (client) + no webhook (server, principal).
  useEffect(() => {
    if (step !== 'unlocked' || convertedTrackedRef.current) return;
    convertedTrackedRef.current = true;
    mixpanel.track('Funil Sono · Pix aprovado', {
      product: 'protocolo_sono_7_noites',
      amount: price,
      provider: 'mercadopago',
      payment_type: 'pix_lifetime',
      user_id: user?.id,
      guest_id: getGuestId(),
      source: getSource(),
    });
  }, [step, user?.id, price]);

  // Pix aprovado: destrava as noites atrás do overlay (justSubscribed no pai) e vai
  // pra tela de sucesso. A fonte da verdade é o webhook (entitlement por guest_id);
  // o SonoInlinePix já gravou o cache local + disparou o Purchase do client.
  const handlePixPaid = useCallback(() => {
    onUnlocked();
    void upsertEvent({ unlocked: true });
    goTo('unlocked');
  }, [onUnlocked, goTo]);

  // Vincula o entitlement (criado por guest_id) à conta recém-salva, pra valer em
  // qualquer aparelho. Non-fatal.
  const claimLifetime = useCallback(async () => {
    try {
      const cache = readSonoLifetime();
      if (!cache?.externalReference) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch(apiUrl('/api/entitlements/claim'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ external_reference: cache.externalReference }),
      });
    } catch {
      /* non-fatal — o acesso por guest_id + cache local já vale */
    }
  }, []);

  // Botão da tela de sucesso. Logado → reivindica e vai pro app. Sem conta → oferece
  // salvar o acesso (save_account).
  const handleAfterUnlock = useCallback(() => {
    if (user) {
      void claimLifetime().then(() => navigate('/app/meditacoes-sono'));
    } else {
      goTo('save_account');
    }
  }, [user, claimLifetime, navigate, goTo]);

  // Navegação única pro app completo (mode="app", com nav). Guard por ref para o
  // efeito e o onCreated não navegarem duas vezes; o ref reseta no remount, então
  // o caminho de recuperação (efeito) ainda dispara uma vez após remontar.
  const navigatedToAppRef = useRef(false);
  const goToApp = useCallback(() => {
    if (navigatedToAppRef.current) return;
    navigatedToAppRef.current = true;
    void claimLifetime(); // não-fatal e em background; o entitlement também vale por guest_id
    navigate('/app/meditacoes-sono', { replace: true });
  }, [claimLifetime, navigate]);

  // Convidado virou conta no passo de cadastro → entra no app completo. Dirigido
  // por efeito (não imperativo) para sobreviver ao remount do RootProviders por
  // userId: após remontar, o passo é restaurado da URL (?checkout=save_account) e
  // o user já está autenticado, então o efeito dispara e navega. Cobre os três
  // caminhos de conclusão do cadastro: e-mail, popup do Google e fallback de OAuth
  // por redirect (volta em /sono/experiencia?checkout=save_account já logado).
  useEffect(() => {
    if (step === 'save_account' && user) goToApp();
  }, [step, user, goToApp]);

  const selectAnswer = (a: ReflectionAnswer) => {
    setAnswer(a);
    // Persiste pra headline personalizada da oferta sobreviver ao remount.
    try {
      sessionStorage.setItem('eco.sono.reflection_answer', a);
    } catch {
      // storage indisponível — a oferta cai na headline neutra
    }
    // max_step_reached é INT (1-6) na tabela sono_guest_flow_events — mandar
    // string ('reflection') fazia o upsert inteiro falhar e a resposta não salvar.
    void upsertEvent({ reflection_answer: a, max_step_reached: 2 });
    trackSonoGuestPostNight1Response(RESPONSE_KEY[a], {
      source: getSource(),
      guestId: getGuestId(),
    });
  };

  // Toque numa resposta: mostra a seleção (radio aceso + glow) por um instante e
  // só então transiciona — o guard impede toque duplo em cards diferentes.
  const handleAnswerTap = (a: ReflectionAnswer) => {
    if (pendingAnswer) return;
    setPendingAnswer(a);
    window.setTimeout(() => selectAnswer(a), 280);
  };

  const goToOffer = () => {
    // KISS #4 — "Continuar Noite 2" é um dos gatilhos do paywall focado: oferta
    // com o card R$37 no topo.
    sessionStorage.setItem('eco.sono.offer_origem', 'continuar_n2');
    // Variante do CTA da tela de continuidade — bumpar ao trocar a copy do botão
    // (era 'liberar_6_noites'; virou gramática de continuidade em jul/2026).
    trackSonoGuestContinueNight2({ source: getSource(), guestId: getGuestId(), ctaConclusaoVariant: 'continuar_noite_2' });
    setConfettiOn(true); // celebração na chegada à oferta (veio da conquista)
    goTo('offer');
    void upsertEvent({ reached_offer: true, max_step_reached: 6 });
  };

  // Saída explícita da reflexão SEM responder: a pergunta deixa de ser beco sem
  // saída (antes, só o botão pós-resposta levava à oferta). Vai direto pra 'offer'
  // — "Oferta vista" dispara pelo efeito — sem o evento de continuidade (não houve
  // resposta), pra não conflar a leitura do funil.
  const skipToOffer = () => {
    setConfettiOn(true); // também veio da Noite 1 concluída (reflexão)
    goTo('offer');
    void upsertEvent({ reached_offer: true, max_step_reached: 6 });
  };

  const startCheckout = () => {
    void upsertEvent({ cta_clicked: true });
    trackSonoGuestCheckoutClicked({ source: getSource(), guestId: getGuestId() });
    // Pagamento PRIMEIRO (Pix), conta depois — sem cadastro antes de pagar.
    goTo('pix');
  };

  const handleDismiss = () => {
    trackSonoGuestOfferDismissed({ source: getSource(), guestId: getGuestId() });
    // Free autenticado (criou conta mas não pagou) → ponte leve pro app em vez de
    // só fechar. Guest sem conta → fecha (comportamento original).
    if (user) {
      goTo('app_invite');
      return;
    }
    close();
    onDismiss();
  };

  // "Ficar no sono" — fecha o overlay e mantém a /sono/experiencia (Noite 1).
  const handleStayInSono = () => {
    close();
    onDismiss();
  };

  // "Decidir amanhã" (guest, substitui o "Agora não"): expande a captura de
  // contato inline — sem rota nova, sem cadastro/senha.
  const handleDecideTomorrow = () => {
    trackSonoGuestDecideTomorrowClicked({ source: getSource(), guestId: getGuestId() });
    setReminderOpen(true);
  };

  // Grava o contato em offer_reminders (INSERT anônimo, RLS só de INSERT).
  // 1 retry; na falha dupla loga + evento e MESMO ASSIM mostra sucesso — a
  // promessa do lembrete nunca trava o fluxo de quem já decidiu sair.
  const submitReminder = async () => {
    const contact = reminderContact.trim();
    if (!contact || reminderState !== 'idle') return;
    setReminderState('sending');
    const insert = () =>
      supabase.from('offer_reminders').insert({ guest_id: getGuestId(), contact });
    let { error } = await insert();
    if (error) ({ error } = await insert()); // 1 retry
    if (error) {
      console.error('[offer_reminders] insert falhou', error);
      trackSonoGuestReminderFailed({ source: getSource(), guestId: getGuestId() });
    } else {
      trackSonoGuestReminderSubmitted(contact.includes('@') ? 'email' : 'whatsapp', {
        source: getSource(),
        guestId: getGuestId(),
      });
    }
    setReminderState('done');
  };

  // "<" do passo offer: volta pra Noite 1 no ponto salvo. Fecha o overlay (limpa
  // ?checkout=/sessionStorage) e o pai remonta o player a partir do progresso salvo.
  const handleBackToMeditation = () => {
    close();
    onBackToMeditation?.();
  };

  // "Explorar o app" — leva o free pro app completo; a 2ª conversão acontece lá
  // pelos gates/UpgradeModal existentes.
  const handleExploreApp = () => {
    trackSonoGuestAppInviteClicked({ source: getSource(), guestId: getGuestId() });
    navigate('/app');
  };

  // Overlay fechado — nada a renderizar.
  if (step === null) return null;

  // Fechar disponível nos passos "frios" (inclui pix: o usuário pode desistir antes
  // de pagar) — exceto sucesso/salvar conta.
  const canClose = step === 'reflection' || step === 'offer' || step === 'pix';
  // Resposta selecionada = mostra a tela de continuidade (concluiu Noite 1).
  const answered = answer !== null;

  // Proeminência da oferta (KISS #4): com o kill-switch ON (default), o card
  // R$37 + CTA sobem pro topo (flex order) em TODAS as origens — antes o banner
  // caía no baseline e enterrava o Pix embaixo da lista das 7 noites. VITE_PAYWALL_FOCO
  // ='false' reverte pro layout com a lista primeiro.
  const offerFocused = isPaywallFoco();
  void offerOrigem;

  // Value-stack: EcoDream como bônus no card da oferta (+ CTA "+ bônus"). Flag ON
  // por padrão; OFF volta o card/CTA originais.
  const ofertaBonus = isOfertaBonus();

  // Personalização da oferta: resposta da reflexão (state ou sessionStorage,
  // pós-remount) + conquista da Noite 1 — decidem headline/eyebrow/subtítulo.
  const offerAnswer = answer ?? getPersistedReflectionAnswer();
  const night1Done = isNight1Completed();

  // Reenquadramento da arte (retrato) para DESKTOP (paisagem). O mesmo `cover` num
  // viewport largo-baixo zooma demais e joga o emblema/relevo pro meio, colidindo
  // com o texto. Esta camada (só ≥md, recobre o fundo mobile) mostra o brilho
  // ambiente da base (aurora / trilha) com um scrim que mantém a coluna legível.
  const desktopBgStyle =
    step === 'reflection'
      ? {
          backgroundImage: `linear-gradient(180deg, rgba(6,5,18,0.55) 0%, rgba(6,5,18,0.60) 46%, rgba(6,5,18,0.32) 100%), url("${
            answered ? '/images/sono-reflexao-resposta-bg.webp' : '/images/sono-reflexao-bg.webp'
          }")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
        }
      : step === 'offer' || step === 'pix' || step === 'unlocked' || step === 'save_account'
        ? {
            backgroundImage:
              'linear-gradient(180deg, rgba(8,5,24,0.50) 0%, rgba(8,5,24,0.60) 50%, rgba(8,5,24,0.42) 100%), url("/images/sono-oferta-bg.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
          }
        : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[9998] flex flex-col"
      style={
        step === 'reflection'
          ? {
              // Fundo cósmico (lua no halo + aurora) vem da imagem; leve vinheta
              // escura em cima/baixo só pra firmar a legibilidade do texto. A
              // tela de RESPOSTA (pós-resposta) usa uma imagem própria.
              backgroundImage: `linear-gradient(180deg, rgba(4,6,15,0.30) 0%, rgba(4,6,15,0) 26%, rgba(4,6,15,0.30) 100%), url("${
                answered ? '/images/sono-reflexao-resposta-bg.webp' : '/images/sono-reflexao-bg.webp'
              }")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }
          : step === 'offer' || step === 'pix' || step === 'unlocked' || step === 'save_account'
            ? {
                // Imagem (trilha + lua) cobrindo a página inteira; camada translúcida
                // por cima pra legibilidade. No cadastro (form longo) escurece mais.
                backgroundImage: `linear-gradient(180deg, rgba(8,5,24,${
                  step === 'save_account' ? '0.5' : '0.34'
                }) 0%, rgba(8,5,24,${
                  step === 'save_account' ? '0.62' : '0.46'
                }) 55%, rgba(8,5,24,${
                  step === 'save_account' ? '0.7' : '0.58'
                }) 100%), url("/images/sono-oferta-bg.webp")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
              }
            : { background: 'linear-gradient(180deg, #04060F 0%, #080C1E 100%)' }
      }
    >
      {/* Reenquadramento da arte no desktop (só ≥md): recobre o fundo mobile e
          mostra o brilho ambiente na base, sem o zoom/colisão do retrato. */}
      {desktopBgStyle && (
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block" style={desktopBgStyle} />
      )}

      {/* Enquadramento desktop: escurece as bordas laterais pra focar a coluna
          central quando a arte (retrato) é exibida em paisagem. Só ≥md; o mobile
          não renderiza este elemento, então fica idêntico ao atual. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{
          background:
            'linear-gradient(90deg, rgba(6,5,18,0.62) 0%, rgba(6,5,18,0) 28%, rgba(6,5,18,0) 72%, rgba(6,5,18,0.62) 100%)',
        }}
      />

      {/* Glow violeta ambiente — só onde não há imagem de fundo própria */}
      {step !== 'reflection' && step !== 'offer' && step !== 'pix' && step !== 'unlocked' && step !== 'save_account' && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[12%] -translate-x-1/2"
          style={{
            width: '320px',
            height: '220px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      )}

      {/* Eyebrow acima da lua (a lua vem da imagem de fundo) — só na pergunta */}
      {step === 'reflection' && !answered && (
        <div className="pointer-events-none absolute left-1/2 top-[5.5%] z-20 flex -translate-x-1/2 items-center gap-2">
          <Sparkles className="h-3 w-3" style={{ color: 'rgba(196,181,253,0.5)' }} />
          <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(196,181,253,0.65)' }}>
            Noite 1 · concluída
          </p>
          <Sparkles className="h-3 w-3" style={{ color: 'rgba(196,181,253,0.5)' }} />
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-10 flex flex-shrink-0 items-center justify-between px-6 pt-10 pb-2">
        {/* "<" volta pra meditação no ponto salvo — só no passo offer e quando veio de lá. */}
        {onBackToMeditation && step === 'offer' ? (
          <button
            onClick={handleBackToMeditation}
            className="flex h-8 items-center gap-1.5 rounded-full pl-2 pr-3 transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
            aria-label="Voltar para a meditação"
          >
            <ChevronLeft className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>Meditação</span>
          </button>
        ) : (
          <span />
        )}
        {canClose ? (
          <button
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.40)' }} />
          </button>
        ) : (
          <span />
        )}
      </div>

      {/* Conteúdo. `my-auto` (não justify-center no pai) centraliza quando cabe e
          permite rolar quando o passo transborda — sem isso o cartão trava o scroll. */}
      <div className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-6 pb-12">
        {/* reflection: 12vh (não 18) — vão menor entre eyebrow e pergunta pra que
            pergunta + respostas se leiam como uma unidade só (affordance de quiz). */}
        <div className={`flex w-full max-w-[340px] flex-col py-4 md:max-w-[480px] ${step === 'reflection' ? 'mt-[12vh]' : 'my-auto'}`}>
          <AnimatePresence mode="wait">

            {/* ── reflection (pergunta + validação numa só batida) ── */}
            {step === 'reflection' && (
              <motion.div
                key="reflection"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                {!answered ? (
                  <>
                    {/* (o eyebrow "Noite 1 · concluída" fica acima da lua — ver topo) */}
                    <h2
                      className="font-display text-[25px] font-bold leading-snug text-white"
                      style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
                    >
                      Como seu corpo
                      <br />
                      <em style={{ color: '#C4B5FD', fontStyle: 'italic' }}>está agora?</em>
                    </h2>
                    <p className="mb-5 mt-3 text-[13px] leading-relaxed" style={{ color: 'rgba(199,184,240,0.72)' }}>
                      Toque na que mais parece com você agora.
                    </p>

                    {/* Cards de resposta — quiz de 1 toque: radio à direita (não
                        chevron, que dizia "navegação"), borda lilás e feedback de
                        seleção (glow + check) antes de transicionar. */}
                    <div className="flex w-full flex-col gap-2.5">
                      {REFLECTION_OPTIONS.map(({ key, img, title, desc }) => {
                        const selected = pendingAnswer === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleAnswerTap(key)}
                            className="eco-glass-lg group flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
                            style={{
                              background: selected ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.07)',
                              backdropFilter: 'blur(10px)',
                              WebkitBackdropFilter: 'blur(10px)',
                              border: selected
                                ? '1px solid rgba(167,139,250,0.85)'
                                : '1px solid rgba(167,139,250,0.28)',
                              boxShadow: selected
                                ? '0 0 26px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.14)'
                                : 'inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 26px rgba(8,5,24,0.30)',
                              opacity: pendingAnswer && !selected ? 0.55 : 1,
                            }}
                          >
                            <span className="-my-1 h-[58px] w-[58px] flex-shrink-0 overflow-hidden rounded-full">
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-bold text-white">{title}</span>
                              <span className="mt-0.5 block text-[12px] leading-snug" style={{ color: 'rgba(199,184,240,0.55)' }}>
                                {desc}
                              </span>
                            </span>
                            {/* Radio de seleção — a gramática visual de "escolha uma" */}
                            <span
                              aria-hidden="true"
                              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200"
                              style={{
                                border: selected
                                  ? '1.5px solid rgba(196,181,253,0.95)'
                                  : '1.5px solid rgba(196,181,253,0.45)',
                                background: selected ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.04)',
                                boxShadow: selected ? '0 0 12px rgba(167,139,250,0.6)' : 'none',
                              }}
                            >
                              {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: '#E9DEFF' }} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Rodapé tranquilizador — coração centralizado acima */}
                    <div className="mt-7 flex flex-col items-center gap-2 px-2 text-center">
                      <Heart className="h-4 w-4" style={{ color: 'rgba(196,181,253,0.72)' }} fill="currentColor" />
                      <p className="text-[12.5px] leading-relaxed" style={{ color: 'rgba(214,203,250,0.78)' }}>
                        Não existe resposta certa.
                        <br />
                        Isso só ajuda a acompanhar seu ritual.
                      </p>
                    </div>

                    {/* Saída sem responder — a pergunta não é mais terminal. */}
                    <button
                      onClick={skipToOffer}
                      className="mt-5 text-[13px] font-semibold underline-offset-4 transition-colors hover:underline"
                      style={{ color: 'rgba(196,181,253,0.7)' }}
                    >
                      Ver as próximas noites
                    </button>
                  </>
                ) : (
                  <>
                    {/* Eyebrow ✦ (abaixo da lua da imagem) */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="mb-4 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-3 w-3" style={{ color: 'rgba(196,181,253,0.5)' }} />
                      <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(196,181,253,0.6)' }}>
                        Noite 1 · concluída
                      </p>
                      <Sparkles className="h-3 w-3" style={{ color: 'rgba(196,181,253,0.5)' }} />
                    </motion.div>

                    {/* Headline fixa — continuidade direta (não varia por resposta) */}
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, duration: 0.5 }}
                      className="mb-4 font-display text-[28px] font-bold leading-tight text-white"
                      style={{ textShadow: '0 2px 24px rgba(0,0,0,0.7)' }}
                    >
                      Você concluiu a <span style={{ color: '#C4B5FD' }}>Noite 1.</span>
                    </motion.p>

                    {/* Corpo — aponta para a Noite 2 */}
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.24, duration: 0.5 }}
                      className="mb-8 text-[16px] leading-relaxed"
                      style={{ color: 'rgba(214,203,250,0.78)' }}
                    >
                      A Noite 2 continua esse processo: soltar o controle da mente.
                    </motion.p>

                    {/* Card de progresso — 1 de 7 noites concluídas */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.36, duration: 0.5 }}
                      className="eco-glass-lg mb-7 w-full rounded-2xl p-4"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ background: 'rgba(124,58,237,0.28)', border: '1px solid rgba(167,139,250,0.4)' }}
                        >
                          <Sparkles className="h-3.5 w-3.5" style={{ color: '#E9DEFF' }} />
                        </span>
                        <span className="text-[13px] font-semibold" style={{ color: 'rgba(232,226,255,0.9)' }}>
                          1 de 7 noites concluídas
                        </span>
                      </div>
                      <div className="mt-3 flex gap-1.5">
                        {Array.from({ length: 7 }).map((_, i) =>
                          i === 0 ? (
                            // Celebração: o segmento da Noite 1 PREENCHE na entrada
                            // (0→100% + glow) — meio segundo de recompensa antes do
                            // CTA aparecer. É o beat emocional da conquista.
                            <motion.span
                              key={i}
                              className="h-1.5 flex-1 rounded-full"
                              style={{
                                background: 'linear-gradient(90deg, #C4B5FD, #7C3AED)',
                                transformOrigin: 'left',
                              }}
                              initial={{ scaleX: 0, boxShadow: '0 0 0px rgba(167,139,250,0)' }}
                              animate={{ scaleX: 1, boxShadow: '0 0 12px rgba(167,139,250,0.7)' }}
                              transition={{ delay: 0.45, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                            />
                          ) : (
                            <span
                              key={i}
                              className="h-1.5 flex-1 rounded-full"
                              style={{ background: 'rgba(255,255,255,0.10)' }}
                            />
                          ),
                        )}
                      </div>
                    </motion.div>

                    {/* CTA roxo — gramática de CONTINUIDADE ("Continuar para a Noite 2"),
                        não de inventário: consistente com a headline da oferta que abre
                        em seguida. Entra DEPOIS do beat da barra preenchendo. */}
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.85 }}
                      onClick={goToOffer}
                      className="flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
                      style={{
                        background: 'linear-gradient(135deg, #A78BFA 0%, #6D42C9 100%)',
                        boxShadow: '0 10px 30px rgba(107,79,187,0.42), inset 0 1px 0 rgba(255,255,255,0.22)',
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      Continuar para a Noite 2
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>

                    {/* Fine-print — só o essencial ANTES do clique (o próximo passo é
                        pago); o detalhamento (bônus, Pix, sem assinatura) fica na
                        oferta price-first que abre em seguida. */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.0 }}
                      className="mt-3 text-center text-[12px] leading-snug"
                      style={{ color: 'rgba(199,184,240,0.55)' }}
                    >
                      {priceLabel(price)} · pagamento único
                    </motion.p>
                  </>
                )}
              </motion.div>
            )}

            {/* ── offer (suave, sem timer) ── */}
            {step === 'offer' && (
              <motion.div
                key="offer"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Confete de chegada — só quando a oferta abriu vinda da conquista
                    da Noite 1 (goToOffer/skipToOffer setam confettiOn). */}
                {confettiOn && <SonoConfettiBurst onDone={() => setConfettiOn(false)} />}

                {/* Eyebrow ✦ — conquista quando a Noite 1 foi concluída; catálogo
                    neutro pra quem chegou por noite bloqueada/banner sem concluir. */}
                <div className="mb-3 flex items-center justify-center gap-2">
                  <Sparkles className="h-3 w-3" style={{ color: 'rgba(196,181,253,0.5)' }} />
                  <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(196,181,253,0.6)' }}>
                    {night1Done ? 'Noite 1 concluída' : 'Ritual Boa Noite · 7 noites'}
                  </p>
                  <Sparkles className="h-3 w-3" style={{ color: 'rgba(196,181,253,0.5)' }} />
                </div>

                {/* Headline — personalizada pela resposta da reflexão (a pessoa acabou
                    de nos dizer como o corpo dela está; a página usa isso a favor).
                    Variante medida no "Oferta vista" via headline_variant. */}
                <h2
                  className="mb-3 font-display text-[27px] font-bold leading-tight text-white"
                  style={{ textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}
                >
                  {offerAnswer === 'yes' ? (
                    <>
                      Sentiu o corpo soltar?{' '}
                      <span style={{ color: '#C4B5FD' }}>Isso foi só a Noite 1.</span>
                    </>
                  ) : offerAnswer === 'little' ? (
                    <>
                      Seu corpo começou a desacelerar.{' '}
                      <span style={{ color: '#C4B5FD' }}>As Noites 2–7 terminam o trabalho.</span>
                    </>
                  ) : offerAnswer === 'no' || night1Done ? (
                    <>
                      Uma noite não desliga um alerta de anos.{' '}
                      <span style={{ color: '#C4B5FD' }}>Sete noites, sim.</span>
                    </>
                  ) : (
                    <>
                      Continue para a <span style={{ color: '#C4B5FD' }}>Noite 2.</span>
                    </>
                  )}
                </h2>

                {/* Corpo — RESULTADO, não processo: o que o corpo ganha nas próximas
                    noites. O preço/condições ficam no card logo abaixo. */}
                <p className="mb-5 text-[14px] leading-relaxed" style={{ color: 'rgba(214,203,250,0.72)' }}>
                  {night1Done ? 'Nas próximas 6 noites, seu' : 'Em 7 noites, seu'} corpo aprende a{' '}
                  <span className="font-semibold text-white">apagar sozinho</span> — sem remédio,
                  direto no seu fone.
                </p>

                {/* Prova social — depoimento REAL da landing /sono (projeto não usa
                    fotos em depoimentos). Voz humana antes do preço. */}
                <figure
                  className="mb-6 w-full rounded-2xl px-4 py-3.5 text-left"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <blockquote className="text-[13px] italic leading-relaxed" style={{ color: 'rgba(232,226,255,0.85)' }}>
                    “Eu demorava mais de uma hora para dormir. Depois de alguns dias usando o
                    protocolo comecei a pegar no sono muito mais rápido.”
                  </blockquote>
                  <figcaption className="mt-1.5 text-[11.5px] font-semibold" style={{ color: 'rgba(196,181,253,0.7)' }}>
                    — Mariana
                  </figcaption>
                </figure>

                {/* Lista das 7 noites — hierarquia "feito → próxima → o resto":
                    Noite 1 (✓) e Noite 2 ("A seguir") ganham card cheio; Noites 3–7
                    viram linhas compactas (a lista mostra o VOLUME do protocolo, não
                    precisa repetir o bloqueio 6×). Um cadeado só por linha.
                    No paywall focado desce pra baixo do card (order); baseline = topo. */}
                <div className="mb-6 w-full space-y-2" style={{ order: offerFocused ? 2 : 1 }}>
                  {PROTOCOL_NIGHTS.map((night) => {
                    const isDone = night.night === 1;
                    const isNext = night.night === 2;

                    // Noites 3–7 — linha compacta de meia altura.
                    if (!isDone && !isNext) {
                      return (
                        <div
                          key={night.id}
                          className="flex items-center gap-3 rounded-xl px-3 py-2"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <div
                            className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg"
                            style={{ border: '1px solid rgba(255,255,255,0.10)' }}
                          >
                            {night.imageUrl ? (
                              <img
                                src={night.imageUrl}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                                style={{ filter: 'brightness(0.5) saturate(0.8)' }}
                              />
                            ) : (
                              <div className="h-full w-full" style={{ background: night.gradient }} />
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 items-baseline gap-1.5 text-left">
                            <span className="flex-shrink-0 text-[13px] font-bold" style={{ color: 'rgba(196,181,253,0.85)' }}>
                              Noite {night.night}
                            </span>
                            <span className="truncate text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              {night.title}
                            </span>
                          </div>
                          <Lock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'rgba(196,181,253,0.55)' }} />
                        </div>
                      );
                    }

                    // Noite 1 (concluída) e Noite 2 (a seguir) — card cheio.
                    return (
                      <div
                        key={night.id}
                        className="flex items-center gap-3.5 rounded-2xl p-3"
                        style={{
                          background: isDone ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.04)',
                          border: isDone ? '1px solid rgba(167,139,250,0.40)' : '1px solid rgba(167,139,250,0.22)',
                          boxShadow: isDone ? '0 0 22px rgba(124,58,237,0.18)' : 'none',
                        }}
                      >
                        {/* Miniatura grande — número no canto */}
                        <div
                          className="relative h-[62px] w-[62px] flex-shrink-0 overflow-hidden rounded-xl"
                          style={{ border: isDone ? '1px solid rgba(196,181,253,0.45)' : '1px solid rgba(255,255,255,0.10)' }}
                        >
                          {night.imageUrl ? (
                            <img
                              src={night.imageUrl}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                              style={isDone ? undefined : { filter: 'brightness(0.5) saturate(0.8)' }}
                            />
                          ) : (
                            <div className="h-full w-full" style={{ background: night.gradient }} />
                          )}
                          {/* Número dentro da imagem (canto superior esquerdo) */}
                          <span
                            className="absolute left-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                              background: isDone ? 'linear-gradient(135deg, #C4B5FD, #7C3AED)' : 'rgba(8,5,24,0.72)',
                              color: '#FFFFFF',
                              border: '1px solid rgba(255,255,255,0.30)',
                              backdropFilter: 'blur(4px)',
                            }}
                          >
                            {night.night}
                          </span>
                        </div>

                        {/* Texto — "Noite N" maior/lilás forte + título quebrando */}
                        <div className="flex min-w-0 flex-1 flex-col text-left">
                          <span className="flex items-center gap-2 text-[15px] font-bold leading-tight" style={{ color: '#C4B5FD' }}>
                            Noite {night.night}
                            {isNext && (
                              <span
                                className="flex-shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em]"
                                style={{
                                  background: 'rgba(167,139,250,0.16)',
                                  border: '1px solid rgba(167,139,250,0.4)',
                                  color: '#C4B5FD',
                                }}
                              >
                                A seguir
                              </span>
                            )}
                          </span>
                          <span
                            className="mt-0.5 text-[13px] font-medium leading-snug"
                            style={{ color: isDone ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)' }}
                          >
                            {night.title}
                          </span>
                        </div>

                        {/* Direita: check de vidro (concluída) ou cadeado (fora) */}
                        {isDone ? (
                          <span
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                            style={{
                              background: 'rgba(167,139,250,0.12)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              border: '1.5px solid rgba(167,139,250,0.85)',
                              boxShadow: '0 0 12px rgba(167,139,250,0.55), inset 0 0 8px rgba(167,139,250,0.22)',
                            }}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: '#C4B5FD' }} />
                          </span>
                        ) : (
                          <span
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                            style={{
                              background: 'rgba(167,139,250,0.10)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              border: '1.5px solid rgba(167,139,250,0.6)',
                              boxShadow: '0 0 10px rgba(167,139,250,0.35), inset 0 0 8px rgba(167,139,250,0.18)',
                            }}
                          >
                            <Lock className="h-3.5 w-3.5" style={{ color: '#C4B5FD' }} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bloco do preço (card R$37 + CTA + selo). No paywall focado sobe
                    pro topo (order:1); baseline = depois da lista (order:2). */}
                <div className="flex w-full flex-col items-center" style={{ order: offerFocused ? 1 : 2 }}>
                {/* Card de preço — Pix, pagamento único + bullets */}
                <div
                  className="eco-glass-lg mb-5 w-full rounded-2xl p-4 text-left"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  {/* Preço de lançamento — âncora de tempo HONESTA (este é o preço
                      de entrada e vai subir; quando subir, o riscado "de R$X"
                      passa a ser legítimo). Dourado = único acento quente do card. */}
                  <span
                    className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      background: 'rgba(238,192,121,0.12)',
                      border: '1px solid rgba(238,192,121,0.35)',
                      color: '#EEC079',
                    }}
                  >
                    <Sparkles className="h-3 w-3" />
                    Preço de lançamento
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(124,58,237,0.3))', border: '1px solid rgba(167,139,250,0.4)' }}
                    >
                      <QrCode className="h-5 w-5" style={{ color: '#E9DEFF' }} />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-display text-[20px] font-bold leading-none text-white">
                        {priceLabel(price)}{' '}
                        <span className="text-[14px] font-semibold" style={{ color: 'rgba(214,203,250,0.7)' }}>no Pix</span>
                      </span>
                      {/* Âncora por noite: R$37 vira "R$5,29 por noite" — o número
                          que a pessoa compara com o custo de não dormir. */}
                      <span className="mt-1 text-[12px]" style={{ color: 'rgba(214,203,250,0.55)' }}>
                        pagamento único · {perNightLabel(price)} por noite
                      </span>
                    </div>
                  </div>
                  {/* Checklist: o 1º item carrega a âncora de valor REAL (assinatura
                      R$ 15,90/mês vem de offerCopy, fonte canônica) — funde o que
                      antes eram linha solta + check duplicado de "pagamento único". */}
                  <div className="mt-3.5 space-y-2 border-t pt-3.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {[
                      `Seu pra sempre — menos que 3 meses da assinatura (${OFFER.priceMonthly})`,
                      'Leva menos de 1 minuto no Pix',
                      'Liberação na hora — Noite 2 pronta pra sua próxima noite',
                      'Não ajudou? Devolvemos em até 7 dias',
                    ].map((b) => (
                      <div key={b} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} style={{ color: '#A78BFA' }} />
                        <span className="text-[13px]" style={{ color: 'rgba(232,226,255,0.82)' }}>{b}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bônus EcoDream — value-stack (tema noturno/lua dourada do EcoDream).
                      Honesto como "incluído": o EcoDream vem com a conta criada pós-Pix.
                      Tocável → abre o modal explicativo ("o que é isto?"). */}
                  {ofertaBonus && (
                    <button
                      type="button"
                      onClick={() => {
                        setBonusInfoOpen(true);
                        trackSonoGuestBonusInfoOpened({ source: getSource(), guestId: getGuestId() });
                      }}
                      className="group mt-3.5 flex w-full items-center gap-3 border-t pt-3.5 text-left transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                      aria-label="Saiba mais sobre o bônus EcoDream"
                    >
                      <span
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors"
                        style={{ background: 'rgba(238,192,121,0.14)', border: '1px solid rgba(238,192,121,0.34)' }}
                      >
                        <Moon className="h-4 w-4" style={{ color: '#EEC079' }} fill="currentColor" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: '#EEC079' }}>
                          Bônus · EcoDream
                        </span>
                        <span className="text-[13px] leading-snug" style={{ color: 'rgba(232,226,255,0.82)' }}>
                          Interprete seus sonhos com a Eco
                        </span>
                      </div>
                      {/* Afundância de "tocável": pílula discreta "o que é?" */}
                      <span
                        className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold transition-colors group-hover:brightness-110"
                        style={{ background: 'rgba(238,192,121,0.12)', border: '1px solid rgba(238,192,121,0.28)', color: '#EEC079' }}
                      >
                        <Plus className="h-3 w-3" />
                        o que é?
                      </span>
                    </button>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={startCheckout}
                  className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                    boxShadow: '0 10px 36px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.22)',
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  {ofertaBonus ? 'Liberar as 7 noites + bônus' : 'Liberar Noite 2 e as 7 noites'}
                </button>

                {/* Rodapé */}
                <div className="flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'rgba(196,181,253,0.4)' }} />
                  <span className="text-[11px]" style={{ color: 'rgba(214,203,250,0.45)' }}>
                    Pix · menos de 1 minuto · liberação automática
                  </span>
                </div>

                {/* Urgência HONESTA (sem timer): o protocolo funciona melhor em
                    noites seguidas — liberar agora faz a Noite 2 valer hoje. */}
                <p className="mt-2.5 text-center text-[12px] leading-snug" style={{ color: 'rgba(214,203,250,0.68)' }}>
                  Libere antes de deitar — a Noite 2 já conta pra esta noite.
                </p>
                </div>
                {/* Saída secundária. Guest: "Decidir amanhã" com captura de contato
                    (o lembrete é manual, via ?oferta=1&g=). Free logado: mantém o
                    "Agora não" → app_invite (2ª conversão existente). */}
                {user ? (
                  <button
                    onClick={handleDismiss}
                    className="mt-3 text-[12px] transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)', order: 3 }}
                  >
                    Agora não
                  </button>
                ) : (
                  <div className="mt-3 w-full" style={{ order: 3 }}>
                    {!reminderOpen ? (
                      <button
                        onClick={handleDecideTomorrow}
                        className="mx-auto block text-[12px] transition-colors"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        Decidir amanhã
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div
                          className="rounded-2xl p-4 text-left"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }}
                        >
                          {reminderState === 'done' ? (
                            <div className="text-center">
                              <p className="text-[14px] leading-relaxed text-white">
                                Combinado. Amanhã de manhã te lembramos. Boa noite.
                              </p>
                              <button
                                onClick={handleStayInSono}
                                className="mt-3.5 w-full rounded-full py-3 text-[14px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                                style={{
                                  background: 'rgba(167,139,250,0.18)',
                                  border: '1px solid rgba(167,139,250,0.4)',
                                }}
                              >
                                Voltar ao protocolo
                              </button>
                            </div>
                          ) : (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                void submitReminder();
                              }}
                            >
                              <p className="text-[14px] font-semibold text-white">
                                Sem pressa. Te lembramos amanhã de manhã.
                              </p>
                              <input
                                type="text"
                                value={reminderContact}
                                onChange={(e) => setReminderContact(e.target.value)}
                                placeholder="Seu WhatsApp ou e-mail"
                                autoComplete="on"
                                className="mt-3 w-full rounded-xl px-3.5 py-3 text-[14px] text-white outline-none placeholder:text-white/30 focus:border-white/40"
                                style={{
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.16)',
                                }}
                              />
                              <button
                                type="submit"
                                disabled={reminderState === 'sending' || !reminderContact.trim()}
                                className="mt-3 w-full rounded-full py-3 text-[14px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                                style={{
                                  background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                                }}
                              >
                                Me lembra amanhã
                              </button>
                              <p
                                className="mt-2 text-center text-[11px]"
                                style={{ color: 'rgba(214,203,250,0.45)' }}
                              >
                                Uma mensagem só. Nada de spam.
                              </p>
                            </form>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── pix (inline — substitui o cartão) ── */}
            {step === 'pix' && (
              <motion.div
                key="pix"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex w-full flex-col"
              >
                <SonoInlinePix price={price} guestId={getGuestId()} onPaid={handlePixPaid} />
                <button
                  onClick={handleDismiss}
                  className="mx-auto mt-4 text-[12.5px] transition-colors hover:text-white/60"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Pagar depois
                </button>
              </motion.div>
            )}

            {/* ── save_account (pós-pagamento, SEM pular): a conta é o que entrega
                o acesso de forma durável — o entitlement por guest_id se perde ao
                limpar o navegador ou trocar de aparelho. Quem pagou precisa criar
                a conta pra receber as meditações direito. ── */}
            {step === 'save_account' && (
              <motion.div
                key="save_account"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex w-full flex-col items-center"
              >
                {/* Selo de vidro */}
                <span
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{
                    background: 'rgba(167,139,250,0.12)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1.5px solid rgba(167,139,250,0.7)',
                    boxShadow: '0 0 20px rgba(167,139,250,0.45), inset 0 0 10px rgba(167,139,250,0.2)',
                  }}
                >
                  <ShieldCheck className="h-6 w-6" style={{ color: '#C4B5FD' }} />
                </span>

                {/* Painel de vidro envolvendo o formulário */}
                <div
                  className="eco-glass-lg w-full rounded-3xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 18px 60px rgba(8,5,24,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
                  }}
                >
                  <SonoInlineSignup
                    onCreated={goToApp}
                    returnTo={RETURN_TO}
                    title={
                      <>
                        Suas 7 noites são suas <span style={{ color: '#C4B5FD' }}>pra sempre.</span>
                      </>
                    }
                    subtitle="Último passo: crie sua conta pra receber suas meditações e entrar de qualquer aparelho."
                    submitLabel="Salvar meu acesso"
                  />
                </div>
                {/* Reasseguramento no lugar do antigo "Pular": o pagamento já está
                    garantido — a conta é só a entrega. Sem rota de fuga: sem conta
                    não conseguimos disponibilizar as meditações direito. */}
                <div className="mx-auto mt-4 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: 'rgba(167,139,250,0.8)' }} />
                  <span className="text-[12px]" style={{ color: 'rgba(214,203,250,0.6)' }}>
                    Pagamento confirmado — suas noites ficam guardadas nesta conta.
                  </span>
                </div>
              </motion.div>
            )}

            {/* ── unlocked (sucesso sereno) ── */}
            {step === 'unlocked' && (
              <motion.div
                key="unlocked"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                {/* Selo de vidro — check lilás com anel roxo */}
                <motion.span
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 80, damping: 16 }}
                  className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    background: 'rgba(167,139,250,0.12)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1.5px solid rgba(167,139,250,0.8)',
                    boxShadow: '0 0 26px rgba(167,139,250,0.5), inset 0 0 12px rgba(167,139,250,0.22)',
                  }}
                >
                  <Check className="h-7 w-7" strokeWidth={2.5} style={{ color: '#C4B5FD' }} />
                </motion.span>

                {/* Eyebrow */}
                <div className="mb-3 flex items-center justify-center gap-2">
                  <Sparkles className="h-3 w-3" style={{ color: 'rgba(196,181,253,0.5)' }} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(196,181,253,0.6)' }}>
                    Acesso liberado
                  </p>
                  <Sparkles className="h-3 w-3" style={{ color: 'rgba(196,181,253,0.5)' }} />
                </div>

                <h2
                  className="font-display text-[26px] font-bold leading-snug text-white"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
                >
                  Suas 7 noites estão
                  <br />
                  <span style={{ color: '#C4B5FD' }}>liberadas.</span>
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'rgba(214,203,250,0.62)' }}>
                  Descanse. Elas estarão aqui sempre que você precisar.
                </p>

                <p className="mb-9 mt-4 flex items-center justify-center gap-1.5 text-[12px]" style={{ color: 'rgba(214,203,250,0.45)' }}>
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'rgba(196,181,253,0.6)' }} />
                  Pagamento confirmado · acesso vitalício
                </p>

                <button
                  onClick={handleAfterUnlock}
                  className="w-full rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                    boxShadow: '0 10px 36px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.22)',
                  }}
                >
                  {user ? 'Continuar' : 'Salvar e continuar'}
                </button>
              </motion.div>
            )}

            {/* ── app_invite (ponte leve pro app — free que não pagou) ── */}
            {step === 'app_invite' && (
              <motion.div
                key="app_invite"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 80, damping: 16 }}
                  className="mb-6"
                >
                  <Sparkles className="h-11 w-11" style={{ color: '#C4B5FD' }} />
                </motion.div>
                <h2
                  className="font-display text-[23px] font-bold leading-snug text-white"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
                >
                  Sua conta está pronta.
                  <br />
                  <span style={{ color: '#C4B5FD' }}>Tem muito mais te esperando.</span>
                </h2>
                <p className="mb-8 mt-3 text-[15px] leading-relaxed text-white/50">
                  Você começou pelo sono. No app tem programas, meditações, respirações
                  e a Eco — tudo num lugar só.
                </p>
                <button
                  onClick={handleExploreApp}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                    boxShadow: '0 10px 36px rgba(124,58,237,0.5)',
                  }}
                >
                  Explorar o app
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={handleStayInSono}
                  className="text-[12px] transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Ficar no sono
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Modal explicativo do bônus EcoDream — sobe acima do overlay (z-[9999]). */}
      <SonoEcoDreamBonusModal open={bonusInfoOpen} onClose={() => setBonusInfoOpen(false)} />
    </motion.div>
  );
}

/** Re-export do tipo para conveniência dos consumidores. */
export type { SonoCheckoutStep };
