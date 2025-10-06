# ChatPage refactor & test plan

## Pain points identified
- **All responsibilities in a single component** – `ChatPage` mixes data fetching, stream management, scroll behaviour, analytics, UI rendering and transient feature flags in ~1000 lines.【F:src/pages/ChatPage.tsx†L5-L339】
- **Large block of imperative streaming code** – the `handleSendMessage` function handles persistence, context assembly, streaming handlers, mixpanel events and UI mutations in one place, which makes it difficult to test or reuse.【F:src/pages/ChatPage.tsx†L320-L848】
- **Cross-cutting UI state management** – scroll anchoring, feedback prompts and quick suggestion visibility are controlled by effect chains inside the page, hiding the intent of each behaviour.【F:src/pages/ChatPage.tsx†L168-L319】【F:src/pages/ChatPage.tsx†L852-L958】

## Suggested module split
1. **Utility & configuration extraction**
   - Move `ensureSessionId`, greeting helpers and deep-question detection helpers into `/src/utils/chat/` (e.g., `session.ts`, `greetings.ts`, `deepQuestion.ts`) for isolated unit tests.【F:src/pages/ChatPage.tsx†L36-L130】
   - Extract `ROTATING_ITEMS` and `OPENING_VARIATIONS` into a constants module so marketing/content can update without touching the page component.【F:src/pages/ChatPage.tsx†L114-L130】

2. **Custom hooks for stateful concerns**
   - `useChatScroll` to own scroll refs, `scrollToBottom`, `handleScroll`, and the viewport listeners (returning `scrollerRef`, `isAtBottom`, `showScrollBtn`, and `scrollToBottom`).【F:src/pages/ChatPage.tsx†L176-L268】
   - `useFeedbackPrompt` to encapsulate the feedback session storage checks, deep-question clearing and prompt visibility (accepting `messages`, returning `showFeedback`, `lastEcoInfo`, handlers).【F:src/pages/ChatPage.tsx†L270-L343】【F:src/pages/ChatPage.tsx†L900-L934】
   - `useQuickSuggestionsVisibility` to centralise visibility toggles tied to user typing and initial state, so the component only wires props into `QuickSuggestions`.【F:src/pages/ChatPage.tsx†L344-L412】【F:src/pages/ChatPage.tsx†L916-L944】

3. **Streaming & analytics service layer**
   - Create a `useEcoStream` hook or service that accepts `{ text, systemHint, sessionId }` and returns `{ streamMessage, status, error }`, exposing callbacks for UI updates. Move the large `handlers` object and metric reporting logic into this layer so it can be unit-tested with fake streams and mocked `mixpanel`.【F:src/pages/ChatPage.tsx†L412-L848】
   - Split persistence (saving messages, fetching memories) into async helpers (`persistUserMessage`, `loadMemoryContext`) that return plain data. This allows simple unit tests with mocked API clients and isolates API error handling.【F:src/pages/ChatPage.tsx†L344-L496】
   - Extract Mixpanel tracking helpers (e.g., `trackStreamMetrics`, `trackQuickSuggestion`) to `/src/lib/analytics/eco.ts` to keep side-effects in one place and ease mocking.【F:src/pages/ChatPage.tsx†L180-L216】【F:src/pages/ChatPage.tsx†L514-L859】

4. **Presentational layer**
   - After extracting logic, reduce `ChatPage` to wiring hooks and rendering (`messages`, `typing`, `feedback`, layout). This makes the JSX readable and allows future layout changes without touching business logic.【F:src/pages/ChatPage.tsx†L860-L1018】

## Testing strategy
- **Pure utility tests**: add Vitest suites for the moved helpers (`ensureSessionId`, `saudacaoDoDiaFromHour`, deep-question detectors). These are deterministic and easy to snapshot or table-test.【F:src/pages/ChatPage.tsx†L36-L112】
- **Hook tests**:
  - Use `@testing-library/react`'s `renderHook` to validate `useChatScroll` behaviours (initial scroll to bottom, button visibility, cleanup of listeners). Simulate scroll positions via mock elements.
  - Test `useFeedbackPrompt` using fake message arrays to ensure it only shows prompts after deep questions and records storage keys.
  - Test `useEcoStream` by stubbing `enviarMensagemParaEco` with a controllable async iterator; assert that UI callbacks fire in the right order and metrics are produced.
- **Integration tests**:
  - Create a component-level test that renders `ChatPage` with providers but mocked contexts/APIs, then drives `handleSendMessage` via `ChatInput` to verify rendered messages and typing indicators.
  - Use MSW to mock network responses for the streaming service and memory lookups to ensure the hook orchestrates API fallbacks correctly.

## Isolation milestones
1. Extract utilities + constants (pure refactor, add unit tests for them).
2. Introduce `useChatScroll` and `useFeedbackPrompt`, update component to consume hooks, add hook tests.
3. Move streaming orchestration into `useEcoStream`, replacing inline logic; add tests with mocked API stream and mixpanel.
4. Gradually adopt integration tests around the slimmed `ChatPage` to guard against regressions while continuing to peel off smaller responsibilities.
