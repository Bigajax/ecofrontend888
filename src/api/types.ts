import type { EcoEventHandlers, EcoStreamResult } from "./ecoStream";

export interface Message {
  id?: string;
  role: string;
  content: string;
}

export type GuestResolution = {
  guestId: string;
  isGuest: boolean;
};

export type RequestPreparation = {
  headers: Record<string, string>;
  payload: Record<string, unknown>;
};

export type EnviarMensagemOptions = {
  guestId?: string;
  isGuest?: boolean;
  signal?: AbortSignal;
  stream?: boolean;
  clientMessageId?: string;
};

export type StreamExecutionArgs = {
  headers: Record<string, string>;
  payload: Record<string, unknown>;
  streamUrl: string;
  handlers: EcoEventHandlers;
  signal?: AbortSignal;
  networkErrorMessage: string;
};

export type HandleStreamResponseArgs = {
  response: Response;
  handlers: EcoEventHandlers;
  signal?: AbortSignal;
  networkErrorMessage: string;
};

export type StreamResponseResult = {
  result: EcoStreamResult;
  streamOpened: boolean;
};

export type AbortCleanup = {
  cleanup: () => void;
  signal?: AbortSignal;
};
