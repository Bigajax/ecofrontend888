import type { Message } from "../../contexts/ChatContext";

export interface EcoStreamResult {
  text: string;
  metadata?: unknown;
  done?: unknown;
  primeiraMemoriaSignificativa?: boolean;
  /**
   * Indica que recebemos "prompt_ready" e/ou "done", porém nenhum token de texto.
   * Útil para alertar o front que o backend encerrou a stream sem conteúdo.
   */
  noTextReceived?: boolean;
  aborted?: boolean;
  status?: number;
}

export interface EcoSseEvent<TPayload = Record<string, any>> {
  type: string;
  payload: TPayload;
  raw: unknown;
  text?: string;
  metadata?: unknown;
  memory?: unknown;
  latencyMs?: number;
  /** Mantém o tipo original reportado pelo backend para debug. */
  originalType?: string;
  /** Canal de origem do evento (ex.: "data", "control"). */
  channel?: string;
  /** Nome bruto informado pelo backend para eventos de controle. */
  name?: string;
}

export interface EcoClientEvent {
  type: string;
  /** Texto incremental fornecido pelo backend (token inicial ou chunk subsequente). */
  delta?: string;
  /** Texto já normalizado para compatibilidade com clientes legados. */
  text?: string;
  /** Alias para conteúdo textual incremental (compatibilidade com novos clientes). */
  content?: string;
  /** Metadados finais/parciais retornados pelo backend. */
  metadata?: unknown;
  /** Payload bruto, incluindo campos específicos da plataforma. */
  payload?: unknown;
  /** Memória persistida informada pelo backend. */
  memory?: unknown;
  /** Latência reportada pelo backend, quando disponível. */
  latencyMs?: number;
  /** Mensagem de erro fornecida pelo backend. */
  message?: string;
  /** Conteúdo original sem pós-processamento. */
  raw?: unknown;
  /** Tipo original emitido pelo backend (para troubleshooting). */
  originalType?: string;
  /** Payload `done` bruto, quando aplicável. */
  done?: unknown;
  /** Canal de origem do evento (ex.: "data", "control"). */
  channel?: string;
  /** Nome bruto informado pelo backend para eventos de controle. */
  name?: string;
}

export interface EcoEventHandlers {
  onEvent?: (event: EcoClientEvent) => void;
  onPromptReady?: (event: EcoSseEvent) => void;
  onFirstToken?: (event: EcoSseEvent) => void;
  onChunk?: (event: EcoSseEvent) => void;
  onDone?: (event: EcoSseEvent) => void;
  onMeta?: (event: EcoSseEvent) => void;
  onMetaPending?: (event: EcoSseEvent) => void;
  onMemorySaved?: (event: EcoSseEvent) => void;
  onLatency?: (event: EcoSseEvent) => void;
  onControl?: (event: EcoSseEvent) => void;
  onError?: (error: Error) => void;
}

export interface EcoStreamChunk {
  index: number;
  text?: string;
  metadata?: unknown;
  interactionId?: string;
  messageId?: string;
  createdAt?: string;
  isFirstChunk?: boolean;
  payload?: unknown;
}

export interface EcoStreamPromptReadyEvent {
  interactionId?: string;
  messageId?: string;
  createdAt?: string;
  payload?: unknown;
}

export interface EcoStreamDoneEvent {
  payload: unknown;
  interactionId?: string;
  messageId?: string;
  createdAt?: string;
}

export interface EcoStreamControlEvent {
  type?: string;
  name?: string;
  payload?: unknown;
  interactionId?: string;
  messageId?: string;
  createdAt?: string;
}

export interface StartEcoStreamOptions {
  history: Message[];
  clientMessageId: string;
  systemHint?: string;
  userId?: string;
  userName?: string;
  guestId?: string;
  isGuest?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  onChunk?: (chunk: EcoStreamChunk) => void;
  onDone?: (event: EcoStreamDoneEvent) => void;
  onError?: (error: unknown) => void;
  onPromptReady?: (event: EcoStreamPromptReadyEvent) => void;
  onControl?: (event: EcoStreamControlEvent) => void;
}
