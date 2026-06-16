import { memo, useMemo } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined;
let mpInitialized = false;
function ensureMpInit() {
  if (!mpInitialized && MP_PUBLIC_KEY) {
    initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
    mpInitialized = true;
  }
}

interface MpCardFormProps {
  amount: number;
  maxInstallments: number;
  /** E-mail da conta recém-criada — pré-preenche o campo do brick. */
  payerEmail?: string;
  /**
   * Aparência do brick. 'light' (default) = visual padrão do MP (usado no
   * /assinar, fundo branco). 'dark' = tema escuro + variáveis pra integrar ao
   * checkout inline do sono (fundo navy/violeta).
   */
  appearance?: "light" | "dark";
  onToken: (formData: Record<string, unknown>) => Promise<void> | void;
  /** Brick carregou (Secure Fields prontos) — distingue "visto" de "utilizável". */
  onReady?: () => void;
  onError?: (message: string) => void;
}

// Tema escuro do brick (MercadoPago Bricks customVariables) — alinhado à paleta
// do sono: violeta candlelight, inputs em vidro escuro, texto claro.
const DARK_VISUAL = {
  theme: "dark" as const,
  customVariables: {
    baseColor: "#A78BFA",
    baseColorFirstVariant: "#8B5CF6",
    baseColorSecondVariant: "#6D42C9",
    formBackgroundColor: "transparent",
    inputBackgroundColor: "rgba(255,255,255,0.05)",
    textPrimaryColor: "#FFFFFF",
    textSecondaryColor: "rgba(255,255,255,0.55)",
    outlinePrimaryColor: "rgba(167,139,250,0.45)",
    buttonTextColor: "#0D1120",
    borderRadiusMedium: "14px",
    borderRadiusLarge: "18px",
    borderRadiusFull: "9999px",
  },
};

function MpCardFormImpl({ amount, maxInstallments, payerEmail, appearance = "light", onToken, onReady, onError }: MpCardFormProps) {
  ensureMpInit();
  const initialization = useMemo(
    () => ({ amount, payer: { email: payerEmail ?? "" } }),
    [amount, payerEmail]
  );
  const customization = useMemo(
    () => ({
      paymentMethods: { minInstallments: 1, maxInstallments },
      visual: {
        texts: { formSubmit: "Começar meus 7 dias grátis" },
        ...(appearance === "dark" ? { style: DARK_VISUAL } : {}),
      },
    }),
    [maxInstallments, appearance]
  );

  return (
    <CardPayment
      initialization={initialization}
      customization={customization}
      onSubmit={async (data) => {
        const formData =
          (data as { formData?: Record<string, unknown> })?.formData ??
          (data as unknown as Record<string, unknown>);
        await onToken(formData);
      }}
      onReady={onReady}
      onError={(err) => {
        console.error("mp_brick_error", err);
        onError?.("Erro no formulário de cartão. Recarregue a página e tente de novo.");
      }}
    />
  );
}

// React.memo: o brick do MP não tolera ser recriado. A AssinarPage re-renderiza
// a cada notificação de auth do Supabase (refresh/recover de token); sem o memo,
// o CardPayment reinicializa em loop e os Secure Fields falham
// (fields_setup_failed_after_3_tries). Com props estáveis (ver useCallback em
// AssinarPage), o memo garante que ele monte uma única vez.
export const MpCardForm = memo(MpCardFormImpl);
