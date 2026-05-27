import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/config/apiBase";
import { supabase } from "@/lib/supabaseClient";
import { TrialPlanPanel } from "@/components/assinar/TrialPlanPanel";
import { SignupStep } from "@/components/assinar/SignupStep";
import { MpCardForm } from "@/components/assinar/MpCardForm";
import type { PlanId } from "@/components/assinar/types";

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
  const [step, setStep] = useState<"signup" | "card">(user ? "card" : "signup");
  const [erro, setErro] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Logged-in users (incl. returning from Google OAuth) skip to the card step.
  useEffect(() => {
    if (user) setStep("card");
  }, [user]);

  const selectPlan = (next: PlanId) => {
    setPlan(next);
    const p = new URLSearchParams(params);
    p.set("plan", next);
    setParams(p, { replace: true });
  };

  const handleToken = async (formData: Record<string, unknown>) => {
    setErro(null);
    setProcessing(true);
    try {
      const endpoint = plan === "monthly" ? "/api/subscription/create-with-card" : "/api/payments/annual/card";
      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(formData),
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
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <TrialPlanPanel selectedPlan={plan} onSelectPlan={selectPlan} />

      <div className="flex items-center justify-center bg-white p-8 md:p-12">
        <div className="w-full max-w-md">
          {step === "signup" ? (
            <SignupStep onCreated={() => setStep("card")} googleReturnTo={googleReturnTo} />
          ) : (
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-[22px] font-bold" style={{ color: "#0D3461" }}>
                {plan === "monthly" ? "Comece seu trial de 7 dias" : "Finalize sua assinatura anual"}
              </h2>
              <p className="eco-subtitle text-[14px]" style={{ color: "#5A8AAD" }}>
                {plan === "monthly"
                  ? "R$ 0 hoje. Cobramos R$ 15,90/mês só após 7 dias — cancele quando quiser."
                  : "R$ 142,80 hoje, 1 ano de acesso completo."}
              </p>
              <MpCardForm
                amount={plan === "monthly" ? 15.9 : 142.8}
                maxInstallments={plan === "monthly" ? 1 : 12}
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
    </div>
  );
}
