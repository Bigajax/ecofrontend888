# Backend Integration — Quick Reference

Resumo executivo e checklist para integração 100% com backend.

---

## 🎯 O Que Precisa Ser Feito

### Current State
```
✅ Frontend: Rings & Programs funcionando 100% com localStorage
❌ Backend: Nenhuma integração
❌ Sync: Dados não sincronizam entre dispositivos
❌ Persistence: Dados perdem se usuário limpar cache
```

### Target State
```
✅ Frontend: Rings & Programs funcionando com cache (localStorage)
✅ Backend: API endpoints salvando dados no DB
✅ Sync: Sincronização automática quando online
✅ Persistence: Dados salvos permanentemente no servidor
✅ Multi-device: Mesmo usuário pode usar de qualquer dispositivo
```

---

## 📋 Checklist de Implementação Backend

### Phase 1: Infrastructure (1-2 dias)
```
Database Setup:
  [ ] Criar tabela: daily_rituals
  [ ] Criar tabela: ring_answers
  [ ] Criar tabela: programs
  [ ] Criar tabela: program_enrollments
  [ ] Criar tabela: program_answers
  [ ] Criar índices
  [ ] Setup RLS (Row Level Security)

Authentication:
  [ ] Configurar JWT verification
  [ ] Criar middleware de auth
  [ ] Testar com Supabase

API Framework:
  [ ] Setup Express/Node.js (ou outra stack)
  [ ] Conectar ao PostgreSQL
  [ ] Configurar CORS
```

### Phase 2: Rituals API (2-3 dias)
```
Endpoints:
  [ ] POST /api/rituals/start
  [ ] POST /api/rituals/:ritualId/answer
  [ ] POST /api/rituals/:ritualId/complete
  [ ] GET /api/rituals
  [ ] GET /api/rituals/:ritualId
  [ ] GET /api/rings/progress

Funcionalidades:
  [ ] Validar ritual (5 anéis completos)
  [ ] Calcular streaks
  [ ] Calcular estatísticas por ring
  [ ] Compliance rate
  [ ] Timestamp handling (UTC)

Testes:
  [ ] Unit tests para cálculos
  [ ] Integration tests (API + DB)
  [ ] Testes de segurança (RLS)
```

### Phase 3: Programs API (2-3 dias)
```
Endpoints:
  [ ] POST /api/programs/start
  [ ] POST /api/programs/:enrollmentId/progress
  [ ] POST /api/programs/:enrollmentId/complete
  [ ] POST /api/programs/:enrollmentId/answers
  [ ] GET /api/programs/:enrollmentId
  [ ] GET /api/programs

Funcionalidades:
  [ ] Criar enrollment
  [ ] Atualizar progresso
  [ ] Salvar respostas de passos
  [ ] Marcar como completo
  [ ] Recuperar dados salvos

Testes:
  [ ] Testes para cada endpoint
  [ ] Validação de dados
  [ ] Testes de concorrência
```

### Phase 4: Frontend Sync (2-3 dias)
```
Sync Service:
  [ ] Criar SyncService com queue
  [ ] Implementar offline detection
  [ ] Implementar retry logic
  [ ] Persistir fila em localStorage

Context Updates:
  [ ] Atualizar RingsContext
  [ ] Atualizar ProgramContext
  [ ] Integrar SyncService
  [ ] Adicionar loading states

Testes:
  [ ] Testes offline/online
  [ ] Testes de fila de sync
  [ ] Testes de conflitos
  [ ] Testes multi-dispositivo
```

### Phase 5: Data Migration (1 dia)
```
  [ ] Criar script de migração
  [ ] Migrar dados existentes
  [ ] Validar integridade
  [ ] Backup de dados
```

### Phase 6: Deployment & Monitoring (1 dia)
```
  [ ] Deploy para staging
  [ ] Testes end-to-end
  [ ] Monitoring setup
  [ ] Error logging
  [ ] Performance monitoring
  [ ] Deploy para production
```

---

## 🔌 API Endpoints Summary

### Rituals
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/rituals/start` | Inicia ritual do dia |
| POST | `/api/rituals/:id/answer` | Salva resposta de um anel |
| POST | `/api/rituals/:id/complete` | Marca ritual como completo |
| GET | `/api/rituals` | Lista rituals |
| GET | `/api/rituals/:id` | Busca ritual específico |
| GET | `/api/rings/progress` | Estatísticas e progresso |

### Programs
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/programs/start` | Inicia um programa |
| POST | `/api/programs/:id/progress` | Atualiza progresso |
| POST | `/api/programs/:id/complete` | Marca como completo |
| POST | `/api/programs/:id/answers` | Salva respostas do passo |
| GET | `/api/programs/:id` | Busca programa |
| GET | `/api/programs` | Lista programas do usuário |

---

## 📊 Database Schema (Mínimo)

```sql
-- Rituals
daily_rituals(id, user_id, date, status, created_at, updated_at, completed_at)
ring_answers(id, ritual_id, ring_id, answer, metadata, timestamp)

-- Programs
programs(id, title, description, duration, steps_count)
program_enrollments(id, user_id, program_id, current_lesson, progress, status, started_at, last_accessed_at, completed_at)
program_answers(id, enrollment_id, step, answers, saved_at, updated_at)

-- Indexes
idx_daily_rituals_user_date
idx_ring_answers_ritual
idx_program_enrollments_user
idx_program_answers_enrollment
```

---

## 💡 Key Implementation Details

### 1. Authentication
```typescript
// Every request needs:
Authorization: Bearer {jwt_token}
X-User-Id: {user-uuid}
```

### 2. Timestamps
```typescript
// Use ISO strings for consistency
started_at: "2025-11-18T10:00:00Z"
completed_at: "2025-11-18T10:30:00Z"
```

### 3. Ring Metadata (JSONB)
```typescript
// Earth ring example:
{
  "distraction": "Redes sociais",
  "focusReasons": ["redes_sociais"],
  "focusScore": 7
}
```

### 4. Streak Calculation
```typescript
// Query últimos N dias
// Find consecutive completed days from today backwards
// Current streak = how many days in a row (including today or yesterday)
```

### 5. Compliance Rate
```typescript
// completedDays / totalTrackedDays * 100
// Only count completed rituals
```

---

## 🧪 Quick Test Cases

### Rituals
```bash
# Start ritual
curl -X POST http://localhost:3001/api/rituals/start \
  -H "Authorization: Bearer <token>"

# Add answer
curl -X POST http://localhost:3001/api/rituals/<id>/answer \
  -H "Authorization: Bearer <token>" \
  -d '{"ringId":"earth","answer":"...","metadata":{...}}'

# Complete ritual
curl -X POST http://localhost:3001/api/rituals/<id>/complete \
  -H "Authorization: Bearer <token>"

# Get progress
curl -X GET http://localhost:3001/api/rings/progress \
  -H "Authorization: Bearer <token>"
```

### Programs
```bash
# Start program
curl -X POST http://localhost:3001/api/programs/start \
  -d '{"programId":"rec_2","..."}'

# Update progress
curl -X POST http://localhost:3001/api/programs/<id>/progress \
  -d '{"progress":33,"currentLesson":"..."}'

# Complete program
curl -X POST http://localhost:3001/api/programs/<id>/complete
```

---

## 🚨 Common Pitfalls

### ❌ Don't:
- Confiar apenas em client-side validation
- Enviar timestamps em formato diferente (sempre ISO string)
- Salvar respostas sem validar ringId
- Permitir que usuário complete ritual com < 5 anéis respondidos
- Calcular streaks no client (fazer no backend)
- Salvar progress > 100%
- Misturar timezones (sempre UTC)

### ✅ Do:
- Validar todos os inputs no backend
- Usar prepared statements (previnir SQL injection)
- Implementar RLS no Supabase
- Calcular estatísticas server-side
- Logar erros de sync
- Implementar retry com exponential backoff
- Testar offline/online scenarios
- Ter plano de backup

---

## 📈 Performance Expectations

| Operação | Tempo Esperado |
|----------|---|
| POST /rituals/start | < 200ms |
| POST /rituals/:id/answer | < 300ms |
| GET /rings/progress | < 500ms |
| POST /programs/start | < 200ms |
| GET /programs/:id | < 300ms |
| Sync fila (10 itens) | < 2s |

---

## 🔒 Security Checklist

- [ ] RLS habilitado para todas as tabelas
- [ ] JWT verificado em todas as requisições
- [ ] CORS configurado corretamente
- [ ] Prepared statements para SQL queries
- [ ] Validação de tipos (TypeScript)
- [ ] Rate limiting implementado
- [ ] Timeout configurado
- [ ] Error messages sem informações sensíveis
- [ ] Logs sem senhas/tokens
- [ ] HTTPS obrigatório em produção

---

## 📞 FAQ - Backend

**P: Preciso de um terceiro serviço (Redis, etc)?**
A: Inicialmente não. PostgreSQL + Express é suficiente. Redis pode ajudar com cache posterior.

**P: Como fazer backup dos dados?**
A: Supabase oferece backup automático. Considere backups diários adicionais.

**P: Quantos usuários a infra suporta?**
A: PostgreSQL em Supabase (tier padrão) suporta 10k+ usuários sem problemas.

**P: Preciso versionamento de programas?**
A: Para MVP, não. Adicionar depois se necessário.

**P: Como lidar com usuário deletar conta?**
A: Cascade delete via RLS. `ON DELETE CASCADE` em todas as foreign keys.

**P: Posso migrar dados de um backend para outro?**
A: Sim, export como JSON e reimportar. Backup primeiro!

---

## 📚 Recursos Recomendados

- PostgreSQL docs: https://www.postgresql.org/docs/
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Express.js: https://expressjs.com/
- JWT: https://jwt.io/
- RESTful API design: https://restfulapi.net/

---

## ⏱️ Estimativa Total

- **Desenvolvimento Backend**: 10-12 dias
- **Testes**: 3-4 dias
- **Frontend Integration**: 3-4 dias
- **Deployment & QA**: 2-3 dias

**Total**: ~3-4 semanas para integração 100%

---

## ✅ Acceptance Criteria

A integração é considerada **100% completa** quando:

1. ✅ Todos os endpoints estão implementados e testados
2. ✅ Dados de rituals são salvos permanentemente no backend
3. ✅ Dados de programs são salvos permanentemente no backend
4. ✅ Sync automático funciona offline/online
5. ✅ Múltiplos dispositivos mostram dados sincronizados
6. ✅ Streaks calculados corretamente
7. ✅ Estatísticas agregadas funcionam
8. ✅ RLS previne acesso não-autorizado
9. ✅ Performance atende os requisitos (< 500ms)
10. ✅ Testes de integração passam
11. ✅ Sem erros em produção (monitored for 7 days)
12. ✅ Documentação atualizada

---

**Próximo Passo**: Escolher stack (Node.js/Express, Django, Go, etc) e começar a implementação!

---

**Last Updated:** November 18, 2025
**Version:** 1.0
