# useEcoStream Architecture Analysis - Five Critical Issues

## Executive Summary

Detailed analysis of five critical areas in useEcoStream codebase (1400+ lines):
1. Duplicated Stream Detection - race conditions between two check points
2. Ready Timeout Issues - 7s timeout interacts with 15s guard and 30-45s watchdogs
3. Orphaned Events - chunks after done event via three non-synced state flags
4. AbortError Handling - unhandled promise rejections and lost abort reasons
5. Watchdog Timeouts - six different timeout constants with complex interactions

---

## 1. DUPLICATED STREAM DETECTION

### Current Mechanism

Files: streamOrchestrator.ts:108-109, session/StreamSession.ts:326-327, 467-485, 555-569, 665-682

TWO mechanisms prevent duplicates:
- inflightControllers: Map tracking active AbortControllers by clientMessageId
- streamStartLogged: Set tracking which streams have been logged

### Race Condition: Gap Between Cleanup and Reinsert

**Lines 467-485 (Check 1)**:
If exists and aborted, DELETE it. If exists and active, BLOCK.
Between line 485 (delete) and line 573 (insert), normalizedClientId is absent from map.

**Lines 555-573 (Check 2 + Insert)**:
Second check finds null (gap!), creates new controller, inserts it.

**Race Window**: Thread A deletes old, Thread B sees gap, both continue = duplicate stream

### streamStartLogged Never Cleared

Line 672: streamStartLogged.add(normalizedClientId)
Never cleared. Set grows unbounded. All retries flagged as "duplicated".

**Problem**: Permanent warning after first stream attempt

---

## 2. READY TIMEOUT ISSUES

### Six Timeout Constants

READY_TIMEOUT_MS: 7,000 ms (streamOrchestrator.ts:1386)
Guard (default): 15,000 ms (StreamSession.ts:40)
First Token: 30,000 ms (StreamSession.ts:151)
Heartbeat: 45,000 ms (StreamSession.ts:151)
Typing Watchdog: 45,000 ms (StreamSession.ts:42)
Warning: 5,000 ms (streamOrchestrator.ts:2486)

### Key Issue: Timeline Conflicts

Ready fires at 7s
Guard fires at 15s
First token fires at 30s
Heartbeat fires at 45s

No coordination between them. Multiple timeouts can fire for same stream.

### READY_TIMEOUT Flow (lines 1386, 2122-2140)

READY_TIMEOUT_MS = 7000

readyTimeoutHandle set at line 2123
If streamState.readyReceived = false AND controller not aborted:
  Fires at 7 seconds
  Calls abortOnce("watchdog_timeout")
  Sets streamStats.clientFinishReason = "sse_ready_timeout"

clearReadyTimeout() called by:
- handleReadyEvent() when prompt_ready arrives
- clearReadyTimeout() at line 2182 after response

### Guard Timeout (StreamSession.ts:1115-1147)

startFallbackGuardTimer triggers JSON fallback if:
- No first chunk received
- Controller not aborted
- More than guardTimeoutMs (default 15s) elapsed

### Problem: Timing Collision

If SSE slow:
T=7s: READY_TIMEOUT fires -> abortOnce()
T=7.1s: controller aborted
T=15s: Guard timeout fires -> but controller already aborted, guard checks abort and returns early

Result: Sometimes ready wins, sometimes guard wins. Non-deterministic.

---

## 3. ORPHANED EVENTS

### Three Non-Synced Done States

State 1: doneState (streamOrchestrator.ts:2233)
const doneState = { value: false };
Set in onDone handler (streamEvents.ts:655)

State 2: streamState.fallbackRequested (streamOrchestrator.ts:1390)
Set in fallback init (StreamSession.ts:1159)

State 3: controller.signal.aborted
Set when abort called

### processChunk Guards (streamEvents.ts:224-226)

if (controller.signal.aborted) return;
if (streamState.fallbackRequested) return;

MISSING: if (doneState.value) return;

After onDone, chunks can still arrive because:
- onDone sets doneState.value = true
- But doesn't set streamState.fallbackRequested
- processChunk only checks fallbackRequested

### Fallback Doesn't Mark Done (StreamSession.ts:1159)

beginFallback sets fallbackRequested = true
But doesnt set:
- doneState.value = true
- controller.abort()

Result: Chunks process during fallback because neither guard set

---

## 4. ABORTERROR HANDLING

### abortControllerSafely (StreamSession.ts:265-307)

Uses WeakMap to track aborted controllers
Checks: if (controller.signal.aborted || abortedControllers.get(controller))
Calls: controller.abort(reason)

### Issues

Issue 1: WeakMap loses tracking if new controller created
Scenario: Stream A controller1, Retry creates controller2
Result: Same stream can abort twice

Issue 2: Abort reason lost
controller.abort(reason) passes reason
Later: (controller.signal as any).reason = undefined!

Issue 3: Unhandled rejections
Test file has: process.on("unhandledRejection", ...)
AbortError not caught properly
Browser console fills with unhandled promise rejections

---

## 5. WATCHDOG TIMEOUTS

### All Constants Summary

READY_TIMEOUT_MS: 7,000 ms
TYPING_WATCHDOG_MS: 45,000 ms
Guard: 15,000 ms
First Token: 30,000 ms
Heartbeat: 45,000 ms
Warning: 5,000 ms

### Watchdog Mode Transitions (StreamSession.ts:106-178)

idle -> markPromptReady() -> first (30s) -> bumpFirstToken() -> steady (45s)

### Issue: Mode Transition Loss (streamEvents.ts:269-291)

First chunk received:
1. clearFallbackGuardTimer()
2. onFirstChunk callback
3. bumpFirstTokenWatchdog()

Between clearFallback and bumpFirstToken, gap where no guard active.

### Typing Watchdog Never Resets (StreamSession.ts:180-199)

withTypingWatchdog returns fire-once timer
No reset mechanism
If stream active >45s, typing indicator hides even during active chunks

---

## Recommended Timeout Values

Current -> Recommended -> Reason

READY_TIMEOUT_MS: 7000 -> 10000 (Network latency)
Guard: 15000 -> 12000 (Fire before first-token)
First Token: 30000 -> 20000 (Guard catches it first)
Heartbeat: 45000 -> 60000 (Allow slow API pauses)
Typing: 45000 -> 90000 (Don't hide early)
Warning: 5000 -> 8000 (Less confusing)

---

## Critical File Locations

streamOrchestrator.ts:
- 108: inflightControllers, streamStartLogged init
- 1386: READY_TIMEOUT_MS = 7000
- 2486: WARNING_TIMEOUT_MS = 5000
- 2233: doneState = { value: false }

session/StreamSession.ts:
- 40: DEFAULT_STREAM_GUARD_TIMEOUT_MS = 15_000
- 42: TYPING_WATCHDOG_MS = 45_000
- 151: timeoutMs = nextMode === "first" ? 30_000 : 45_000
- 265: abortControllerSafely()
- 467-485: First duplicate check
- 555-569: Second duplicate check
- 665-682: streamStartLogged check
- 1033: StreamFallbackManager class
- 1115: startFallbackGuardTimer()

session/streamEvents.ts:
- 224-226: processChunk guards
- 480: AbortError detection
- 654: onDone guards (doneState.value)
- 665-682: doneState finalization

---

## Quick Fix Checklist

Duplicated Streams:
1. Add atomic lock between checks
2. Clear streamStartLogged after completion
3. Sync all done state flags

Ready Timeout:
1. Increase to 10s
2. Ensure guard (12s) fires after ready
3. Document timeout ordering

Orphaned Events:
1. Add doneState check to processChunk
2. Set all three state flags in onDone
3. Mark done when fallback starts

Abort Handling:
1. Always pass reason to abort()
2. Use Map instead of WeakMap
3. Catch unhandled promise rejections

Watchdog Timeouts:
1. Adjust per table above
2. Make mode transitions atomic
3. Add phase-based timeout system

---

Generated: November 5, 2025
Repository: ecofrontend888
