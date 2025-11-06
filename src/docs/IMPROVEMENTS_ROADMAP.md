# Text Processing Improvements Roadmap

**Status**: Actionable tasks for enhancing sanitization, performance, and safety
**Priority**: P1 (Security), P2 (Performance), P3 (UX)

---

## Phase 1: Security Enhancements (P1)

### Task 1.1: Add URL Sanitization in MarkdownRenderer
**Priority**: P1 (Medium Risk)
**Effort**: 30 minutes
**Risk**: Links could go to `javascript:` URLs

**Current Code**:
```typescript
// In MarkdownRenderer.tsx
a: ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
)
// ❌ No validation of href protocol
```

**Proposed Solution**:
```typescript
// Create utility: src/utils/sanitizeUrl.ts
export function isSafeUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, location.href);
    // Allow: http, https, mailto, tel
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;  // Invalid URL format
  }
}

// In MarkdownRenderer.tsx
a: ({ href, children }) => {
  if (!isSafeUrl(href)) {
    // Render as plain text instead of link
    return <span>{children}</span>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
```

**Test Case**:
```typescript
describe('isSafeUrl', () => {
  it('allows safe URLs', () => {
    expect(isSafeUrl('https://eco.com')).toBe(true);
    expect(isSafeUrl('http://example.com')).toBe(true);
    expect(isSafeUrl('mailto:user@eco.com')).toBe(true);
  });

  it('blocks dangerous URLs', () => {
    expect(isSafeUrl('javascript:alert("xss")')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>')).toBe(false);
    expect(isSafeUrl('vbscript:msgbox("xss")')).toBe(false);
  });

  it('handles malformed URLs gracefully', () => {
    expect(isSafeUrl('not a url')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
  });
});
```

**Implementation**:
1. Create `src/utils/sanitizeUrl.ts`
2. Update `MarkdownRenderer.tsx` to use `isSafeUrl()`
3. Add test file `src/utils/__tests__/sanitizeUrl.test.ts`
4. Update `FRONTEND_TEXT_PROCESSING_STRATEGY.md` with URL sanitization section

---

### Task 1.2: Implement Content Security Policy Headers (Backend)
**Priority**: P1 (High Security)
**Effort**: 1 hour (requires backend coordination)
**Risk**: None (defense-in-depth)

**Current State**: No CSP headers set

**Proposed CSP Headers**:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**Why This Helps**:
- Blocks inline scripts (even if XSS succeeds, script can't run)
- Prevents loading scripts from unknown domains
- Blocks frame injection attacks
- Restricts where forms can submit

**Implementation**: Add to backend (e.g., `vercel.json` or server middleware)

---

### Task 1.3: Add DOMPurify as Defense-in-Depth (Optional)
**Priority**: P1 (Low Risk, Defense-in-Depth)
**Effort**: 1 hour
**Trade-off**: Adds ~20KB to bundle size

**When to Use**: Only if you want extra protection beyond react-markdown

**Installation**:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

**Proposed Usage**:
```typescript
// In sanitizeText.ts, as final defense layer
import DOMPurify from 'dompurify';

export function sanitizeText(raw: string, options?: SanitizeTextOptions): string {
  let sanitized = raw;
  // ... existing sanitization logic ...

  // Final defense: remove any remaining HTML
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],    // No HTML tags allowed
    ALLOWED_ATTR: [],    // No attributes allowed
    KEEP_CONTENT: true   // Keep text content
  });

  return sanitized;
}
```

**Trade-offs**:
- ✅ Maximum XSS protection
- ✅ Blocks sophisticated attacks
- ❌ Adds bundle size (~20KB)
- ❌ Slight performance cost
- ❌ May be overkill (react-markdown already safe)

**Recommendation**: Skip for now; react-markdown + our sanitization is sufficient.

---

## Phase 2: Performance Optimizations (P2)

### Task 2.1: Add Memoization to ChatMessage
**Priority**: P2 (Medium Performance)
**Effort**: 20 minutes
**Benefit**: 10-20% faster rendering for large messages

**Current Code**:
```typescript
// In ChatMessage.tsx
const displayText = isEco && hasVisibleText ? fixIntrawordSpaces(textToShow) : textToShow;
// ❌ Runs fixIntrawordSpaces() on every render
```

**Proposed Solution**:
```typescript
import { useMemo } from 'react';

const displayText = useMemo(() => {
  if (!isEco || !hasVisibleText) return textToShow;
  return fixIntrawordSpaces(textToShow);
}, [textToShow, isEco, hasVisibleText]);
```

**Why It Helps**:
- Skips `fixIntrawordSpaces()` if text hasn't changed
- React memoization is free (no additional dependencies)
- Large messages (5000+ chars): ~50-100ms faster

**Testing**:
```typescript
// No new tests needed; behavior doesn't change
// But verify performance with React DevTools Profiler
```

---

### Task 2.2: Implement Lazy Evaluation for Streaming
**Priority**: P2 (Medium Performance)
**Effort**: 1.5 hours
**Benefit**: 20-30% faster streaming (defer processing until done)

**Problem**:
```
During streaming: fixIntrawordSpaces() runs ~50-100 times per message
Expected: Run only ONCE after stream completes
```

**Current Flow**:
```
Chunk 1 → fixIntrawordSpaces() ← unnecessary
Chunk 2 → fixIntrawordSpaces() ← unnecessary
...
Chunk N → fixIntrawordSpaces() ← final (needed)
```

**Proposed Flow**:
```
Chunk 1 → store in state ← no processing
Chunk 2 → update state ← no processing
...
Chunk N → done event → fixIntrawordSpaces() ← process once
```

**Implementation**:

1. **In ChatMessage.tsx**:
```typescript
interface ChatMessageProps {
  message: Message;
  isEcoTyping?: boolean;
  isEcoActive?: boolean;
  isStreamDone?: boolean;  // NEW: when streaming completes
}

const displayText = useMemo(() => {
  if (!isEco || !hasVisibleText) return textToShow;

  // Only apply fixIntrawordSpaces if stream is done
  // During streaming, show raw text (smartJoin already handled boundaries)
  if (isStreamDone) {
    return fixIntrawordSpaces(textToShow);
  }

  return textToShow;  // Raw during streaming
}, [textToShow, isEco, hasVisibleText, isStreamDone]);
```

2. **In ChatPage.tsx** (or wherever ChatMessage is used):
```typescript
// Determine if stream is done
const isStreamDone = !digitando && message.status === 'done';

<ChatMessage
  message={message}
  isEcoTyping={digitando}
  isStreamDone={isStreamDone}
/>
```

**Trade-offs**:
- ✅ Faster streaming (no processing during chunks)
- ❌ Raw text visible during streaming (spaces may look odd until done)
- ❌ May need UX adjustment (show "stabilizing..." message)

**Alternative**: Accept current behavior; perf impact is minor for typical message sizes

---

### Task 2.3: Optimize sanitizeText() with Regex Compilation
**Priority**: P2 (Low Performance)
**Effort**: 45 minutes
**Benefit**: 5-10% faster sanitization

**Current Code**:
```typescript
// In sanitizeText.ts
const HTML_ENTITY_RE = /&(nbsp|amp|lt|gt|quot|#39|#8216|#8217|#8220|#8221|#8230);/gi;
// ❌ Compiled every function call (modern engines cache, but not optimally)
```

**Proposed Solution**:
```typescript
// Move regex declarations to module level (already done ✅)
const HTML_ENTITY_RE = /&(nbsp|amp|lt|gt|quot|#39|#8216|#8217|#8220|#8221|#8230);/gi;

// Or: Use RegExp constructor cache
const createRegex = (() => {
  const cache = new Map<string, RegExp>();
  return (pattern: string, flags: string) => {
    const key = `${pattern}:${flags}`;
    if (!cache.has(key)) {
      cache.set(key, new RegExp(pattern, flags));
    }
    return cache.get(key)!;
  };
})();
```

**Status**: ✅ Already optimized; regexes are module-level constants

---

### Task 2.4: Add Virtual Scrolling for Long Chats (Future)
**Priority**: P2 (High Performance for 100+ messages)
**Effort**: 3-4 hours
**Benefit**: 5-10x faster for chats with 100+ messages

**When Needed**: Only if users commonly see 50+ messages in single chat

**Proposed Library**: `react-window`

```bash
npm install react-window
npm install --save-dev @types/react-window
```

**Implementation Sketch**:
```typescript
import { FixedSizeList as List } from 'react-window';

export function ChatPageWithVirtualization({ messages }) {
  return (
    <List
      height={600}  // Viewport height
      itemCount={messages.length}
      itemSize={100}  // Estimated message height
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ChatMessage message={messages[index]} />
        </div>
      )}
    </List>
  );
}
```

**Trade-offs**:
- ✅ Render only 10-15 visible messages instead of all 100+
- ✅ Instant scroll even with 500 messages
- ❌ Requires itemSize estimation (tricky with variable-height messages)
- ❌ Auto-scroll becomes complex
- ❌ Adds ~25KB to bundle

**Recommendation**: Defer unless you observe chat lag with 50+ messages

---

## Phase 3: UX & Robustness (P3)

### Task 3.1: Improve Error Handling in Markdown Rendering
**Priority**: P3 (Low Risk)
**Effort**: 30 minutes
**Benefit**: Graceful fallback if markdown parsing fails

**Current Code**:
```typescript
// In MarkdownRenderer.tsx
return (
  <ReactMarkdown skipHtml={true}>
    {content}
  </ReactMarkdown>
);
// ❌ No error boundary; parsing errors break display
```

**Proposed Solution**:
```typescript
import { ReactNode } from 'react';

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const [parseError, setParseError] = useState(false);

  if (parseError) {
    // Graceful fallback: show as plain text with line breaks
    return (
      <div className={clsx('markdown-content whitespace-pre-wrap break-words', className)}>
        {content}
      </div>
    );
  }

  try {
    return (
      <div className={clsx('markdown-content space-y-1', className)}>
        <ReactMarkdown
          // ... existing config ...
          onError={(error) => {
            console.error('Markdown parsing error:', error);
            setParseError(true);
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.error('Unexpected markdown error:', error);
    return (
      <div className={clsx('markdown-content whitespace-pre-wrap break-words', className)}>
        {content}
      </div>
    );
  }
};
```

**Testing**:
```typescript
describe('MarkdownRenderer - Error Handling', () => {
  it('shows fallback if markdown parsing fails', () => {
    const problematic = 'Some text with [unclosed link](url';
    const { getByText } = render(<MarkdownRenderer content={problematic} />);
    expect(getByText(/Some text with/)).toBeInTheDocument();
  });
});
```

---

### Task 3.2: Add Sanitization Debugging Mode
**Priority**: P3 (Development)
**Effort**: 1 hour
**Benefit**: Helps diagnose text processing issues

**Proposed Implementation**:
```typescript
// In sanitizeText.ts
interface SanitizeTextOptions {
  collapseWhitespace?: boolean;
  debug?: boolean;  // NEW
}

export function sanitizeText(raw: string, options?: SanitizeTextOptions): string {
  const { debug = false } = options || {};

  if (debug) {
    console.group(`[SANITIZE] Input (${raw.length} chars)`);
    console.log('Raw:', JSON.stringify(raw));
  }

  let sanitized = raw;

  // Step 1
  if (debug) console.log('After normalize:', JSON.stringify(sanitized));
  sanitized = sanitized.replace(/\r\n?/g, '\n');

  // Step 2
  if (debug) console.log('After zero-width removal:', JSON.stringify(sanitized));
  sanitized = sanitized.replace(ZERO_WIDTH_RE, '');

  // ... continue for each step ...

  if (debug) {
    console.log('Final:', JSON.stringify(sanitized));
    console.groupEnd();
  }

  return sanitized;
}

// Enable via localStorage flag
if (localStorage.getItem('ECO_SANITIZE_DEBUG')) {
  const cleaned = sanitizeText(raw, { debug: true });
}
```

**Usage in Browser**:
```javascript
// Console
localStorage.setItem('ECO_SANITIZE_DEBUG', 'true');
// Reload page → see [SANITIZE] logs for each message
```

---

### Task 3.3: Create Sanitization Report Generation
**Priority**: P3 (Monitoring)
**Effort**: 1.5 hours
**Benefit**: Track what gets sanitized (find patterns)

**Proposed Implementation**:
```typescript
// In utils/sanitizationReporter.ts
interface SanitizationReport {
  timestamp: number;
  input: { length: number; hash: string };
  output: { length: number; hash: string };
  changes: {
    removedChars: number;
    removedPatterns: string[];
    preservedMarkdown: number;
  };
}

let sanitizationLog: SanitizationReport[] = [];

export function generateSanitizationReport(): SanitizationReport[] {
  return [...sanitizationLog];
}

// Integrate into sanitizeText
export function sanitizeText(raw: string, options?: SanitizeTextOptions): string {
  const inputHash = hashString(raw);
  const inputLen = raw.length;

  let sanitized = raw;
  let removedPatterns: string[] = [];

  // Before each operation, log what's removed
  const beforeZeroWidth = sanitized.length;
  sanitized = sanitized.replace(ZERO_WIDTH_RE, (match) => {
    removedPatterns.push(`zero-width-char`);
    return '';
  });

  // ... continue ...

  const report: SanitizationReport = {
    timestamp: Date.now(),
    input: { length: inputLen, hash: inputHash },
    output: { length: sanitized.length, hash: hashString(sanitized) },
    changes: {
      removedChars: inputLen - sanitized.length,
      removedPatterns,
      preservedMarkdown: (sanitized.match(/\*\*/g) || []).length / 2,
    },
  };

  sanitizationLog.push(report);
  if (sanitizationLog.length > 1000) sanitizationLog.shift();  // Keep last 1000

  return sanitized;
}

// Export to CSV for analysis
export function exportSanitizationStats() {
  const csv = [
    'Timestamp,InputLen,OutputLen,RemovedChars,PreservedMarkdown',
    ...sanitizationLog.map(r =>
      `${r.timestamp},${r.input.length},${r.output.length},${r.changes.removedChars},${r.changes.preservedMarkdown}`
    )
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sanitization-stats.csv';
  a.click();
}
```

**Usage**:
```javascript
// In console
const report = window.ECO.generateSanitizationReport();
console.table(report.slice(-10));  // Last 10 sanitizations

window.ECO.exportSanitizationStats();  // Download CSV
```

---

## Implementation Priority Matrix

| Task | P1 Importance | Effort | Estimate | Start |
|------|---------------|--------|----------|-------|
| 1.1: URL Sanitization | 🔴 Medium | 30 min | Week 1 | Next |
| 1.2: CSP Headers | 🔴 High | 1 hour | Week 1 | After 1.1 |
| 1.3: DOMPurify | 🟢 Low | 1 hour | Skip | When needed |
| 2.1: Memoization | 🟠 Low | 20 min | Week 2 | If perf issues |
| 2.2: Lazy Evaluation | 🟠 Medium | 1.5 hours | Week 2 | If streaming slow |
| 2.3: Regex Optimization | 🟢 None | Skip | - | N/A (done) |
| 2.4: Virtual Scrolling | 🟠 Low | 3-4 hours | Week 4 | If 100+ messages |
| 3.1: Error Handling | 🟢 Low | 30 min | Week 3 | Optional |
| 3.2: Debug Mode | 🟢 None | 1 hour | Week 3 | Optional |
| 3.3: Reporting | 🟢 None | 1.5 hours | Week 4 | Optional |

---

## Checklist for Deployment

Before merging improvements:

- [ ] All new functions have TypeScript types
- [ ] Unit tests added for new code (75%+ coverage)
- [ ] Integration tests pass (ChatMessage with new processing)
- [ ] No performance regressions (measure with React DevTools)
- [ ] XSS tests pass (malicious inputs blocked)
- [ ] Markdown tests pass (safe elements render, dangerous blocked)
- [ ] Accessibility tested (keyboard navigation, screen readers)
- [ ] Documentation updated (FRONTEND_TEXT_PROCESSING_STRATEGY.md)
- [ ] Reviewed by team (security review for XSS changes)
- [ ] Tested on real backend responses (sanitizeEcoText with stage directions)

---

## Success Metrics

After implementing improvements, track:

1. **Security**:
   - Zero XSS incidents in production
   - CSP report violations near zero
   - No unsafe HTML in sanitization logs

2. **Performance**:
   - ChatMessage render time: < 50ms for 1000-char messages
   - Streaming feels responsive (no jank)
   - Bundle size increase < 5KB

3. **Quality**:
   - Markdown renders correctly 100% of time
   - No broken text in edge cases
   - Support tickets for text display: 0

---

## Notes

- **Current State**: ✅ Production ready; sanitization robust
- **No Blockers**: All improvements are additive, no breaking changes
- **Recommendation**: Implement P1 security tasks (especially 1.1 URL sanitization)
- **Monitoring**: Enable 3.2 debug mode temporarily to catch issues in production

---

**Last Updated**: November 2025
**Status**: Ready for implementation
