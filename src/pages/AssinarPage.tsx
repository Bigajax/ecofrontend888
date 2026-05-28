import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/config/apiBase";
import { supabase } from "@/lib/supabaseClient";
import { PlanStep } from "@/components/assinar/PlanStep";
import { SignupStep } from "@/components/assinar/SignupStep";
import { MpCardForm } from "@/components/assinar/MpCardForm";
import type { PlanId } from "@/components/assinar/types";

type Step = "plan" | "signup" | "card";

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

export default function AssinarPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanId>(parsePlan(params.get("plan")));
  const [step, setStep] = useState<Step>(params.get("step") === "card" ? "card" : "plan");
  const [erro, setErro] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Returning from Google OAuth lands here with ?step=card and an active session.
  useEffect(() => {
    const stored = sessionStorage.getItem("eco.assinar.returnTo");
    if (stored) sessionStorage.removeItem("eco.assinar.returnTo");
    if (params.get("step") === "card") setStep("card");
  }, [params]);

  const selectPlan = (next: PlanId) => {
    setPlan(next);
    const p = new URLSearchParams(params);
    p.set("plan", next);
    setParams(p, { replace: true });
  };

  const continueFromPlan = () => setStep(user ? "card" : "signup");

  const handleToken = async (formData: Record<string, unknown>) => {
    setErro(null);
    setProcessing(true);
    try {
      // Ambos os planos são assinatura recorrente com 7 dias de trial (R$0 hoje).
      const res = await fetch(apiUrl("/api/subscription/create-with-card"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ ...formData, plan }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Não foi possível concluir a assinatura.");
      }
      navigate("/app/subscription/callback");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setProcessing(false);
    }
  };

  const googleReturnTo = `/assinar?plan=${plan}&step=card`;

  return (
    <div className="min-h-screen bg-white">
      {/* Só a logo (sem nav/CTA) — clicável, leva à home da landing */}
      <header className="px-5 py-6">
        <Link to="/" aria-label="Ecotopia — início" className="inline-block">
          <img src="/images/ecotopia-logo-trim.png" alt="Ecotopia" className="h-7 w-auto" />
        </Link>
      </header>
      <div className="mx-auto w-full max-w-[420px] px-5 pb-10">
        {step === "plan" && (
          <PlanStep selectedPlan={plan} onSelectPlan={selectPlan} onContinue={continueFromPlan} />
        )}

        {step === "signup" && (
          <SignupStep onCreated={() => setStep("card")} googleReturnTo={googleReturnTo} />
        )}

        {step === "card" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-center font-display text-[22px] font-bold" style={{ color: "#0D3461" }}>
              Comece seu trial de 7 dias
            </h2>
            <p className="eco-subtitle text-center text-[14px]" style={{ color: "#5A8AAD" }}>
              {plan === "monthly"
                ? "R$ 0 hoje. Cobramos R$ 15,90/mês só após 7 dias — cancele quando quiser."
                : "R$ 0 hoje. Cobramos R$ 142,80/ano só após 7 dias — cancele quando quiser."}
            </p>
            <MpCardForm
              amount={plan === "monthly" ? 15.9 : 142.8}
              maxInstallments={1}
              onToken={handleToken}
              onError={setErro}
            />
            {processing && (
              <p aria-live="polite" className="text-center text-[13px]" style={{ color: "#5A8AAD" }}>Processando…</p>
            )}
            {erro && <p role="alert" className="text-[13px]" style={{ color: "#B43C3C" }}>{erro}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
