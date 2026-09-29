import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, migrateGuestData } from "@/contexts/AuthContext";
import { apiUrl } from "@/config/apiBase";
import { supabase } from "@/lib/supabaseClient";
import { SignupStep } from "@/components/assinar/SignupStep";
import { MpCardForm } from "@/components/assinar/MpCardForm";
import { GoalsStep } from "@/components/assinar/GoalsStep";
import { ValidationStep } from "@/components/assinar/ValidationStep";
import { LegalFooter } from "@/components/assinar/LegalFooter";
import { CartaoReino, CadastroReino } from "@/components/assinar/AssinarReino";
import type { PlanId } from "@/components/assinar/types";
import type { GoalId } from "@/components/assinar/goalsData";
import { saveObjetivos, linkUserToObjetivos } from "@/api/onboardingObjetivos";
import { scrollToTop } from "@/utils/scrollToTop";
import {
  setStoredObjetivos,
  setStoredResponseId,
  getStoredResponseId,
  clearStoredResponseId,
} from "@/utils/onboardingObjetivosStorage";
import { PRICE } from "@/constants/offerCopy";
import { getSubscriptionStatus } from "@/api/subscription";
import {
  registerFunilSono,
  trackAssinaturaIniciada,
  trackEtapaVista,
  trackObjetivosEnviados,
  trackPlanoVisto,
  trackPlanoSelecionado,
  trackPlanoConfirmado,
  trackCartaoVisto,
  trackCartaoPronto,
  trackCartaoEnviado,
  trackCartaoRecusado,
  trackCartaoErro,
  trackFunilAbandonado,
  flushCadastroPendenteOnHide,
  flushFunilAbandonadoOnHide,
  marcarSaidaIntencionalDoFunil,
} from "@/lib/mixpanelAssinarFunnel";

const planAmount = (plan: PlanId): number => (plan === "monthly" ? PRICE.monthly : PRICE.annualTotal);

type Step = "goals" | "validation" | "plan" | "signup" | "card";

const STEP_VALUES: readonly Step[] = ["goals", "validation", "plan", "signup", "card"] as const;

function parseStep(value: string | null): Step {
  return (STEP_VALUES as readonly string[]).includes(value ?? "") ? (value as Step) : "goals";
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function parsePlan(value: string | null): PlanId {
  return value === "annual" ? "annual" : "monthly";
}

/**
 * Landing de origem para o "voltar" da logo. Tráfego pago do /sono deve voltar
 * pro /sono (mantém a oferta e o contexto do funil) em vez de cair na home
 * genérica "/". A origem vem do `?from=` do CTA (ex.: "sono_hero").
 */
function originLanding(from: string | null | undefined): string {
  return from?.startsWith("sono") ? "/sono" : "/";
}

// Dedupe do "Assinatura iniciada" em escopo de módulo: o remount por userId do
// RootProviders (pós-signup) remonta a página em ~1s e re-dispararia a entrada
// no funil; re-entradas genuínas (> 5s) continuam contando. Módulo, não useRef,
// porque o ref morre junto no remount.
let lastAssinaturaIniciadaAt = 0;

export default function AssinarPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<PlanId>(parsePlan(params.get("plan")));
  const [step, setStep] = useState<Step>(parseStep(params.get("step")));
  const [erro, setErro] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Já autenticado caindo no step de cadastro (remount pós-signup ou retorno
  // do OAuth): o 1º render já mostra "Verificando sua conta…" em vez de piscar
  // o formulário — sem isso o SignupStep monta e dispara "Cadastro visto" espúrio.
  const [verificandoConta, setVerificandoConta] = useState(
    () => Boolean(user) && parseStep(params.get("step")) === "signup",
  );

  // Quando o step "card" passou a ser exibido — base do elapsed_ms do "Cartão pronto".
  const cardShownAtRef = useRef<number | null>(null);

  // Espelhos em ref para o handler de page-hide (mount-only) ler o valor atual
  // sem re-anexar o listener a cada troca de step. `converted` suprime o
  // "Funil abandonado" quando já estamos navegando pra conversão/app.
  const stepRef = useRef<Step>(step);
  stepRef.current = step;
  const convertedRef = useRef(false);

  // Captura de saída por descarga da página: setTimeout não sobrevive ao fechar
  // aba / back do navegador — o caso quente do funil. Cadastro pendente vira
  // "sem resposta" (visibilidade + pagehide, com proteção do popup Google no
  // módulo); abandono do funil só no pagehide (troca de aba não é abandono).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushCadastroPendenteOnHide("visibility");
    };
    const onPageHide = () => {
      flushCadastroPendenteOnHide("pagehide");
      flushFunilAbandonadoOnHide(stepRef.current, convertedRef.current);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  // Scroll para o topo a cada troca de step (e no mount).
  // Usa scrollToTop() (não só window) porque no mobile o scroller é o #root.
  useEffect(() => {
    scrollToTop();
  }, [step]);

  // Mount: registra a origem do funil (?from= do CTA da landing) como super
  // property, então todo evento subsequente — inclusive Subscription Paid no
  // callback — herda `funnel_source`. sessionStorage é backstop caso o
  // RootProviders remonte e a URL perca o param.
  useEffect(() => {
    const from = params.get("from") || sessionStorage.getItem("eco.assinar.from") || "direct";
    sessionStorage.setItem("eco.assinar.from", from);
    registerFunilSono(from);
    const now = Date.now();
    if (now - lastAssinaturaIniciadaAt > 5_000) {
      lastAssinaturaIniciadaAt = now;
      trackAssinaturaIniciada({ entry_step: step, plan });
    }
    // Só no mount — entrada no funil é evento único.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Funnel: view de cada step (centralizado aqui, não nos componentes filhos).
  // Depende só de `step` — view é emitido uma vez por entrada no step, não a
  // cada toggle de plano. No step "plan", também reusa Premium Screen Viewed
  // (intenção de topo); o toggle mensal/anual é capturado em selectPlan.
  useEffect(() => {
    // Remount pós-signup chega com ?step=signup mas já autenticado e a caminho
    // do cartão ("Verificando sua conta…"): o cadastro não é exibido, então a
    // view de "cadastro" aqui seria artefato.
    if (step === "signup" && verificandoConta) return;
    trackEtapaVista(step);
    if (step === "plan") {
      trackPlanoVisto({
        plan_id: plan,
        price: planAmount(plan),
        is_guest: !user,
        user_id: user?.id,
      });
    }
    if (step === "card") {
      cardShownAtRef.current = Date.now();
      trackCartaoVisto({ plan_id: plan, amount: planAmount(plan) });
    }
    // plan/user lidos no momento do fire; view não deve re-disparar com eles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Sincroniza step na URL (?step=…) sempre que muda
  useEffect(() => {
    const current = params.get("step");
    if (current !== step) {
      const p = new URLSearchParams(params);
      p.set("step", step);
      setParams(p, { replace: true });
    }
  }, [step, params, setParams]);

  // Vincula response a user assim que entramos no step "card" e há sessão + responseId
  useEffect(() => {
    if (step !== "card") return;
    const responseId = getStoredResponseId();
    if (!responseId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const ok = await linkUserToObjetivos(responseId, token);
      if (!cancelled && ok) clearStoredResponseId();
    })();
    return () => { cancelled = true; };
  }, [step, user]);

  // Após o signup criar a sessão, o userId muda e o RootProviders remonta a árvore
  // (ChatProvider/RingsProvider são chaveados por userId), resetando o step pra URL
  // (?step=signup) e atropelando o setStep("card") do onCreated. Aqui recuperamos,
  // decidindo com o status real de assinatura (o isPremiumUser do contexto é
  // refresh assíncrono, não confiável no instante pós-login): quem já é premium
  // não deve recolocar cartão → /app; os demais seguem pro cartão. Erro na
  // consulta → fail-open pro cartão (nunca travar o funil).
  const postSignupRoutedRef = useRef(false);
  useEffect(() => {
    if (!user || step !== "signup" || postSignupRoutedRef.current) return;
    postSignupRoutedRef.current = true;
    let cancelled = false;
    setVerificandoConta(true);
    (async () => {
      // Quem conversou como visitante (ex.: /eco-ia) leva a conversa para a conta
      // nova. Sem dados de visitante, não faz nada; falha nunca trava o funil.
      try {
        await migrateGuestData(user.id);
      } catch {
        // segue sem migrar
      }
      let premium = false;
      try {
        premium = (await getSubscriptionStatus()).isPremium;
      } catch {
        // fail-open: segue pro cartão
      }
      if (cancelled) return;
      setVerificandoConta(false);
      if (premium) {
        convertedRef.current = true; // já é premium — saída do funil não é abandono
        navigate("/app", { replace: true });
      } else {
        setStep("card");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, step, navigate]);

  const selectPlan = (next: PlanId) => {
    setPlan(next);
    const p = new URLSearchParams(params);
    p.set("plan", next);
    setParams(p, { replace: true });
    trackPlanoSelecionado({
      plan_id: next,
      price: planAmount(next),
      is_guest: !user,
      user_id: user?.id,
    });
  };

  const submitObjetivos = async (answers: GoalId[], skipped: boolean, nextStep: Step) => {
    trackObjetivosEnviados({ answers_count: answers.length, skipped });
    setStoredObjetivos({ answers, skipped });
    setStep(nextStep);
    const result = await saveObjetivos({ answers, skipped });
    if (result?.id) setStoredResponseId(result.id);
  };

  const handleGoalsContinue = (answers: GoalId[]) => { void submitObjetivos(answers, false, "validation"); };
  const handleGoalsSkip = () => { void submitObjetivos([], true, "plan"); };

  const continueFromPlan = () => {
    trackPlanoConfirmado({ plan_id: plan, is_authenticated: !!user });
    setStep(user ? "card" : "signup");
  };

  // O plano deixou de ser uma tela (set/2026): quem entra por ?step=plan segue
  // direto para a conta (ou para o cartão, se já está logado), onde o plano é
  // escolhido. "Plano visto" e "Plano confirmado" continuam saindo aqui para os
  // funis do Mixpanel não perderem a primeira etapa.
  useEffect(() => {
    if (step === "plan" && !authLoading) continueFromPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, authLoading]);

  // useCallback com identidade estável (só muda com o plano): evita que o brick do
  // MercadoPago seja recriado a cada re-render da página (ver React.memo em MpCardForm).
  const handleToken = useCallback(async (formData: Record<string, unknown>) => {
    setErro(null);
    setProcessing(true);
    trackCartaoEnviado({ plan_id: plan, amount: planAmount(plan) });
    try {
      const res = await fetch(apiUrl("/api/subscription/create-with-card"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ ...formData, plan }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Não foi possível concluir a assinatura.");
      }
      // Premium status é ativado pelo webhook MercadoPago no backend.
      // Frontend não escreve em usuarios.tipo_plano direto pra evitar race conditions.
      convertedRef.current = true; // não contar como "Funil abandonado" no unload
      navigate("/app/subscription/callback");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado.";
      trackCartaoRecusado({ plan_id: plan, error_message: message });
      setErro(message);
    } finally {
      setProcessing(false);
    }
  }, [plan, navigate]);

  // Erro do brick MP (carregamento/validação): além de exibir, instrumenta —
  // distingue "brick quebrado" de recusa de pagamento na leitura do funil.
  // useCallback: o brick é React.memo e não tolera prop recriada a cada render.
  const handleBrickError = useCallback(
    (message: string) => {
      setErro(message);
      trackCartaoErro({ plan_id: plan, error_message: message });
    },
    [plan],
  );

  // Brick carregou: quanto tempo o usuário esperou olhando o step do cartão.
  const handleBrickReady = useCallback(() => {
    const shownAt = cardShownAtRef.current;
    trackCartaoPronto({
      plan_id: plan,
      elapsed_ms: shownAt ? Date.now() - shownAt : -1,
    });
  }, [plan]);

  // Origem do funil (do ?from= do CTA, com backstop em sessionStorage).
  const from = params.get("from") || sessionStorage.getItem("eco.assinar.from") || "";

  // Logo "voltar" preserva a landing de origem (tráfego do /sono volta pro /sono).
  const backTo = originLanding(from);

  // Retornos que preservam o funil (plano, step do cartão e origem) após
  // login/cadastro externo — evita cair de volta no início do /assinar e
  // mantém a atribuição (funnel_source).
  const funnelReturnTo = `/assinar?plan=${plan}&step=card${from ? `&from=${encodeURIComponent(from)}` : ""}`;
  const loginReturnTo = `/login?returnTo=${encodeURIComponent(funnelReturnTo)}`;

  // Larguras alvo por step no desktop. Validação ganha mais espaço pro grid 2-col.
  // O brick do cartão, o mesmo nos dois visuais (props estáveis, ver MpCardForm).
  // Espera a sessão resolver antes de montar: a initialization (payer.email)
  // precisa estar estável no mount, porque o brick do MP não tolera ser recriado.
  const formularioCartao = authLoading ? (
    <p className="py-6 text-center text-[13px]" style={{ color: "#4B5070" }}>
      Carregando…
    </p>
  ) : (
    <MpCardForm
      // Trocar de plano aqui é uma remontagem limpa (o valor muda), nunca o
      // brick se recriando sozinho num re-render.
      key={plan}
      amount={plan === "monthly" ? 15.9 : 142.8}
      maxInstallments={1}
      payerEmail={user?.email ?? ""}
      appearance="papel"
      onToken={handleToken}
      onReady={handleBrickReady}
      onError={handleBrickError}
    />
  );

  // Duas telas no reino: a conta, depois plano + cartão juntos. O "voltar" leva
  // para onde a pessoa estava (a landing de origem, ou o app).
  const destinoVoltar = user ? "/app" : backTo;
  const voltar = () => {
    trackFunilAbandonado({ step, destino: destinoVoltar });
    marcarSaidaIntencionalDoFunil();
    navigate(destinoVoltar);
  };
  const voltarRotulo = user ? "Voltar ao reino" : "Voltar";

  if (step === "plan" || step === "signup") {
    // "plan" é só passagem (links antigos e as landings entram por ele); o
    // redirecionamento acontece no efeito acima, depois da sessão resolver.
    return (
      <CadastroReino onVoltar={voltar} voltarRotulo={voltarRotulo}>
        {step === "plan" || verificandoConta ? (
          <p aria-live="polite" className="reino-assinar__miudo">
            {step === "plan" ? "Abrindo…" : "Verificando sua conta…"}
          </p>
        ) : (
          <SignupStep onCreated={() => setStep("card")} funnelReturnTo={funnelReturnTo} loginReturnTo={loginReturnTo} />
        )}
      </CadastroReino>
    );
  }
  if (step === "card") {
    return (
      <CartaoReino
        plan={plan}
        onSelectPlan={selectPlan}
        onVoltar={voltar}
        voltarRotulo={voltarRotulo}
        formulario={formularioCartao}
        processando={processing}
        erro={erro}
      />
    );
  }

  // Daqui para baixo, só objetivos e validação (legado: as landings entram
  // direto no plano).
  const stepMaxWidthMd = step === "validation" ? "md:max-w-[760px]" : "md:max-w-[460px]";

  return (
    <div className="relative flex min-h-screen flex-col bg-white md:bg-[#1554F0]">
      {/* Camada decorativa do fundo — só no desktop. Blobs suaves + sparkles. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
      >
        {/* Glow rosado direita */}
        <div className="absolute -right-40 top-1/3 h-[560px] w-[560px] rounded-full bg-[#FFB8C8] opacity-30 blur-3xl" />
        {/* Glow branco esquerda */}
        <div className="absolute -left-32 bottom-20 h-[440px] w-[440px] rounded-full bg-white opacity-15 blur-3xl" />
        {/* Glow azul claro topo */}
        <div className="absolute -top-32 left-1/3 h-[400px] w-[400px] rounded-full bg-[#9EC9FF] opacity-25 blur-3xl" />
        {/* Sparkles */}
        <div className="absolute right-[14%] top-[12%] h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        <div className="absolute left-[9%] top-[28%] h-1 w-1 rounded-full bg-white/60" />
        <div className="absolute right-[22%] bottom-[24%] h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
        <div className="absolute left-[16%] bottom-[14%] h-1 w-1 rounded-full bg-white/50" />
        <div className="absolute right-[8%] top-[55%] h-1 w-1 rounded-full bg-white/60" />
      </div>

      <header className="relative z-10 bg-white px-5 py-6">
        <Link
          to={backTo}
          aria-label="Ecotopia — início"
          className="inline-block"
          onClick={() => {
            trackFunilAbandonado({ step, destino: backTo });
            marcarSaidaIntencionalDoFunil(); // SPA nav não dispara pagehide, mas evita duplo
          }}
        >
          <img src="/images/ecotopia-logo-trim.webp" alt="Ecotopia" className="h-7 w-auto" />
        </Link>
      </header>

      <main className={`relative z-10 mx-auto w-full flex-1 ${stepMaxWidthMd} md:py-8`}>
        {step === "goals" && (
          <GoalsStep onContinue={handleGoalsContinue} onSkip={handleGoalsSkip} />
        )}

        {step === "validation" && (
          <ValidationStep onContinue={() => setStep("plan")} onBack={() => setStep("goals")} />
        )}

      </main>

      <LegalFooter />
    </div>
  );
}
