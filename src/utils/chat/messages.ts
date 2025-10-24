import type { Message } from "../../contexts/ChatContext";

export type NormalizedSender = "user" | "eco" | undefined;

const isKnownSender = (value: unknown): value is "user" | "eco" =>
  value === "user" || value === "eco";

const resolveRoleString = (message: Message | null | undefined): string | undefined => {
  if (!message) return undefined;
  const role = (message as { role?: unknown }).role;
  return typeof role === "string" ? role : undefined;
};

export const resolveMessageSender = (message: Message | null | undefined): NormalizedSender => {
  if (!message) return undefined;
  const rawSender = (message as { sender?: unknown }).sender;
  if (isKnownSender(rawSender)) {
    return rawSender;
  }

  const role = resolveRoleString(message);
  if (role === "assistant") return "eco";
  if (role === "user") return "user";
  return undefined;
};

export const isEcoMessage = (message: Message | null | undefined): boolean =>
  resolveMessageSender(message) === "eco";

export const isUserMessage = (message: Message | null | undefined): boolean =>
  resolveMessageSender(message) === "user";
