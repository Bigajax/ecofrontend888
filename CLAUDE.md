# ECO Frontend - Claude Developer Guide

## Quick Start

This is a React 18 + TypeScript frontend application for ECO, an emotional AI assistant. The app provides real-time streaming chat with SSE support, voice interactions, and emotional memory management.

```bash
# Install and run
npm install
npm run dev

# Production build
npm run build
npm run preview
```

## Project Overview

**Stack**: React 18, TypeScript, Vite 5, Tailwind CSS, Supabase Auth
**Architecture**: Context-based state management with SSE streaming orchestration
**Design**: Apple-inspired glassmorphism with accessibility support

## Critical Files to Read First

1. **`src/hooks/useEcoStream/streamOrchestrator.ts`** - Core SSE streaming engine (1400+ lines)
2. **`src/contexts/ChatContext.tsx`** - Message state management with localStorage persistence
3. **`src/pages/ChatPage.tsx`** - Main chat interface with suggestions, feedback, and voice panel
4. **`src/api/ecoApi.ts`** - API client with SSE support and retry logic

## Architecture Summary

### Entry Flow
```
main.tsx → App.tsx → RootProviders → Routes → ChatPage
   ↓          ↓           ↓             ↓         ↓
AbortController  AppChrome  Auth+Chat  Lazy Load  Stream
Instrumentation  Health Check  Context  Pages     Orchestrator
```

### Key Directories

```
src/
├── pages/           # Route components (ChatPage, VoicePage, Memory sections)
├── components/      # Reusable UI (ChatMessage, ChatInput, AudioPlayerOverlay)
├── contexts/        # Global state (AuthContext, ChatContext)
├── hooks/           # Business logic (useEcoStream, useFeedback, useActivity)
├── api/             # HTTP clients and SSE handling
├── lib/             # External integrations (Supabase, Mixpanel, Pixel)
└── utils/           # Helpers (identity, storage, sanitization)
```

## Core Concepts

### 1. Streaming Architecture

The app uses Server-Sent Events (SSE) for real-time AI responses:

```typescript
// Message flow
User Input → ChatInput → useEcoStream → streamOrchestrator → SSE Connection
                ↓            ↓               ↓                    ↓
            ChatContext  beginStream    StreamSession      chunkProcessor
                ↓            ↓               ↓                    ↓
            localStorage  Watchdogs    Event Processing    UI Updates
```

**Key SSE Events**:
- `prompt_ready`: Triggers typing animation
- `chunk`: Incremental text tokens
- `control`: Runtime adjustments
- `done`: Finalizes message with metadata
- `error`: Triggers fallback to JSON mode

### 2. State Management

**ChatContext**: Centralized message store with:
- Per-user localStorage persistence (`eco.chat.v1.<userId>`)
- Fast lookups via `byId`, `interaction`, `clientMessageId` indexes
- Automatic normalization and sanitization
- Upsert support for streaming updates

**AuthContext**: Supabase session management with:
- OAuth and email authentication
- Automatic cleanup on logout
- Mixpanel identity sync
- Guest tracking

### 3. Identity System

Three-tier identity tracking:
- **guestId**: Anonymous browser fingerprint
- **sessionId**: Per-session identifier
- **userId**: Authenticated Supabase user

Headers sent with every API call:
```
x-eco-guest-id: <uuid>
x-eco-session-id: <uuid>
x-eco-client-message-id: <uuid>
```

## Key Components

### ChatMessage
Renders conversation bubbles with streaming support:
- Real-time token display during SSE
- Typing animation with elapsed time
- Fallback for empty responses
- Metadata badges (finishReason)

### ChatInput
Message composer with:
- Auto-expanding textarea
- Enter to send (Shift+Enter for newline)
- Voice recording integration
- Sanitization and validation

### AudioPlayerOverlay
Floating audio player for TTS responses:
- WebAudio API gain control (1.35x amplification)
- Progress tracking
- Manual play support for blocked autoplay

### VoicePage
Voice interaction prototype:
- WebRTC recording to WebM
- AssemblyAI transcription via backend
- ElevenLabs TTS synthesis
- Animated avatar states

## API Integration

### Main Endpoints

**`POST /api/ask-eco`** (SSE or JSON)
- Streaming chat responses
- Fallback to JSON on timeout
- Identity headers required

**`GET /api/perfil-emocional`**
- Emotional profile with 60s cache
- Dashboard insights data

**`POST /api/voice/transcribe-and-respond`**
- Complete voice flow
- WebM → Transcription → Response → TTS

**Memory CRUD**
- Standard REST operations
- Tag filtering and search
- Similarity scoring

### Error Handling

Layered error system:
1. **Network errors** (status 0): Retry with health check
2. **HTTP errors** (4xx/5xx): User-friendly messages
3. **SSE timeouts**: Automatic JSON fallback
4. **Abort reasons**: `watchdog_timeout`, `user_cancelled`, `finalize`

## Streaming Deep Dive

### StreamOrchestrator Flow

1. **Session Creation**: Validates clientMessageId, aborts previous streams
2. **URL Resolution**: Builds `/api/ask-eco` with environment fallbacks
3. **Watchdog Setup**: First token timeout + continuous heartbeat
4. **Event Processing**: Routes SSE events to handlers
5. **Fallback Manager**: JSON retry on guard timeout
6. **Finalization**: Consolidates text, metadata, and telemetry

### Critical Timeouts
- First token: 12s watchdog
- Heartbeat: 30s continuous
- JSON fallback: Triggers if no chunks in guard period

### Message Updates
```typescript
// During streaming
upsertMessage({
  id: messageId,
  content: accumulatedText,
  status: 'streaming',
  metadata: { chunkIndex, interactionId }
})

// On completion
upsertMessage({
  id: messageId,
  content: finalText,
  status: 'done',
  metadata: { 
    finishReason, 
    latencyMs, 
    module_combo,
    eco_score 
  }
})
```

## UI/UX Guidelines

### Design System
- **Glassmorphism**: Translucent surfaces with backdrop-blur
- **Color Tokens**: CSS variables in `:root` for consistency
- **Typography**: SF Pro with system fallbacks
- **Accessibility**: Respects `prefers-reduced-motion`, `prefers-contrast`

### Component Styling
```css
/* Glass effect pattern */
.glass-component {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

/* Focus states */
:focus-visible {
  outline: 2px solid #007AFF;
  outline-offset: 2px;
}
```

### Animation Patterns
- Spring animations via Framer Motion
- Typing dots for loading states
- Scale on tap for buttons
- Smooth scroll with `scrollIntoView`

## Development Workflow

### Local Setup
```bash
# Environment variables
cp .env.example .env
# Configure Supabase, API URLs, and optional services

# Development
npm run dev         # Hot reload on :5173
npm run lint        # ESLint + Prettier
npm run test        # Vitest unit tests
```

### Build & Deploy
```bash
# Production build
npm run build       # Creates dist/
npm run preview     # Test production build

# Vercel deployment
# - Build command: npm run build
# - Output directory: dist
# - Configure VITE_* env vars in dashboard
```

### API Proxy (vercel.json)
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.eco.com/api/:path*" },
    { "source": "/health", "destination": "https://api.eco.com/health" }
  ]
}
```

## Common Patterns

### Adding a New Feature
1. Create context if needed (e.g., VoiceContext)
2. Add API client in `src/api/`
3. Build hook for business logic
4. Create UI components
5. Update routing in App.tsx

### Handling Streaming Data
```typescript
// Use the existing orchestrator
const { handleSendMessage, streaming, digitando } = useEcoStream();

// Block during stream
<button disabled={streaming}>Send</button>

// Show typing indicator
{digitando && <TypingDots />}
```

### Persisting User Data
```typescript
// Use ChatContext pattern
const key = `eco.feature.v1.${userId}`;
localStorage.setItem(key, JSON.stringify(data));

// Clear on logout via AuthContext
```

## Testing Strategy

### Unit Tests
- Components: Rendering, props, interactions
- Hooks: State transitions, side effects
- Utils: Pure functions, transformations

### Integration Tests
- API clients with MSW mocks
- Context providers with test wrappers
- SSE streaming with event simulation

### E2E Considerations
- Guest flow restrictions
- Authentication states
- Streaming timeouts
- Error boundaries

## Performance Optimizations

### Current Optimizations
- Lazy loading for routes
- Message indexing for O(1) lookups
- 60s cache for profile API
- Debounced text analysis
- Virtual scrolling ready (not yet implemented)

### Monitoring
- Mixpanel for user analytics
- Facebook Pixel for marketing
- Custom abort instrumentation
- Stream latency tracking

## Security Considerations

### Implemented
- Supabase RLS for data isolation
- HTTPS enforcement for API calls
- XSS prevention via React
- CORS handled by backend

### Best Practices
- Never store sensitive data in localStorage
- Validate and sanitize all inputs
- Use environment variables for secrets
- Implement rate limiting (backend responsibility)

## Troubleshooting

### Common Issues

**SSE Not Working**
- Check CORS headers
- Verify HTTPS in production
- Test with `curl` for raw SSE

**Authentication Loops**
- Clear localStorage
- Check Supabase URL/keys
- Verify redirect URLs

**Memory Leaks**
- Review useEffect cleanups
- Check abort controller usage
- Verify event listener removal

### Debug Tools
```typescript
// Enable verbose logging
localStorage.setItem('ECO_DEBUG', 'true');

// Monitor SSE events
window.addEventListener('eco:stream:event', console.log);

// Check identity
console.log({
  guestId: localStorage.getItem('eco.guestId'),
  sessionId: sessionStorage.getItem('eco.sessionId')
});
```

## Future Enhancements

### Planned Features
- Virtual scrolling for long chats
- Offline mode with service workers
- WebSocket alternative to SSE
- Advanced voice features
- Collaborative sessions

### Technical Debt
- Extract VoiceContext from VoicePage
- Implement message pagination
- Add comprehensive error boundaries
- Upgrade to React 19 when stable
- Consider Zustand for complex state

## Resources

### Internal Documentation
- [API_CLIENTS.md](./API_CLIENTS.md) - API client details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [COMPONENTS_OVERVIEW.md](./COMPONENTS_OVERVIEW.md) - Component API
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - State patterns
- [STREAM_ORCHESTRATION.md](./STREAM_ORCHESTRATION.md) - SSE details
- [BUILD_DEPLOY.md](./BUILD_DEPLOY.md) - Deployment guide
- [UI_STYLE_GUIDE.md](./UI_STYLE_GUIDE.md) - Design system

### External Links
- [Supabase Docs](https://supabase.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)
- [React 18 Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)

## Quick Reference

### File Patterns
```typescript
// API Client
export const apiClient = {
  async method(params) {
    const response = await apiFetchJson('/endpoint', params);
    return normalize(response);
  }
};

// Custom Hook
export function useFeature() {
  const [state, setState] = useState();
  useEffect(() => {
    // setup
    return () => { /* cleanup */ };
  }, []);
  return { state, actions };
}

// Context Provider
const Context = createContext<State>(defaultState);
export function Provider({ children }) {
  const value = useProviderLogic();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

### Component Template
```tsx
interface Props {
  required: string;
  optional?: boolean;
  onAction: (value: string) => void;
}

export function Component({ required, optional = false, onAction }: Props) {
  const { contextValue } = useContext(AppContext);
  const [local, setLocal] = useState('');
  
  useEffect(() => {
    // Side effects
    return () => { /* Cleanup */ };
  }, [dependency]);
  
  return (
    <div className="glass-surface rounded-xl p-4">
      {/* Component JSX */}
    </div>
  );
}
```

---

*Last updated: November 2024*
*ECO Frontend v1.0*