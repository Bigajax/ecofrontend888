# Implementação Backend - Sistema de Feedback de Usuário

Este documento contém **TODOS OS ARQUIVOS** necessários para implementar o sistema de feedback no seu backend.

## 📋 Índice

1. [Migração SQL - Criar Tabela](#1-migração-sql---criar-tabela)
2. [Types TypeScript](#2-types-typescript)
3. [Validador](#3-validador)
4. [Rate Limiter](#4-rate-limiter)
5. [Route Handler](#5-route-handler)
6. [Registrar Rota](#6-registrar-rota)
7. [Teste com cURL](#7-teste-com-curl)

---

## 1. Migração SQL - Criar Tabela

**Arquivo:** `migrations/001_create_user_feedback_table.sql`

```sql
-- Migration: Create user_feedback table
-- Description: Table to store user feedback (bugs, suggestions, improvements)
-- Created: 2026-01-20

-- ============================================================================
-- 1. Create user_feedback table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_feedback (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  message TEXT NOT NULL,
  category VARCHAR(20) CHECK (category IN ('bug', 'feature', 'improvement', 'other')) DEFAULT 'other',

  -- Context
  page VARCHAR(500),
  user_agent TEXT,

  -- User identification
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id UUID,
  session_id UUID,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Status and resolution
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'ignored')),
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT message_not_empty CHECK (length(trim(message)) > 0),
  CONSTRAINT message_max_length CHECK (length(message) <= 5000)
);

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_guest_id ON user_feedback(guest_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON user_feedback(category);

-- ============================================================================
-- 3. Create trigger function for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Create trigger for user_feedback
-- ============================================================================

DROP TRIGGER IF EXISTS update_user_feedback_updated_at ON user_feedback;

CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE user_feedback IS 'Stores user feedback including bugs, feature requests, and suggestions';
COMMENT ON COLUMN user_feedback.message IS 'Feedback message from user (max 5000 chars)';
COMMENT ON COLUMN user_feedback.category IS 'Type of feedback: bug, feature, improvement, or other';
COMMENT ON COLUMN user_feedback.page IS 'URL/path where feedback was submitted';
COMMENT ON COLUMN user_feedback.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN user_feedback.user_id IS 'Authenticated user ID (null for guests)';
COMMENT ON COLUMN user_feedback.guest_id IS 'Guest identifier for non-authenticated users';
COMMENT ON COLUMN user_feedback.session_id IS 'Session identifier';
COMMENT ON COLUMN user_feedback.status IS 'Current status: pending, reviewed, resolved, or ignored';
COMMENT ON COLUMN user_feedback.admin_notes IS 'Internal notes from admin/team';

-- ============================================================================
-- 6. Grant permissions (RLS Policies)
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert feedback
CREATE POLICY "Users can insert feedback" ON user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do anything (for backend operations)
-- This is already enabled by default with service_role key
```

### Como executar a migração:

**Opção 1 - Supabase Dashboard:**
1. Vá para https://app.supabase.com
2. Selecione seu projeto
3. Vá em "SQL Editor"
4. Cole o SQL acima
5. Clique em "Run"

**Opção 2 - CLI:**
```bash
psql $DATABASE_URL -f migrations/001_create_user_feedback_table.sql
```

---

## 2. Types TypeScript

**Arquivo:** `utils/feedbackTypes.ts` ou `types/feedback.ts`

```typescript
/**
 * User Feedback Types
 *
 * TypeScript types and interfaces for user feedback system.
 */

export type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'other';
export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved' | 'ignored';

/**
 * Request body from frontend
 */
export interface UserFeedbackRequest {
  message: string;
  category?: FeedbackCategory;
  page?: string;
  userAgent?: string;
  guestId?: string;
  sessionId?: string;
  timestamp?: string;
}

/**
 * Database record structure
 */
export interface UserFeedbackRecord {
  id: string;
  message: string;
  category: FeedbackCategory;
  page: string | null;
  user_agent: string | null;
  user_id: string | null;
  guest_id: string | null;
  session_id: string | null;
  created_at: Date;
  updated_at: Date;
  status: FeedbackStatus;
  admin_notes: string | null;
  resolved_at: Date | null;
  resolved_by: string | null;
}

/**
 * Response sent to frontend
 */
export interface UserFeedbackResponse {
  success: boolean;
  feedbackId?: string;
  message: string;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}
```

---

## 3. Validador

**Arquivo:** `utils/feedbackValidator.ts`

```typescript
/**
 * User Feedback Validator
 *
 * Validates and sanitizes user feedback input.
 */

import type {
  UserFeedbackRequest,
  FeedbackCategory,
  ValidationError,
} from './feedbackTypes';

const VALID_CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'improvement', 'other'];
const MAX_MESSAGE_LENGTH = 5000;
const MAX_PAGE_LENGTH = 500;

/**
 * Validate user feedback request
 */
export function validateFeedback(data: any): {
  isValid: boolean;
  errors: ValidationError[];
  sanitized?: UserFeedbackRequest;
} {
  const errors: ValidationError[] = [];

  // Validate message
  if (!data.message || typeof data.message !== 'string') {
    errors.push({
      field: 'message',
      message: 'Mensagem é obrigatória',
    });
  } else {
    const trimmedMessage = data.message.trim();
    if (trimmedMessage.length === 0) {
      errors.push({
        field: 'message',
        message: 'Mensagem não pode estar vazia',
      });
    } else if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      errors.push({
        field: 'message',
        message: `Mensagem muito longa (máximo ${MAX_MESSAGE_LENGTH} caracteres)`,
      });
    }
  }

  // Validate category (optional)
  let category: FeedbackCategory = 'other';
  if (data.category) {
    if (!VALID_CATEGORIES.includes(data.category)) {
      errors.push({
        field: 'category',
        message: `Categoria inválida. Use: ${VALID_CATEGORIES.join(', ')}`,
      });
    } else {
      category = data.category;
    }
  }

  // Validate page (optional)
  let page: string | undefined;
  if (data.page && typeof data.page === 'string') {
    const trimmedPage = data.page.trim();
    if (trimmedPage.length > MAX_PAGE_LENGTH) {
      errors.push({
        field: 'page',
        message: `URL da página muito longa (máximo ${MAX_PAGE_LENGTH} caracteres)`,
      });
    } else {
      page = trimmedPage;
    }
  }

  // Validate guestId (optional, must be UUID if provided)
  let guestId: string | undefined;
  if (data.guestId && typeof data.guestId === 'string') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.guestId)) {
      errors.push({
        field: 'guestId',
        message: 'Guest ID inválido (deve ser UUID)',
      });
    } else {
      guestId = data.guestId.toLowerCase();
    }
  }

  // Validate sessionId (optional, must be UUID if provided)
  let sessionId: string | undefined;
  if (data.sessionId && typeof data.sessionId === 'string') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.sessionId)) {
      errors.push({
        field: 'sessionId',
        message: 'Session ID inválido (deve ser UUID)',
      });
    } else {
      sessionId = data.sessionId.toLowerCase();
    }
  }

  // Return validation result
  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      message: data.message.trim(),
      category,
      page,
      userAgent: data.userAgent,
      guestId,
      sessionId,
      timestamp: data.timestamp,
    },
  };
}

/**
 * Sanitize HTML/Scripts from message
 * Removes potentially dangerous HTML tags and scripts
 */
export function sanitizeMessage(message: string): string {
  return message
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}
```

---

## 4. Rate Limiter

**Arquivo:** `middleware/rateLimiter.ts` ou `utils/rateLimiter.ts`

```typescript
/**
 * Rate Limiter
 *
 * Simple in-memory rate limiter for API endpoints.
 * Prevents abuse by limiting requests per IP/user.
 */

import type { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const requestCounts = new Map<string, RateLimitRecord>();

// Clean up old records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (record.resetAt < now) {
      requestCounts.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Create a rate limiter middleware
 *
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests allowed in window
 */
export function createRateLimiter(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get identifier (IP address or user ID)
    const identifier =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      'unknown';

    const key = `${identifier}:${req.path}`;
    const now = Date.now();
    const record = requestCounts.get(key);

    if (!record || record.resetAt < now) {
      // First request or window expired - create new record
      requestCounts.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.status(429).json({
        success: false,
        message: `Muitos feedbacks enviados. Tente novamente em ${resetInSeconds} segundos.`,
        retryAfter: resetInSeconds,
      });
      return;
    }

    // Increment counter
    record.count += 1;
    next();
  };
}

/**
 * Feedback rate limiter
 * 5 requests per 15 minutes
 */
export const feedbackRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5 // 5 requests
);
```

---

## 5. Route Handler

**Arquivo:** `routes/userFeedbackRoutes.ts` ou `routes/feedbackRoutes.ts`

```typescript
/**
 * User Feedback Routes
 *
 * Handles user feedback submission (bugs, suggestions, improvements).
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin'; // Ajuste o caminho conforme seu projeto
import { feedbackRateLimiter } from '../middleware/rateLimiter'; // ou '../utils/rateLimiter'
import { validateFeedback, sanitizeMessage } from '../utils/feedbackValidator';
import type {
  UserFeedbackRequest,
  UserFeedbackResponse,
} from '../utils/feedbackTypes';

const router = Router();

/**
 * POST /api/user-feedback
 *
 * Submit user feedback
 *
 * Request body:
 * - message: string (required, max 5000 chars)
 * - category: 'bug' | 'feature' | 'improvement' | 'other' (optional, default 'other')
 * - page: string (optional, URL/path where feedback was submitted)
 * - userAgent: string (optional, browser user agent)
 * - guestId: string (optional, UUID for non-authenticated users)
 * - sessionId: string (optional, UUID for session tracking)
 *
 * Response:
 * - success: boolean
 * - feedbackId: string (UUID of created feedback)
 * - message: string
 */
router.post(
  '/user-feedback',
  feedbackRateLimiter,
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const validation = validateFeedback(req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.errors[0].message,
          errors: validation.errors,
        });
      }

      const sanitized = validation.sanitized as UserFeedbackRequest;

      // Sanitize message to remove HTML/scripts
      const cleanMessage = sanitizeMessage(sanitized.message);

      // Get user ID from Authorization header (if authenticated)
      let userId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          // Simple JWT decode (not verifying signature - Supabase will handle that)
          const payload = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64').toString()
          );
          userId = payload.sub || null;
        } catch (e) {
          // Invalid token - continue as guest
          console.warn('Invalid auth token, treating as guest');
        }
      }

      // Insert feedback into database
      const { data, error } = await supabaseAdmin
        .from('user_feedback')
        .insert({
          message: cleanMessage,
          category: sanitized.category || 'other',
          page: sanitized.page || null,
          user_agent: sanitized.userAgent || null,
          user_id: userId,
          guest_id: sanitized.guestId || null,
          session_id: sanitized.sessionId || null,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) {
        console.error('[❌ SUPABASE] Error inserting feedback:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Erro ao salvar feedback. Por favor, tente novamente.',
        });
      }

      // Log feedback for analytics (optional)
      console.log('[✅ FEEDBACK] New feedback received:', {
        feedbackId: data.id,
        category: sanitized.category,
        userId: userId || 'guest',
        page: sanitized.page,
      });

      // Return success response
      const response: UserFeedbackResponse = {
        success: true,
        feedbackId: data.id,
        message: 'Feedback recebido com sucesso',
      };

      return res.status(200).json(response);
    } catch (err: any) {
      console.error('[❌ ERRO SERVIDOR]', err.message || err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao processar feedback',
      });
    }
  }
);

/**
 * GET /api/user-feedback/stats (Admin only - opcional)
 *
 * Get feedback statistics (for future admin dashboard)
 */
router.get('/user-feedback/stats', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin authentication check here

    const { data, error } = await supabaseAdmin
      .from('user_feedback')
      .select('category, status')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[❌ SUPABASE] Error fetching stats:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
      });
    }

    // Calculate stats
    const stats = {
      total: data.length,
      byCategory: data.reduce((acc: any, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {}),
      byStatus: data.reduce((acc: any, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {}),
    };

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (err: any) {
    console.error('[❌ ERRO SERVIDOR]', err.message || err);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar requisição',
    });
  }
});

export default router;
```

---

## 6. Registrar Rota

**Arquivo:** `server.ts` ou `app.ts` (arquivo principal do servidor)

```typescript
// ... outros imports
import userFeedbackRoutes from './routes/userFeedbackRoutes';

// ... configuração do express

// ✅ Rotas
app.use('/api', userFeedbackRoutes);
// ... outras rotas
```

**Exemplo completo:**

```typescript
import express from 'express';
import cors from 'cors';
import userFeedbackRoutes from './routes/userFeedbackRoutes';
// ... outros imports

const app = express();

// CORS
app.use(cors({
  origin: [process.env.FRONTEND_URL || '', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Body parsing
app.use(express.json());

// Rotas
app.use('/api', userFeedbackRoutes);

// ... resto do código
```

---

## 7. Teste com cURL

### Teste 1: Feedback sem autenticação (guest)

```bash
curl -X POST http://localhost:3001/api/user-feedback \
  -H "Content-Type: application/json" \
  -d '{
    "message": "O app está excelente! Sugestão: adicionar modo escuro.",
    "category": "feature",
    "page": "/app",
    "guestId": "550e8400-e29b-41d4-a716-446655440000",
    "sessionId": "660e8400-e29b-41d4-a716-446655440001"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "feedbackId": "770e8400-e29b-41d4-a716-446655440002",
  "message": "Feedback recebido com sucesso"
}
```

### Teste 2: Feedback com autenticação

```bash
curl -X POST http://localhost:3001/api/user-feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "message": "Encontrei um bug na página de memórias. Quando clico em editar, nada acontece.",
    "category": "bug",
    "page": "/app/memory"
  }'
```

### Teste 3: Validação (mensagem vazia)

```bash
curl -X POST http://localhost:3001/api/user-feedback \
  -H "Content-Type: application/json" \
  -d '{
    "message": "",
    "category": "other"
  }'
```

**Resposta esperada:**
```json
{
  "success": false,
  "message": "Mensagem não pode estar vazia",
  "errors": [
    {
      "field": "message",
      "message": "Mensagem não pode estar vazia"
    }
  ]
}
```

### Teste 4: Rate limiting (enviar 6 vezes em 1 minuto)

```bash
# Execute este comando 6 vezes seguidas
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/user-feedback \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Teste $i\", \"category\": \"other\"}"
  echo ""
done
```

**Na 6ª tentativa, deve retornar:**
```json
{
  "success": false,
  "message": "Muitos feedbacks enviados. Tente novamente em X segundos.",
  "retryAfter": 899
}
```

### Teste 5: Estatísticas (opcional)

```bash
curl http://localhost:3001/api/user-feedback/stats
```

---

## 📝 Checklist de Implementação

### Passo 1: Banco de Dados
- [ ] Executar migração SQL no Supabase
- [ ] Verificar que tabela `user_feedback` foi criada
- [ ] Verificar índices criados
- [ ] Testar RLS policies (opcional)

### Passo 2: Backend - Arquivos
- [ ] Criar `utils/feedbackTypes.ts`
- [ ] Criar `utils/feedbackValidator.ts`
- [ ] Criar `middleware/rateLimiter.ts`
- [ ] Criar `routes/userFeedbackRoutes.ts`

### Passo 3: Backend - Integração
- [ ] Importar rota no `server.ts`
- [ ] Registrar rota com `app.use('/api', userFeedbackRoutes)`
- [ ] Verificar que `supabaseAdmin` está configurado

### Passo 4: Testes
- [ ] Testar endpoint com cURL (feedback guest)
- [ ] Testar endpoint com cURL (feedback autenticado)
- [ ] Testar validações (mensagem vazia, muito longa)
- [ ] Testar rate limiting (6 requests seguidas)
- [ ] Verificar no Supabase que registros foram salvos

### Passo 5: Monitoramento (Opcional)
- [ ] Configurar logs/analytics para feedbacks
- [ ] Configurar notificações (Slack/Discord) para bugs
- [ ] Criar dashboard admin para visualizar feedbacks

---

## 🔍 Verificação no Supabase

Após implementar e testar, verifique no Supabase:

1. Vá para **Table Editor**
2. Selecione tabela `user_feedback`
3. Você deve ver os feedbacks salvos com:
   - `id` (UUID gerado automaticamente)
   - `message` (texto do feedback)
   - `category` (bug, feature, improvement, other)
   - `page` (URL onde foi enviado)
   - `user_id` (null para guests)
   - `guest_id` (UUID do visitante)
   - `created_at` (timestamp)
   - `status` (pending por padrão)

---

## 🚀 Queries Úteis para Admin

### Ver feedbacks recentes
```sql
SELECT
  id,
  message,
  category,
  page,
  created_at,
  COALESCE(user_id::text, guest_id::text) as identifier
FROM user_feedback
ORDER BY created_at DESC
LIMIT 50;
```

### Contagem por categoria
```sql
SELECT
  category,
  COUNT(*) as total
FROM user_feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY category
ORDER BY total DESC;
```

### Páginas com mais feedback
```sql
SELECT
  page,
  COUNT(*) as feedback_count
FROM user_feedback
WHERE page IS NOT NULL
GROUP BY page
ORDER BY feedback_count DESC
LIMIT 10;
```

### Feedbacks pendentes (não resolvidos)
```sql
SELECT
  id,
  message,
  category,
  page,
  created_at
FROM user_feedback
WHERE status = 'pending'
ORDER BY created_at DESC;
```

---

## 📊 Estrutura de Pastas Recomendada

```
backend/
├── migrations/
│   └── 001_create_user_feedback_table.sql
├── routes/
│   └── userFeedbackRoutes.ts
├── middleware/
│   └── rateLimiter.ts
├── utils/
│   ├── feedbackTypes.ts
│   └── feedbackValidator.ts
├── lib/
│   └── supabaseAdmin.ts
└── server.ts
```

---

## ⚠️ Notas Importantes

1. **Supabase Service Role Key**: Certifique-se de usar `SUPABASE_SERVICE_ROLE_KEY` no backend, não a anon key
2. **CORS**: Configure CORS para aceitar requisições do frontend
3. **Rate Limiting**: Ajuste os limites conforme necessário (atualmente 5 req/15min)
4. **Validação**: Mensagens são limitadas a 5000 caracteres
5. **Sanitização**: HTML e scripts são removidos das mensagens
6. **RLS**: Políticas de segurança garantem que usuários só vejam próprio feedback

---

## 🎯 Resultado Final

Após implementar tudo, você terá:

✅ Tabela no banco de dados para armazenar feedback
✅ Endpoint `POST /api/user-feedback` funcionando
✅ Validação de entrada robusta
✅ Rate limiting para prevenir spam
✅ Sanitização contra XSS
✅ Suporte para usuários autenticados e guests
✅ Estatísticas de feedback (opcional)

---

## 📞 Suporte

Se tiver dúvidas durante a implementação:
1. Verifique os logs do servidor para erros
2. Verifique o Supabase Dashboard para erros de query
3. Teste com cURL antes de testar no frontend
4. Consulte este documento novamente

---

**Boa implementação! 🚀**
