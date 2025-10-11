# ecoApi.ts Refactor Notes

## Implemented Modular Structure
The original 800+ line `ecoApi.ts` was decomposed into dedicated modules to isolate responsibilities:

1. **`src/api/errors.ts`** – owns `EcoApiError`.
2. **`src/api/environment.ts`** – exposes `isDev`/`hasWindow` utilities reused across modules.
3. **`src/api/guestIdentity.ts`** – encapsulates guest ID normalization, persistence and generation.
4. **`src/api/askEcoResponse.ts`** – centralises AskEco payload typings plus `collectTexts`, `normalizeAskEcoResponse`, and `unwrapPayload`.
5. **`src/api/ecoStream.ts`** – contains the SSE parser, buffering logic, and `processEventStream`/`parseNonStreamResponse` helpers along with public stream types.
6. **`src/api/ecoApi.ts`** – now focuses on request assembly, Supabase token resolution, and delegating to the stream/non-stream parsers.

This mirrors the originally proposed split while keeping the public API (`enviarMensagemParaEco`) intact for existing callers.

## Testing Recommendations
Create Vitest suites alongside the new modules:

- **askEcoResponse.spec.ts** – cover `collectTexts`, `normalizeAskEcoResponse`, `unwrapPayload` permutations.
- **ecoStream.spec.ts** – feed synthetic SSE chunks to validate callback invocations, aggregation fallback, and `noTextReceived` signalling; cover `[DONE]`, malformed JSON, and latency/meta events.
- **guestIdentity.spec.ts** – mock `window.localStorage` to assert persistence behaviour and crypto fallbacks.
- **ecoApi.spec.ts** – leverage `msw` to assert request headers/body composition and to simulate both stream and non-stream responses.

## Isolation Opportunities
- Inject fetch implementation and Supabase session retrieval to allow deterministic tests without global side effects.
- Add a lightweight event emitter wrapper to simplify callback subscription management in React hooks.
- Surface a `createEcoRequest(payload, context)` helper (now largely encapsulated in `buildRequestInit`) for standalone validation.

These changes shrink the "hairiest" module into focused, testable units while providing a roadmap for future coverage.
