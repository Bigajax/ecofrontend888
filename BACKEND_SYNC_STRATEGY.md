# Backend Sync Strategy

Estratégia para sincronizar dados entre Frontend (localStorage) e Backend (API).

---

## 📊 Current State vs Target State

### Current (Frontend Only - localStorage)
```
User ← → localStorage
```

### Target (Full Backend Integration)
```
User ← → Frontend ← → Backend (PostgreSQL)
  ↓
Device 1 (Phone)  ↓  Device 2 (Tablet)  ↓  Device 3 (Web)
  └──────────────────────────────────────────────────────┘
            Synced Data on Backend
```

---

## 🔄 Sync Architecture

### Phase 1: Hybrid Mode (Recommended for Migration)
**Keeps localStorage as cache, syncs to backend**

```
┌─────────────────────────────────────────┐
│     Frontend Application                │
├─────────────────────────────────────────┤
│  React Component                        │
│         ↓                               │
│  RingsContext / ProgramContext          │
│  (State Management)                     │
│         ↓                               │
│  ┌─────────────────────────────────┐   │
│  │ Local Sync Manager              │   │
│  │ - Cache data (localStorage)     │   │
│  │ - Queue offline changes         │   │
│  │ - Merge conflicts               │   │
│  └─────────────────────────────────┘   │
│         ↓           ↓                   │
│   localStorage   API Client             │
└─────────────────────────────────────────┘
        ↓
   Backend API (PostgreSQL)
```

---

## 📝 Implementation Steps

### Step 1: Create Sync Service

```typescript
// src/services/syncService.ts

interface SyncEvent {
  id: string;
  type: 'ritual' | 'program';
  action: 'create' | 'update' | 'complete';
  data: any;
  timestamp: number;
  synced: boolean;
  syncedAt?: number;
}

class SyncService {
  private syncQueue: SyncEvent[] = [];
  private syncInProgress = false;
  private isOnline = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Auto-sync on interval
    setInterval(() => this.syncQueue(), 30000); // 30 seconds
  }

  /**
   * Queue a sync event (offline-safe)
   */
  queueSync(event: SyncEvent) {
    this.syncQueue.push(event);
    this.persistQueue();
    this.syncQueue();
  }

  /**
   * Main sync loop
   */
  async syncQueue() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      const unsynced = this.syncQueue.filter(e => !e.synced);

      for (const event of unsynced) {
        try {
          await this.syncEvent(event);
          event.synced = true;
          event.syncedAt = Date.now();
        } catch (error) {
          console.error(`Failed to sync event ${event.id}:`, error);
          // Keep trying
        }
      }

      this.persistQueue();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync individual event
   */
  private async syncEvent(event: SyncEvent) {
    switch (event.type) {
      case 'ritual':
        return this.syncRitual(event);
      case 'program':
        return this.syncProgram(event);
    }
  }

  /**
   * Sync ritual changes
   */
  private async syncRitual(event: SyncEvent) {
    const { action, data } = event;

    switch (action) {
      case 'create':
        return fetch('/api/rituals/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify(data)
        });

      case 'update':
        return fetch(`/api/rituals/${data.ritualId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify(data)
        });

      case 'complete':
        return fetch(`/api/rituals/${data.ritualId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify({})
        });
    }
  }

  /**
   * Sync program changes
   */
  private async syncProgram(event: SyncEvent) {
    const { action, data } = event;

    switch (action) {
      case 'create':
        return fetch('/api/programs/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify(data)
        });

      case 'update':
        return fetch(`/api/programs/${data.enrollmentId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify(data)
        });

      case 'complete':
        return fetch(`/api/programs/${data.enrollmentId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify({})
        });
    }
  }

  /**
   * Handle coming online
   */
  private handleOnline() {
    this.isOnline = true;
    console.log('Online - starting sync');
    this.syncQueue();
  }

  /**
   * Handle going offline
   */
  private handleOffline() {
    this.isOnline = false;
    console.log('Offline - queued changes will sync when online');
  }

  /**
   * Persist queue to localStorage
   */
  private persistQueue() {
    localStorage.setItem('eco.sync.queue', JSON.stringify(this.syncQueue));
  }

  /**
   * Load queue from localStorage
   */
  loadQueue() {
    const stored = localStorage.getItem('eco.sync.queue');
    if (stored) {
      this.syncQueue = JSON.parse(stored);
    }
  }

  /**
   * Get auth token
   */
  private getToken(): string {
    return localStorage.getItem('eco.auth.token') || '';
  }
}

export const syncService = new SyncService();
```

---

### Step 2: Update RingsContext

```typescript
// src/contexts/RingsContext.tsx - Key changes

import { syncService } from '@/services/syncService';

export function RingsProvider({ children }: { children: ReactNode }) {
  const [currentRitual, setCurrentRitual] = useState<DailyRitual | null>(null);

  // Load from localStorage first (cache)
  useEffect(() => {
    const cached = loadRitualsFromCache();
    setCurrentRitual(cached);

    // Then sync from backend
    syncRitualsFromBackend();
  }, [userId]);

  // Save ring answer (offline-safe)
  const saveRingAnswer = (ringId: RingType, answer: string, metadata: RingResponse) => {
    const updatedRitual = {
      ...currentRitual,
      answers: [
        ...currentRitual.answers.filter(a => a.ringId !== ringId),
        { ringId, answer, metadata, timestamp: new Date().toISOString() }
      ]
    };

    // Update local state immediately (optimistic)
    setCurrentRitual(updatedRitual);

    // Cache to localStorage
    localStorage.setItem(`eco.ritual.${currentRitual.id}`, JSON.stringify(updatedRitual));

    // Queue for backend sync
    syncService.queueSync({
      id: `sync-${Date.now()}`,
      type: 'ritual',
      action: 'update',
      data: {
        ritualId: currentRitual.id,
        ringId,
        answer,
        metadata
      },
      timestamp: Date.now(),
      synced: false
    });
  };

  // Complete ritual
  const completeRitual = async () => {
    const updated = { ...currentRitual, status: 'completed' };
    setCurrentRitual(updated);
    localStorage.setItem(`eco.ritual.${currentRitual.id}`, JSON.stringify(updated));

    // Queue for sync
    syncService.queueSync({
      id: `sync-${Date.now()}`,
      type: 'ritual',
      action: 'complete',
      data: { ritualId: currentRitual.id },
      timestamp: Date.now(),
      synced: false
    });
  };

  return (
    <RingsContext.Provider value={{ /* ... */ }}>
      {children}
    </RingsContext.Provider>
  );
}
```

---

### Step 3: Update ProgramContext

```typescript
// src/contexts/ProgramContext.tsx - Key changes

export function ProgramProvider({ children }: { children: ReactNode }) {
  const [ongoingProgram, setOngoingProgram] = useState<OngoingProgram | null>(null);

  const updateProgress = (progress: number, currentLesson: string) => {
    if (ongoingProgram) {
      const updated = {
        ...ongoingProgram,
        progress: Math.min(100, Math.max(0, progress)),
        currentLesson,
        lastAccessedAt: new Date().toISOString()
      };

      // Update state
      setOngoingProgram(updated);

      // Cache to localStorage
      localStorage.setItem('eco.ongoingProgram', JSON.stringify(updated));

      // Queue for backend sync
      syncService.queueSync({
        id: `sync-${Date.now()}`,
        type: 'program',
        action: 'update',
        data: {
          enrollmentId: ongoingProgram.id,
          progress,
          currentLesson
        },
        timestamp: Date.now(),
        synced: false
      });
    }
  };

  return (
    <ProgramContext.Provider value={{ /* ... */ }}>
      {children}
    </ProgramContext.Provider>
  );
}
```

---

## 🔀 Conflict Resolution

### Scenario: User edits offline on Device A, online on Device B

```
Device A (Offline)          Device B (Online)
┌──────────────────┐        ┌──────────────────┐
│ Ritual v1 edited │        │ Ritual v1 edited │
│ @ 10:00 (local)  │        │ @ 10:05 (synced) │
└──────────────────┘        └──────────────────┘
        ↓                            ↓
   Queue sync              Sent to Backend
        ↓                            ↓
   Go Online                      v1@10:05
        ↓
    Compare: Local timestamp vs Backend timestamp
        ↓
   Strategy: Last-write-wins (simple)
   OR: User chooses (complex)
```

### Implementation:

```typescript
interface ConflictResolution {
  strategy: 'last-write-wins' | 'local-first' | 'remote-first';
}

async function handleConflict(local: any, remote: any): Promise<any> {
  const strategy = 'last-write-wins'; // or user preference

  switch (strategy) {
    case 'last-write-wins':
      return local.timestamp > remote.timestamp ? local : remote;

    case 'local-first':
      return local;

    case 'remote-first':
      return remote;
  }
}
```

---

## 📱 Multi-Device Sync

### User opens app on Device B while Device A is editing

```
Backend
  │
  ├─ GET /api/rituals → returns latest state
  │
Device A (Phone)        Device B (Tablet)
Syncs every 30s         Polls every 60s
  ↓                       ↓
Updates local cache       Updates local cache
  ↓                       ↓
Both show same data ✓
```

### Polling Implementation:

```typescript
// src/hooks/useBackendSync.ts

export function useBackendSync() {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const remoteRituals = await fetch('/api/rituals?date=' + today, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        }).then(r => r.json());

        const localRituals = loadRitualsFromCache();

        // Merge if timestamps differ
        const merged = mergeRituals(localRituals, remoteRituals);
        setRituals(merged);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, []);
}

function mergeRituals(local: DailyRitual[], remote: DailyRitual[]): DailyRitual[] {
  const merged = [...local];

  for (const remoteRitual of remote) {
    const localIndex = merged.findIndex(r => r.id === remoteRitual.id);

    if (localIndex >= 0) {
      // Compare timestamps - use newest
      if (remoteRitual.updatedAt > merged[localIndex].updatedAt) {
        merged[localIndex] = remoteRitual;
      }
    } else {
      merged.push(remoteRitual);
    }
  }

  return merged;
}
```

---

## 🚀 Migration Path

### Week 1: Infrastructure
- [ ] Create Backend API endpoints
- [ ] Setup database
- [ ] Implement authentication
- [ ] Deploy to staging

### Week 2: Hybrid Integration
- [ ] Create SyncService
- [ ] Update RingsContext
- [ ] Update ProgramContext
- [ ] Test offline/online scenarios

### Week 3: Data Migration
- [ ] Migrate existing localStorage data to backend
- [ ] Verify data integrity
- [ ] User testing

### Week 4: Cleanup
- [ ] Remove localStorage dependency (optional)
- [ ] Performance optimization
- [ ] Production deployment

---

## ✅ Sync Verification Checklist

- [ ] Data saves offline (localStorage)
- [ ] Data syncs when online
- [ ] Sync queue persists across app restart
- [ ] Offline indicator shown to user
- [ ] Sync status visible (icon in header?)
- [ ] Conflicts resolved correctly
- [ ] Multi-device changes merge properly
- [ ] No data loss
- [ ] No duplicate entries
- [ ] Performance acceptable (< 2s sync time)

---

## 📊 Monitoring & Logging

```typescript
// src/utils/syncLogger.ts

export class SyncLogger {
  log(action: string, data: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      data,
      online: navigator.onLine,
      queueSize: syncService.getQueueSize()
    };

    console.log('[Sync]', entry);

    // Send to analytics
    if (window.analytics) {
      window.analytics.track('sync_event', entry);
    }
  }
}
```

---

## 🎯 Success Metrics

- ✅ 100% of rituals/programs synced within 5 minutes
- ✅ 0 data loss in offline scenarios
- ✅ Sync queue < 500ms
- ✅ Multi-device consistency within 60s
- ✅ User notifications for sync status

---

**Last Updated:** November 18, 2025
**Version:** 1.0
