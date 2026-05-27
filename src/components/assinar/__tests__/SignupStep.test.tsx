import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const register = vi.fn();
const signInWithGoogle = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ register, signInWithGoogle }) }));

import { SignupStep } from "../SignupStep";

beforeEach(() => {
  register.mockReset().mockResolvedValue({ needsConfirmation: false });
  signInWithGoogle.mockReset().mockResolvedValue(undefined);
});

describe("SignupStep", () => {
  it("requires accepting the terms before submitting", () => {
    const onCreated = vi.fn();
    render(<SignupStep onCreated={onCreated} googleReturnTo="/assinar?plan=monthly&step=card" />);
    fireEvent.change(screen.getByLabelText(/primeiro nome/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@x.com" } });
    fireEvent.change(screen.getByLabelText(/senha \(8/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: /criar uma conta/i }));
    expect(register).not.toHaveBeenCalled();
  });

  it("registers and calls onCreated when not needing confirmation", async () => {
    const onCreated = vi.fn();
    render(<SignupStep onCreated={onCreated} googleReturnTo="/assinar?plan=monthly&step=card" />);
    fireEvent.change(screen.getByLabelText(/primeiro nome/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@x.com" } });
    fireEvent.change(screen.getByLabelText(/senha \(8/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByLabelText(/concordo/i));
    fireEvent.click(screen.getByRole("button", { name: /criar uma conta/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith("ana@x.com", "12345678", "Ana", "");
  });

  it("starts Google sign-in on button click", () => {
    render(<SignupStep onCreated={vi.fn()} googleReturnTo="/assinar?plan=monthly&step=card" />);
    fireEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(signInWithGoogle).toHaveBeenCalled();
  });
});
