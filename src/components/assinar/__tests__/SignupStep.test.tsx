import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const register = vi.fn();
const signInWithGoogle = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ register, signInWithGoogle }) }));

import { SignupStep } from "../SignupStep";

const defaultProps = {
  googleReturnTo: "/assinar?plan=monthly&step=card",
  loginReturnTo: "/login?returnTo=%2Fassinar%3Fplan%3Dmonthly%26step%3Dcard",
};

beforeEach(() => {
  register.mockReset().mockResolvedValue({ needsConfirmation: false });
  signInWithGoogle.mockReset().mockResolvedValue(undefined);
});

describe("SignupStep", () => {
  it("shows Google as the first interactive option and only email+password fields", () => {
    render(<SignupStep onCreated={vi.fn()} {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent(/continuar com google/i);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha \(8/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/primeiro nome/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/sobrenome/i)).not.toBeInTheDocument();
    // Único checkbox é a newsletter, opcional e desmarcada.
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(1);
    expect(checkboxes[0]).not.toBeChecked();
  });

  it("blocks submit with invalid email or short password", () => {
    render(<SignupStep onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "nope" } });
    fireEvent.change(screen.getByLabelText(/senha \(8/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    expect(register).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@x.com" } });
    fireEvent.change(screen.getByLabelText(/senha \(8/i), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    expect(register).not.toHaveBeenCalled();
  });

  it("registers without terms checkbox, deriving the name from the email", async () => {
    const onCreated = vi.fn();
    render(<SignupStep onCreated={onCreated} {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@x.com" } });
    fireEvent.change(screen.getByLabelText(/senha \(8/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith("ana@x.com", "12345678", "ana", "");
  });

  it("starts Google sign-in on button click", () => {
    render(<SignupStep onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(signInWithGoogle).toHaveBeenCalled();
  });
});
