import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: vi.fn(),
  CardPayment: ({ onSubmit }: { onSubmit: (d: any) => void }) => (
    <button onClick={() => onSubmit({ formData: { token: "tok_1", payment_method_id: "visa" } })}>
      pay-brick
    </button>
  ),
}));

import { MpCardForm } from "../MpCardForm";

describe("MpCardForm", () => {
  it("calls onToken with the brick formData", async () => {
    const onToken = vi.fn().mockResolvedValue(undefined);
    render(<MpCardForm amount={15.9} maxInstallments={1} onToken={onToken} />);
    fireEvent.click(screen.getByText("pay-brick"));
    await waitFor(() => expect(onToken).toHaveBeenCalledWith({ token: "tok_1", payment_method_id: "visa" }));
  });
});
