# Backend Implementation Examples

Exemplos práticos de como implementar as APIs no backend (Node.js/Express, mas conceitos aplicáveis a qualquer stack).

---

## 🛠️ Setup

```bash
npm install express axios postgres pg
```

---

## 1️⃣ Rituals Endpoints

### POST /api/rituals/start

```typescript
// routes/rituals.ts
import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { db } from '../database';

const router = Router();

router.post('/start', authenticateUser, async (req: Request, res: Response) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Check if ritual already exists for today
    const existing = await db.query(
      'SELECT id FROM daily_rituals WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'Ritual already started for today'
      });
    }

    // Create new ritual
    const result = await db.query(
      `INSERT INTO daily_rituals (user_id, date, status, created_at, updated_at)
       VALUES ($1, $2, 'in_progress', NOW(), NOW())
       RETURNING *`,
      [userId, today]
    );

    res.status(201).json({
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      date: result.rows[0].date,
      answers: [],
      status: 'in_progress',
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('Error starting ritual:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

---

### POST /api/rituals/:ritualId/answer

```typescript
router.post('/:ritualId/answer', authenticateUser, async (req: Request, res: Response) => {
  const { ritualId } = req.params;
  const { ringId, answer, metadata } = req.body;
  const userId = req.user.id;

  // Validate ringId
  const validRings = ['earth', 'water', 'fire', 'wind', 'void'];
  if (!validRings.includes(ringId)) {
    return res.status(400).json({ error: 'Invalid ring ID' });
  }

  try {
    // Verify ritual belongs to user
    const ritual = await db.query(
      'SELECT id FROM daily_rituals WHERE id = $1 AND user_id = $2',
      [ritualId, userId]
    );

    if (ritual.rows.length === 0) {
      return res.status(404).json({ error: 'Ritual not found' });
    }

    // Insert or update ring answer
    await db.query(
      `INSERT INTO ring_answers (ritual_id, ring_id, answer, metadata, timestamp)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (ritual_id, ring_id)
       DO UPDATE SET
         answer = $3,
         metadata = $4,
         timestamp = NOW()`,
      [ritualId, ringId, answer, JSON.stringify(metadata)]
    );

    // Update ritual updated_at
    await db.query(
      'UPDATE daily_rituals SET updated_at = NOW() WHERE id = $1',
      [ritualId]
    );

    // Fetch and return updated ritual
    const answers = await db.query(
      `SELECT ring_id, answer, metadata, timestamp FROM ring_answers
       WHERE ritual_id = $1 ORDER BY timestamp`,
      [ritualId]
    );

    const updatedRitual = await db.query(
      'SELECT * FROM daily_rituals WHERE id = $1',
      [ritualId]
    );

    res.status(200).json({
      id: updatedRitual.rows[0].id,
      userId: updatedRitual.rows[0].user_id,
      date: updatedRitual.rows[0].date,
      answers: answers.rows.map(row => ({
        ringId: row.ring_id,
        answer: row.answer,
        metadata: row.metadata,
        timestamp: row.timestamp
      })),
      status: updatedRitual.rows[0].status,
      updatedAt: updatedRitual.rows[0].updated_at
    });
  } catch (error) {
    console.error('Error saving answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

### POST /api/rituals/:ritualId/complete

```typescript
router.post('/:ritualId/complete', authenticateUser, async (req: Request, res: Response) => {
  const { ritualId } = req.params;
  const userId = req.user.id;

  try {
    // Verify ritual belongs to user and all 5 rings are answered
    const ritual = await db.query(
      `SELECT dr.id, dr.date, dr.status,
              COUNT(DISTINCT ra.ring_id) as answers_count
       FROM daily_rituals dr
       LEFT JOIN ring_answers ra ON dr.id = ra.ritual_id
       WHERE dr.id = $1 AND dr.user_id = $2
       GROUP BY dr.id, dr.date, dr.status`,
      [ritualId, userId]
    );

    if (ritual.rows.length === 0) {
      return res.status(404).json({ error: 'Ritual not found' });
    }

    const ritualData = ritual.rows[0];

    // Require all 5 rings to be answered
    if (ritualData.answers_count < 5) {
      return res.status(400).json({
        error: 'All 5 rings must be answered before completing',
        answered: ritualData.answers_count,
        required: 5
      });
    }

    // Mark as completed
    const result = await db.query(
      `UPDATE daily_rituals
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [ritualId]
    );

    // Fetch all answers
    const answers = await db.query(
      'SELECT ring_id, answer, metadata, timestamp FROM ring_answers WHERE ritual_id = $1',
      [ritualId]
    );

    res.status(200).json({
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      date: result.rows[0].date,
      answers: answers.rows.map(row => ({
        ringId: row.ring_id,
        answer: row.answer,
        metadata: row.metadata,
        timestamp: row.timestamp
      })),
      status: 'completed',
      completedAt: result.rows[0].completed_at,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('Error completing ritual:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

### GET /api/rings/progress

```typescript
router.get('/progress', authenticateUser, async (req: Request, res: Response) => {
  const userId = req.user.id;
  const period = req.query.period || 'month'; // 'week', 'month', 'year'

  try {
    // Calculate streak
    const streakResult = await calculateCurrentStreak(userId);
    const currentStreak = streakResult.current;
    const longestStreak = streakResult.longest;

    // Get total days completed
    const completedResult = await db.query(
      `SELECT COUNT(*) as total_completed FROM daily_rituals
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );

    const totalDaysCompleted = parseInt(completedResult.rows[0].total_completed);

    // Get total days tracked
    const trackedResult = await db.query(
      `SELECT COUNT(*) as total_tracked FROM daily_rituals
       WHERE user_id = $1 AND (status = 'completed' OR status = 'in_progress')`,
      [userId]
    );

    const totalDaysTracked = parseInt(trackedResult.rows[0].total_tracked);
    const complianceRate = totalDaysTracked > 0
      ? Math.round((totalDaysCompleted / totalDaysTracked) * 100)
      : 0;

    // Calculate statistics per ring
    const ringStats: Record<string, any> = {};
    const rings = ['earth', 'water', 'fire', 'wind', 'void'];

    for (const ringId of rings) {
      const stats = await db.query(
        `SELECT
          COUNT(*) as total_responses,
          MAX(ra.timestamp) as last_response
         FROM ring_answers ra
         JOIN daily_rituals dr ON ra.ritual_id = dr.id
         WHERE dr.user_id = $1 AND ra.ring_id = $2`,
        [userId, ringId]
      );

      const metadataResult = await db.query(
        `SELECT metadata FROM ring_answers
         WHERE ritual_id IN (SELECT id FROM daily_rituals WHERE user_id = $1)
         AND ring_id = $2 AND metadata IS NOT NULL`,
        [userId, ringId]
      );

      // Calculate average score if applicable (earth = focusScore, fire = emotionIntensity)
      let averageScore = undefined;
      if (ringId === 'earth') {
        const scoreResult = await db.query(
          `SELECT AVG(CAST(metadata->>'focusScore' as FLOAT)) as avg_score
           FROM ring_answers WHERE ring_id = 'earth'
           AND ritual_id IN (SELECT id FROM daily_rituals WHERE user_id = $1)`,
          [userId]
        );
        averageScore = scoreResult.rows[0]?.avg_score
          ? Math.round(scoreResult.rows[0].avg_score * 10) / 10
          : undefined;
      }

      ringStats[ringId] = {
        ringId,
        totalResponses: parseInt(stats.rows[0].total_responses),
        lastResponse: stats.rows[0].last_response,
        streakDays: currentStreak, // Simplified - calculate per ring if needed
        averageScore,
        complianceRate
      };
    }

    // Get last ritual date
    const lastRitual = await db.query(
      `SELECT date FROM daily_rituals WHERE user_id = $1
       ORDER BY date DESC LIMIT 1`,
      [userId]
    );

    res.json({
      userId,
      totalDaysCompleted,
      totalDaysTracked,
      currentStreak,
      longestStreak,
      complianceRate,
      ringStats,
      lastRitualDate: lastRitual.rows[0]?.date,
      nextRitualDate: calculateNextRitualDate(lastRitual.rows[0]?.date)
    });
  } catch (error) {
    console.error('Error calculating progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate current streak
async function calculateCurrentStreak(userId: string): Promise<{ current: number; longest: number }> {
  const result = await db.query(
    `SELECT date FROM daily_rituals
     WHERE user_id = $1 AND status = 'completed'
     ORDER BY date DESC`,
    [userId]
  );

  const dates = result.rows.map(row => new Date(row.date));
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  for (let i = 0; i < dates.length; i++) {
    const currentDate = dates[i];

    if (!lastDate) {
      tempStreak = 1;
    } else {
      const daysDiff = Math.floor(
        (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        break;
      }
    }

    lastDate = currentDate;
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Check if today's date is among completed dates (for current streak)
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (result.rows.some(row => row.date === today || row.date === yesterday)) {
    currentStreak = tempStreak;
  }

  return { current: currentStreak, longest: longestStreak };
}

function calculateNextRitualDate(lastDate: string | null): string {
  if (!lastDate) {
    return new Date().toISOString().split('T')[0];
  }
  const next = new Date(lastDate);
  next.setDate(next.getDate() + 1);
  return next.toISOString().split('T')[0];
}
```

---

## 2️⃣ Programs Endpoints

### POST /api/programs/start

```typescript
// routes/programs.ts
router.post('/start', authenticateUser, async (req: Request, res: Response) => {
  const { programId, title, description, currentLesson, duration } = req.body;
  const userId = req.user.id;

  try {
    // Verify program exists
    const program = await db.query(
      'SELECT id FROM programs WHERE id = $1',
      [programId]
    );

    if (program.rows.length === 0) {
      return res.status(400).json({ error: 'Program not found' });
    }

    // Create enrollment
    const result = await db.query(
      `INSERT INTO program_enrollments
       (user_id, program_id, current_lesson, progress, status, started_at, last_accessed_at)
       VALUES ($1, $2, $3, 0, 'in_progress', NOW(), NOW())
       RETURNING *`,
      [userId, programId, currentLesson]
    );

    res.status(201).json({
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      programId: result.rows[0].program_id,
      title,
      description,
      currentLesson: result.rows[0].current_lesson,
      progress: 0,
      duration,
      startedAt: result.rows[0].started_at,
      lastAccessedAt: result.rows[0].last_accessed_at,
      completedAt: null,
      status: 'in_progress'
    });
  } catch (error) {
    console.error('Error starting program:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

### POST /api/programs/:enrollmentId/progress

```typescript
router.post('/:enrollmentId/progress', authenticateUser, async (req: Request, res: Response) => {
  const { enrollmentId } = req.params;
  const { progress, currentLesson } = req.body;
  const userId = req.user.id;

  try {
    // Verify enrollment belongs to user
    const enrollment = await db.query(
      'SELECT id FROM program_enrollments WHERE id = $1 AND user_id = $2',
      [enrollmentId, userId]
    );

    if (enrollment.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Update progress
    const result = await db.query(
      `UPDATE program_enrollments
       SET progress = $1, current_lesson = $2, last_accessed_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [progress, currentLesson, enrollmentId]
    );

    res.json({
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      programId: result.rows[0].program_id,
      progress: result.rows[0].progress,
      currentLesson: result.rows[0].current_lesson,
      lastAccessedAt: result.rows[0].last_accessed_at
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

### POST /api/programs/:enrollmentId/complete

```typescript
router.post('/:enrollmentId/complete', authenticateUser, async (req: Request, res: Response) => {
  const { enrollmentId } = req.params;
  const userId = req.user.id;

  try {
    // Verify enrollment belongs to user
    const enrollment = await db.query(
      'SELECT id FROM program_enrollments WHERE id = $1 AND user_id = $2',
      [enrollmentId, userId]
    );

    if (enrollment.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Mark as completed
    const result = await db.query(
      `UPDATE program_enrollments
       SET progress = 100, status = 'completed', completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [enrollmentId]
    );

    res.json({
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      programId: result.rows[0].program_id,
      progress: 100,
      status: 'completed',
      completedAt: result.rows[0].completed_at
    });
  } catch (error) {
    console.error('Error completing program:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

### POST /api/programs/:enrollmentId/answers

```typescript
router.post('/:enrollmentId/answers', authenticateUser, async (req: Request, res: Response) => {
  const { enrollmentId } = req.params;
  const { step, answers } = req.body;
  const userId = req.user.id;

  try {
    // Verify enrollment belongs to user
    const enrollment = await db.query(
      'SELECT id FROM program_enrollments WHERE id = $1 AND user_id = $2',
      [enrollmentId, userId]
    );

    if (enrollment.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Insert or update program answer
    const result = await db.query(
      `INSERT INTO program_answers (enrollment_id, step, answers, saved_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (enrollment_id, step)
       DO UPDATE SET answers = $3, updated_at = NOW()
       RETURNING *`,
      [enrollmentId, step, JSON.stringify(answers)]
    );

    res.json({
      id: result.rows[0].id,
      enrollmentId: result.rows[0].enrollment_id,
      step: result.rows[0].step,
      answers: result.rows[0].answers,
      savedAt: result.rows[0].saved_at
    });
  } catch (error) {
    console.error('Error saving answers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## 🔐 Authentication Middleware

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.sub, // Supabase JWT has user ID in 'sub'
      email: decoded.email
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 🗄️ Database Setup (PostgreSQL)

```sql
-- Create tables
CREATE TABLE daily_rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  notes TEXT,
  UNIQUE(user_id, date)
);

CREATE TABLE ring_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id UUID NOT NULL REFERENCES daily_rituals(id) ON DELETE CASCADE,
  ring_id VARCHAR(20) NOT NULL,
  answer TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  UNIQUE(ritual_id, ring_id)
);

CREATE TABLE programs (
  id VARCHAR(20) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration VARCHAR(50),
  steps_count INT
);

CREATE TABLE program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id VARCHAR(20) NOT NULL REFERENCES programs(id),
  current_lesson VARCHAR(255),
  progress INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress',
  started_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE program_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES program_enrollments(id) ON DELETE CASCADE,
  step INT NOT NULL,
  answers JSONB,
  saved_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(enrollment_id, step)
);

-- Create indexes
CREATE INDEX idx_daily_rituals_user ON daily_rituals(user_id);
CREATE INDEX idx_daily_rituals_date ON daily_rituals(date);
CREATE INDEX idx_ring_answers_ritual ON ring_answers(ritual_id);
CREATE INDEX idx_program_enrollments_user ON program_enrollments(user_id);
CREATE INDEX idx_program_answers_enrollment ON program_answers(enrollment_id);

-- Insert initial programs
INSERT INTO programs (id, title, description, duration, steps_count)
VALUES
  ('rec_1', '5 Anéis da Disciplina', 'Construa sua estrutura pessoal', '12 min', 5),
  ('rec_2', 'Quem Pensa Enriquece', 'Transforme seu mindset financeiro', '25 min', 6)
ON CONFLICT DO NOTHING;

-- RLS Policies (Supabase)
ALTER TABLE daily_rituals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ring_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own rituals" ON daily_rituals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can see own program enrollments" ON program_enrollments
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 🚀 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/eco
DATABASE_POOL_SIZE=20

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# API
API_PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-public-key
```

---

## ✅ Summary

Essa implementação fornece:

1. ✅ Persistência de dados no backend
2. ✅ Autenticação via JWT
3. ✅ Cálculo de estatísticas
4. ✅ Rastreamento de streaks
5. ✅ Múltiplos programas
6. ✅ Segurança (RLS + Auth)

**Próximos passos**: Integrate com frontend substituindo localStorage por API calls!
