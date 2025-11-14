import type {
  EcoStreamChunk,
  EcoStreamControlEvent,
  EcoStreamDoneEvent,
  EcoStreamPromptReadyEvent,
} from "../../api/ecoStream";
import { collectTexts } from "../../api/askEcoResponse";
import type { Message as ChatMessageType, UpsertMessageOptions } from "../../contexts/ChatContext";
import type { EnsureAssistantEventMeta, MessageTrackingRefs, ReplyStateController } from "./messageState";
import { applyMetaToStreamStats, buildEcoRequestBody, extractFinishReasonFromMeta } from "./requestBuilder";
import type {
  EnsureAssistantMessageFn,
  InteractionMapAction,
  RemoveEcoEntryFn,
  StreamRunStats,
  StreamSharedContext,
} from "./types";
import {
  applyChunkToMessages,
  extractText,
  extractSummaryRecord,
  mergeReplyMetadata,
  processSseLine,
  type ProcessSseHandlers,
} from "./chunkProcessor";
import { pickNumberFromRecords, pickStringArrayFromRecords, pickStringFromRecords, toCleanString } from "./utils";
import { handlePromptReady, handleChunk, handleDone, handleError, handleControl } from "./streamEventHandlers";
import type { DoneContext } from "./streamEventHandlers";
import {
  createDefaultTimers,
  createSseWatchdogs,
  withTypingWatchdog,
  type StreamRunnerTimers,
  type CloseReason,
  type BeginStreamParams,
} from "./session/StreamSession";
import { createStreamRunner as createStreamRunnerImpl, type StreamRunnerDeps } from "./streamRunner";

export type {
  StreamRunStats,
  StreamSharedContext,
  EnsureAssistantMessageFn,
  RemoveEcoEntryFn,
  InteractionMapAction,
} from "./types";
export type { StreamRunnerTimers, CloseReason, BeginStreamParams } from "./session/StreamSession";
export { handlePromptReady, handleChunk, handleDone, handleError, handleControl } from "./streamEventHandlers";
export type { DoneContext } from "./streamEventHandlers";
export type { StreamRunnerDeps } from "./streamRunner";

export interface StreamRunnerFactoryOptions {
  fetchImpl?: typeof fetch;
  timers?: StreamRunnerTimers;
  watchdogFactory?: (
    id: string,
    timers: StreamRunnerTimers,
  ) => ReturnType<typeof createSseWatchdogs>;
  typingWatchdogFactory?: (
    id: string,
    onTimeout: () => void,
    timers: StreamRunnerTimers,
  ) => () => void;
  skipFetchInTest?: boolean;
}

export const resolveStreamRunnerDeps = (
  options: StreamRunnerFactoryOptions = {},
): StreamRunnerDeps => {
  const timers = options.timers ?? createDefaultTimers();
  const fetchImpl =
    typeof options.fetchImpl === "function"
      ? options.fetchImpl
      : typeof globalThis.fetch === "function"
        ? (globalThis.fetch as typeof fetch)
        : undefined;

  const watchdogFactory: StreamRunnerDeps["watchdogFactory"] =
    typeof options.watchdogFactory === "function"
      ? (id: string) => options.watchdogFactory!(id, timers)
      : (id: string) => createSseWatchdogs(id, timers);

  const typingWatchdogFactory: StreamRunnerDeps["typingWatchdogFactory"] =
    typeof options.typingWatchdogFactory === "function"
      ? (id: string, onTimeout: () => void) => options.typingWatchdogFactory!(id, onTimeout, timers)
      : (id: string, onTimeout: () => void) => withTypingWatchdog(id, onTimeout, timers);

  return {
    fetchImpl,
    timers,
    watchdogFactory,
    typingWatchdogFactory,
    skipFetchInTest: options.skipFetchInTest,
  };
};

export const beginStream = (
  params: BeginStreamParams,
  options?: StreamRunnerFactoryOptions,
  isRetry = false,
): Promise<StreamRunStats> | void => {
  const deps = resolveStreamRunnerDeps(options);
  const runner = createStreamRunnerImpl(deps);
  return runner.beginStream(params, isRetry);
};

export const createStreamRunner = (options: StreamRunnerFactoryOptions = {}) =>
  createStreamRunnerImpl(resolveStreamRunnerDeps(options));

export {
  collectTexts,
  applyMetaToStreamStats,
  buildEcoRequestBody,
  extractFinishReasonFromMeta,
  applyChunkToMessages,
  extractText,
  extractSummaryRecord,
  mergeReplyMetadata,
  processSseLine,
  pickNumberFromRecords,
  pickStringArrayFromRecords,
  pickStringFromRecords,
  toCleanString,
  type ProcessSseHandlers,
  type EcoStreamChunk,
  type EcoStreamControlEvent,
  type EcoStreamDoneEvent,
  type EcoStreamPromptReadyEvent,
  type ChatMessageType,
  type UpsertMessageOptions,
  type EnsureAssistantEventMeta,
  type MessageTrackingRefs,
  type ReplyStateController,
};
