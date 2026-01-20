# Backend - User Feedback Endpoint

Este documento descreve a implementação necessária no backend para o sistema de feedback de usuários.

## Overview

O sistema de feedback permite que usuários enviem sugestões, relatem bugs e dêem feedback geral sobre o aplicativo. Diferente do sistema de feedback de interações (thumbs up/down em mensagens), este é um feedback geral do usuário.

## Endpoint

### POST `/api/user-feedback`

Recebe feedback geral do usuário e salva no banco de dados.

#### Request Headers

```
Content-Type: application/json
X-Eco-Guest-Id: <uuid> (opcional, para usuários não autenticados)
X-Eco-Session-Id: <uuid> (opcional)
Authorization: Bearer <token> (opcional, para usuários autenticados)
```

#### Request Body

```typescript
{
  message: string;          // Mensagem do feedback (obrigatório)
  category?: 'bug' | 'feature' | 'improvement' | 'other'; // Categoria do feedback
  page?: string;            // URL da página onde o feedback foi enviado
  userAgent?: string;       // User agent do navegador
  guestId?: string;         // ID do visitante (não autenticado)
  sessionId?: string;       // ID da sessão
  timestamp: string;        // ISO timestamp
}
```

#### Response

**Sucesso (200)**:
```typescript
{
  success: true,
  feedbackId: string,       // ID do feedback criado
  message: "Feedback recebido com sucesso"
}
```

**Erro (400)**:
```typescript
{
  success: false,
  message: "Mensagem é obrigatória"
}
```

**Erro (500)**:
```typescript
{
  success: false,
  message: "Erro ao salvar feedback"
}
```

## Schema do Banco de Dados

### Tabela: `user_feedback`

```sql
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conteúdo do feedback
  message TEXT NOT NULL,
  category VARCHAR(20) CHECK (category IN ('bug', 'feature', 'improvement', 'other')),

  -- Contexto
  page VARCHAR(500),
  user_agent TEXT,

  -- Identificação do usuário
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id UUID,
  session_id UUID,

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Status e resolução
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'ignored')),
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Índices para consulta
  CONSTRAINT message_not_empty CHECK (length(trim(message)) > 0)
);

-- Índices para performance
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_guest_id ON user_feedback(guest_id);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_category ON user_feedback(category);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Implementação Sugerida (Node.js/Express)

```typescript
// routes/userFeedback.ts
import { Router } from 'express';
import { db } from '../db';
import { authenticateOptional } from '../middleware/auth';

const router = Router();

router.post('/user-feedback', authenticateOptional, async (req, res) => {
  try {
    const {
      message,
      category = 'other',
      page,
      userAgent,
      guestId,
      sessionId,
    } = req.body;

    // Validação
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mensagem é obrigatória',
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Mensagem muito longa (máximo 5000 caracteres)',
      });
    }

    // Obter user_id se autenticado
    const userId = req.user?.id || null;

    // Inserir feedback no banco
    const result = await db.query(
      `INSERT INTO user_feedback
        (message, category, page, user_agent, user_id, guest_id, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [message, category, page, userAgent, userId, guestId, sessionId]
    );

    const feedbackId = result.rows[0].id;

    // Log para analytics (opcional)
    console.log('User feedback received:', {
      feedbackId,
      userId: userId || 'guest',
      category,
      page,
    });

    return res.status(200).json({
      success: true,
      feedbackId,
      message: 'Feedback recebido com sucesso',
    });
  } catch (error) {
    console.error('Error saving user feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao salvar feedback',
    });
  }
});

export default router;
```

## Segurança e Rate Limiting

### Rate Limiting

Recomendado limitar o envio de feedback para evitar spam:

```typescript
import rateLimit from 'express-rate-limit';

const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 feedbacks por 15 minutos
  message: {
    success: false,
    message: 'Muitos feedbacks enviados. Tente novamente em alguns minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/user-feedback', feedbackLimiter, authenticateOptional, ...);
```

### Validação de Entrada

- Sanitizar mensagem para remover HTML/scripts
- Validar categoria contra lista permitida
- Limitar tamanho da mensagem (sugestão: 5000 caracteres)
- Validar formato de UUIDs

### CORS

Certifique-se de que o endpoint aceita requisições do frontend:

```typescript
app.use('/api/user-feedback', cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

## Analytics e Notificações (Opcional)

### Slack/Discord Notification

Notificar a equipe quando feedback é recebido:

```typescript
async function notifyTeam(feedback: UserFeedback) {
  if (feedback.category === 'bug') {
    await sendSlackMessage({
      channel: '#bugs',
      text: `🐛 Novo bug reportado: ${feedback.message.substring(0, 100)}...`,
      link: `${ADMIN_URL}/feedback/${feedback.id}`,
    });
  }
}
```

### Email Notification

Enviar email de confirmação para usuários autenticados (opcional):

```typescript
if (userId && userEmail) {
  await sendEmail({
    to: userEmail,
    subject: 'Feedback recebido - ECO',
    template: 'feedback-confirmation',
    data: { feedbackId, category },
  });
}
```

## Dashboard Admin (Futuro)

Sugestão de queries para dashboard de feedback:

```sql
-- Feedback por categoria
SELECT category, COUNT(*) as total
FROM user_feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY category;

-- Feedback mais recente
SELECT id, message, category, page, created_at, user_id
FROM user_feedback
ORDER BY created_at DESC
LIMIT 50;

-- Feedback por status
SELECT status, COUNT(*) as total
FROM user_feedback
GROUP BY status;

-- Top páginas com mais feedback
SELECT page, COUNT(*) as feedback_count
FROM user_feedback
WHERE page IS NOT NULL
GROUP BY page
ORDER BY feedback_count DESC
LIMIT 10;
```

## Testing

### Exemplo de teste com curl

```bash
# Feedback sem autenticação
curl -X POST http://localhost:3001/api/user-feedback \
  -H "Content-Type: application/json" \
  -d '{
    "message": "O app está excelente! Sugestão: adicionar modo escuro.",
    "category": "feature",
    "page": "/app",
    "guestId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Feedback com autenticação
curl -X POST http://localhost:3001/api/user-feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "message": "Encontrei um bug na página de memórias",
    "category": "bug",
    "page": "/app/memory"
  }'
```

## Checklist de Implementação

- [ ] Criar tabela `user_feedback` no banco de dados
- [ ] Implementar endpoint `POST /api/user-feedback`
- [ ] Adicionar validação de entrada (sanitização, limites)
- [ ] Implementar rate limiting
- [ ] Adicionar logs e analytics
- [ ] (Opcional) Configurar notificações para a equipe
- [ ] (Opcional) Criar dashboard admin para visualizar feedbacks
- [ ] Testar endpoint com diferentes cenários
- [ ] Documentar endpoint na API docs

## Prioridade

**Alta** - Este é um recurso importante para coletar feedback dos usuários e melhorar o produto.

## Estimativa

**Backend**: 2-3 horas
- 1h: Schema e migrações
- 1h: Implementação do endpoint
- 30min: Testes e validação

**Dashboard Admin** (opcional): 3-4 horas

## Contato

Em caso de dúvidas sobre a implementação, verificar:
- Frontend: `src/api/userFeedback.ts`
- Types: `src/types/feedback.ts`
- Component: `src/components/FeedbackModal.tsx`
