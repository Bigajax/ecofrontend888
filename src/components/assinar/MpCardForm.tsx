import { useMemo } from "react";
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
  onToken: (formData: Record<string, unknown>) => Promise<void> | void;
  onError?: (message: string) => void;
}

export function MpCardForm({ amount, maxInstallments, onToken, onError }: MpCardFormProps) {
  ensureMpInit();
  const initialization = useMemo(() => ({ amount, payer: { email: "" } }), [amount]);
  const customization = useMemo(
    () => ({ paymentMethods: { minInstallments: 1, maxInstallments } }),
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
