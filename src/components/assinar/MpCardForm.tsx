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
  onToken: (formData: Record<string, unknown>) => Promise<void> | void;
  onError?: (message: string) => void;
}

function MpCardFormImpl({ amount, maxInstallments, payerEmail, onToken, onError }: MpCardFormProps) {
  ensureMpInit();
  const initialization = useMemo(
    () => ({ amount, payer: { email: payerEmail ?? "" } }),
    [amount, payerEmail]
  );
  const customization = useMemo(
    () => ({
      paymentMethods: { minInstallments: 1, maxInstallments },
      visual: { texts: { formSubmit: "Começar meus 7 dias grátis" } },
    }),
    [maxInstallments]
  );

  return (
    <CardPayment
      initialization={initialization}
      customization={customization}
      onSubmit={async (data) => {
        const formData =
          (data as { formData?: Record<string, unknown> })?.formData ?? (data as Record<string, unknown>);
        await onToken(formData);
      }}
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
