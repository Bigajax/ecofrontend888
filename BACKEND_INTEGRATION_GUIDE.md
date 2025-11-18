# Backend Integration Guide — Rings & Programs

Documentação das APIs necessárias no backend para integração 100% com o frontend ECO.

---

## 📋 Índice

1. [Five Rings (Cinco Anéis da Disciplina)](#five-rings)
2. [Programs (Programas)](#programs)
3. [Authentication & Context](#authentication--context)
4. [Data Models](#data-models)
5. [Implementation Roadmap](#implementation-roadmap)

---

## 🎯 Five Rings (Cinco Anéis da Disciplina)

### Current State (Frontend)

- ✅ **Frontend**: Tudo funcionando com localStorage (dados locais)
- ❌ **Backend**: Não há integração — dados não são persistidos no servidor

### Endpoints Necessários

#### 1. **POST /api/rituals/start**
Inicia um novo ritual diário.

**Request:**
```json
{
  "userId": "user-uuid",
  "date": "2025-11-18"
}
```

**Response:**
```json
{
  "id": "ritual-uuid",
  "userId": "user-uuid",
  "date": "2025-11-18",
  "answers": [],
  "status": "in_progress",
  "createdAt": "2025-11-18T10:00:00Z",
  "updatedAt": "2025-11-18T10:00:00Z"
}
```

**Status**: 201 Created
**Error**: 400 se já existe ritual para hoje

---

#### 2. **POST /api/rituals/:ritualId/answer**
Salva resposta de um anel.

**Request:**
```json
{
  "ringId": "earth",
  "answer": "Estava distraído com redes sociais",
  "metadata": {
    "distraction": "Estava distraído com redes sociais",
    "focusReasons": ["redes_sociais"],
    "focusScore": 7
  }
}
```

**Response:**
```json
{
  "id": "ritual-uuid",
  "userId": "user-uuid",
  "date": "2025-11-18",
  "answers": [
    {
      "ringId": "earth",
      "answer": "Estava distraído com redes sociais",
      "metadata": {
        "distraction": "Estava distraído com redes sociais",
        "focusReasons": ["redes_sociais"],
        "focusScore": 7
      },
      "timestamp": "2025-11-18T10:05:00Z"
    }
  ],
  "status": "in_progress",
  "updatedAt": "2025-11-18T10:05:00Z"
}
```

**Status**: 200 OK
**Error**: 404 se ritual não existe, 400 se ringId inválido

---

#### 3. **POST /api/rituals/:ritualId/complete**
Marca ritual como completo.

**Request:**
```json
{
  "completedAt": "2025-11-18T10:30:00Z"
}
```

**Response:**
```json
{
  "id": "ritual-uuid",
  "userId": "user-uuid",
  "date": "2025-11-18",
  "answers": [
    { /* ... 5 respostas completas ... */ }
  ],
  "status": "completed",
  "completedAt": "2025-11-18T10:30:00Z",
  "updatedAt": "2025-11-18T10:30:00Z"
}
```

**Status**: 200 OK
**Error**: 404 se ritual não existe

---

#### 4. **GET /api/rituals/:ritualId**
Recupera um ritual específico.

**Response:**
```json
{
  "id": "ritual-uuid",
  "userId": "user-uuid",
  "date": "2025-11-18",
  "answers": [
    { /* ... todas as 5 respostas ... */ }
  ],
  "status": "completed",
  "completedAt": "2025-11-18T10:30:00Z",
  "updatedAt": "2025-11-18T10:30:00Z"
}
```

**Status**: 200 OK
**Error**: 404 se não encontrado

---

#### 5. **GET /api/rituals**
Lista rituals por data ou período.

**Query Parameters:**
```
?userId=user-uuid
?date=2025-11-18 (YYYY-MM-DD)
?startDate=2025-11-01&endDate=2025-11-30
?status=completed|in_progress|abandoned
```

**Response:**
```json
{
  "data": [
    { /* DailyRitual object */ },
    { /* DailyRitual object */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 45
  }
}
```

**Status**: 200 OK

---

#### 6. **GET /api/rings/progress**
Retorna progresso e estatísticas.

**Query Parameters:**
```
?userId=user-uuid
?period=week|month|year
```

**Response:**
```json
{
  "userId": "user-uuid",
  "totalDaysCompleted": 18,
  "totalDaysTracked": 30,
  "currentStreak": 5,
  "longestStreak": 12,
  "complianceRate": 60,
  "ringStats": {
    "earth": {
      "ringId": "earth",
      "totalResponses": 18,
      "lastResponse": "2025-11-18T10:30:00Z",
      "streakDays": 5,
      "averageScore": 6.5,
      "topThemes": [
        {
          "theme": "redes_sociais",
          "count": 8,
          "percentage": 44.4
        }
      ],
      "complianceRate": 60
    },
    "water": { /* ... */ },
    "fire": { /* ... */ },
    "wind": { /* ... */ },
    "void": { /* ... */ }
  },
  "lastRitualDate": "2025-11-18",
  "nextRitualDate": "2025-11-19"
}
```

**Status**: 200 OK

---

## 💼 Programs (Programas)

### Current State (Frontend)

- ✅ **Frontend**: Funciona com localStorage (dados locais + progress tracking)
- ❌ **Backend**: Não há integração — dados não são persistidos

### Current Programs

1. **rec_1**: "5 Anéis da Disciplina" (12 min) — Links para /app/rings
2. **rec_2**: "Quem Pensa Enriquece" (25 min) — Links para /app/riqueza-mental

### Endpoints Necessários

#### 1. **POST /api/programs/start**
Inicia um novo programa.

**Request:**
```json
{
  "userId": "user-uuid",
  "programId": "rec_2",
  "title": "Quem Pensa Enriquece",
  "description": "Transforme seu mindset financeiro",
  "currentLesson": "Passo 1: Onde você está",
  "duration": "25 min"
}
```

**Response:**
```json
{
  "id": "enrollment-uuid",
  "userId": "user-uuid",
  "programId": "rec_2",
  "title": "Quem Pensa Enriquece",
  "description": "Transforme seu mindset financeiro",
  "currentLesson": "Passo 1: Onde você está",
  "progress": 0,
  "duration": "25 min",
  "startedAt": "2025-11-18T10:00:00Z",
  "lastAccessedAt": "2025-11-18T10:00:00Z",
  "completedAt": null,
  "status": "in_progress"
}
```

**Status**: 201 Created
**Error**: 400 se programId inválido

---

#### 2. **POST /api/programs/:enrollmentId/progress**
Atualiza progresso do programa.

**Request:**
```json
{
  "progress": 33,
  "currentLesson": "Passo 2: O que você quer"
}
```

**Response:**
```json
{
  "id": "enrollment-uuid",
  "userId": "user-uuid",
  "programId": "rec_2",
  "progress": 33,
  "currentLesson": "Passo 2: O que você quer",
  "lastAccessedAt": "2025-11-18T10:15:00Z"
}
```

**Status**: 200 OK
**Error**: 404 se enrollment não existe

---

#### 3. **POST /api/programs/:enrollmentId/complete**
Marca programa como completo.

**Request:**
```json
{
  "completedAt": "2025-11-18T10:45:00Z"
}
```

**Response:**
```json
{
  "id": "enrollment-uuid",
  "userId": "user-uuid",
  "programId": "rec_2",
  "progress": 100,
  "status": "completed",
  "completedAt": "2025-11-18T10:45:00Z"
}
```

**Status**: 200 OK
**Error**: 404 se enrollment não existe

---

#### 4. **POST /api/programs/:enrollmentId/answers**
Salva respostas de um passo do programa.

**Request (Para Riqueza Mental - Passo 5 com checklist):**
```json
{
  "step": 5,
  "answers": {
    "step5_actions": ["review_spending", "track_expenses"],
    "step5_commitment": "Anotar todos os gastos até domingo"
  }
}
```

**Response:**
```json
{
  "id": "enrollment-uuid",
  "step": 5,
  "answers": {
    "step5_actions": ["review_spending", "track_expenses"],
    "step5_commitment": "Anotar todos os gastos até domingo"
  },
  "savedAt": "2025-11-18T10:20:00Z"
}
```

**Status**: 200 OK

---

#### 5. **GET /api/programs/:enrollmentId**
Recupera programa específico.

**Response:**
```json
{
  "id": "enrollment-uuid",
  "userId": "user-uuid",
  "programId": "rec_2",
  "title": "Quem Pensa Enriquece",
  "description": "Transforme seu mindset financeiro",
  "currentLesson": "Passo 2: O que você quer",
  "progress": 33,
  "duration": "25 min",
  "startedAt": "2025-11-18T10:00:00Z",
  "lastAccessedAt": "2025-11-18T10:15:00Z",
  "completedAt": null,
  "status": "in_progress",
  "answers": {
    "step1": "sempre falta no fim do mês",
    "step2": null,
    "step3_fear": null,
    "step3_belief": null,
    "step4": null,
    "step5_actions": null,
    "step5_commitment": null
  }
}
```

**Status**: 200 OK

---

#### 6. **GET /api/programs**
Lista programas do usuário.

**Query Parameters:**
```
?userId=user-uuid
?status=in_progress|completed|abandoned
```

**Response:**
```json
{
  "data": [
    {
      "id": "enrollment-uuid",
      "programId": "rec_2",
      "title": "Quem Pensa Enriquece",
      "progress": 33,
      "status": "in_progress",
      "startedAt": "2025-11-18T10:00:00Z",
      "lastAccessedAt": "2025-11-18T10:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

**Status**: 200 OK

---

## 🔐 Authentication & Context

### Headers Required

Todas as requisições devem incluir:

```
Authorization: Bearer {jwt_token}
X-User-Id: {user-uuid}
X-Session-Id: {session-uuid}
Content-Type: application/json
```

### User Context

O user deve estar autenticado via Supabase. O `userId` vem do `user.id` do JWT.

---

## 📊 Data Models (Database Schema)

### Table: `daily_rituals`

```sql
CREATE TABLE daily_rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  notes TEXT,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_rituals_user_date ON daily_rituals(user_id, date);
```

---

### Table: `ring_answers`

```sql
CREATE TABLE ring_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id UUID NOT NULL REFERENCES daily_rituals(id) ON DELETE CASCADE,
  ring_id VARCHAR(20) NOT NULL, -- 'earth', 'water', 'fire', 'wind', 'void'
  answer TEXT NOT NULL,
  metadata JSONB NOT NULL, -- Stores ring-specific metadata
  timestamp TIMESTAMP DEFAULT NOW(),

  UNIQUE(ritual_id, ring_id)
);

CREATE INDEX idx_ring_answers_ritual ON ring_answers(ritual_id);
CREATE INDEX idx_ring_answers_ring ON ring_answers(ring_id);
```

---

### Table: `programs` (Master Data)

```sql
CREATE TABLE programs (
  id VARCHAR(20) PRIMARY KEY, -- 'rec_1', 'rec_2', etc
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration VARCHAR(50),
  steps_count INT,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(id)
);

-- Insert:
INSERT INTO programs (id, title, description, duration, steps_count)
VALUES
  ('rec_1', '5 Anéis da Disciplina', 'Construa sua estrutura pessoal', '12 min', 5),
  ('rec_2', 'Quem Pensa Enriquece', 'Transforme seu mindset financeiro', '25 min', 6);
```

---

### Table: `program_enrollments`

```sql
CREATE TABLE program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id VARCHAR(20) NOT NULL REFERENCES programs(id),
  current_lesson VARCHAR(255),
  progress INT DEFAULT 0, -- 0-100
  status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
  started_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_enrollments_user ON program_enrollments(user_id);
CREATE INDEX idx_enrollments_program ON program_enrollments(program_id);
CREATE INDEX idx_enrollments_status ON program_enrollments(status);
```

---

### Table: `program_answers`

```sql
CREATE TABLE program_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES program_enrollments(id) ON DELETE CASCADE,
  step INT NOT NULL, -- 1-6 para Riqueza Mental
  answers JSONB NOT NULL, -- Stores all step answers
  saved_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_program_answers_enrollment ON program_answers(enrollment_id);
CREATE INDEX idx_program_answers_step ON program_answers(step);
```

---

## 🚀 Implementation Roadmap

### Phase 1: Core Infrastructure
- [ ] Setup database tables (daily_rituals, ring_answers, programs, program_enrollments, program_answers)
- [ ] Create RLS (Row Level Security) policies for Supabase
- [ ] Setup API endpoints (POST/GET for rituals and programs)
- [ ] Add authentication middleware

### Phase 2: Rings Integration
- [ ] Implement `/api/rituals/start`
- [ ] Implement `/api/rituals/:ritualId/answer`
- [ ] Implement `/api/rituals/:ritualId/complete`
- [ ] Implement `/api/rings/progress` (with statistics calculation)
- [ ] Add streak calculation logic
- [ ] Test with Frontend

### Phase 3: Programs Integration
- [ ] Implement `/api/programs/start`
- [ ] Implement `/api/programs/:enrollmentId/progress`
- [ ] Implement `/api/programs/:enrollmentId/complete`
- [ ] Implement `/api/programs/:enrollmentId/answers`
- [ ] Create program definitions (rec_1, rec_2, future programs)
- [ ] Test with Frontend

### Phase 4: Advanced Features
- [ ] Analytics dashboard backend
- [ ] Export ritual data (CSV/JSON)
- [ ] Bulk operations
- [ ] Caching strategy (Redis)
- [ ] Rate limiting

### Phase 5: Sync Strategy
- [ ] Implement localStorage ↔ Backend sync
- [ ] Handle offline scenarios
- [ ] Conflict resolution
- [ ] Data integrity validation

---

## 📝 Frontend Changes Needed After Backend Integration

### 1. RingsContext Updates
```typescript
// Replace localStorage with API calls
// Changes needed in:
// - loadRituals() → API call to GET /api/rituals
// - saveRingAnswer() → API call to POST /api/rituals/:id/answer
// - completeRitual() → API call to POST /api/rituals/:id/complete
// - loadProgress() → API call to GET /api/rings/progress
```

### 2. ProgramContext Updates
```typescript
// Replace localStorage with API calls
// Changes needed in:
// - startProgram() → API call to POST /api/programs/start
// - updateProgress() → API call to POST /api/programs/:id/progress
// - completeProgram() → API call to POST /api/programs/:id/complete
```

### 3. Error Handling
- Add retry logic for failed API calls
- Show user-friendly error messages
- Implement timeout handling
- Add offline mode detection

### 4. Loading States
- Show spinners/loaders during API calls
- Disable buttons during processing
- Show progress indicators

---

## 🔍 Testing Checklist

- [ ] Can create a ritual for today
- [ ] Can save answers to each ring
- [ ] Can complete a ritual
- [ ] Can retrieve ritual history
- [ ] Progress calculation is correct
- [ ] Streak calculation works across dates
- [ ] Can start a program
- [ ] Can update program progress
- [ ] Can complete a program
- [ ] Program answers are saved correctly
- [ ] User cannot access other users' data (RLS)
- [ ] Timestamps are correct (UTC)
- [ ] Offline data syncs when online

---

## 🎯 Success Criteria

✅ **100% Integration** means:
- All user data (rituals, programs) is persisted on backend
- Frontend and backend data are always in sync
- Progress updates are real-time
- User can access data from any device
- Historical data is preserved
- Streaks and statistics are calculated server-side
- All responses follow the documented schemas

---

## 📞 Questions/Notes

- [ ] Should we implement soft delete or hard delete?
- [ ] Do we need versioning for programs?
- [ ] What's the retention policy for old rituals?
- [ ] Should we calculate statistics in real-time or batch job?
- [ ] Do we need export functionality for users?

---

**Last Updated:** November 18, 2025
**Version:** 1.0
