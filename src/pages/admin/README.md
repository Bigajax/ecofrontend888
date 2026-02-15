# Admin Dashboard - ECOTOPIA

## Conversion Analytics Dashboard

**URL**: `/app/admin/conversion`

### Acesso

O dashboard é restrito a emails de admin listados em:
```typescript
// src/pages/admin/ConversionDashboard.tsx
const ADMIN_EMAILS = [
  'admin@ecotopia.com',
  'rafael@ecotopia.com',
  // Adicione mais emails aqui
];
```

Para adicionar novos admins, edite este array.

### Métricas Disponíveis

#### KPIs Principais
- **Total de Usuários**: Todos os usuários cadastrados
- **Usuários Premium**: Soma de Essentials + Premium
- **Trial → Paid**: Taxa de conversão de trial para pago
- **Lifetime Value (LTV)**: Valor médio por usuário premium

#### Distribuição de Usuários
Gráfico de pizza mostrando:
- Free users (cinza)
- Trial users (azul)
- Essentials users (roxo)
- Premium users (verde)

#### Funil de Conversão
Gráfico de barras mostrando:
- Signups → Trials → Paid
- Taxas de conversão em cada etapa

#### Conversion Triggers
Lista dos triggers que mais convertem:
- Chat limit hit
- Meditation preview
- Reflection archive
- Rings gate
- Memory advanced

Mostra:
- Total de hits
- Total de conversões
- Taxa de conversão (%)

#### Churn & LTV
- **Churn Rate**: % de cancelamentos nos últimos 30 dias
- **LTV Médio**: Valor de vida útil de um usuário premium

### Funcionalidades

#### Atualizar Dados
Botão de refresh no canto superior direito para recarregar métricas.

#### Exportar CSV
Botão de download para exportar todas as métricas em formato CSV.

Arquivo gerado: `conversion-metrics-YYYY-MM-DD.csv`

### Coleta de Baseline

**IMPORTANTE**: Antes de implementar limites e otimizações (Fase 1+), execute este dashboard por **1-2 semanas** para coletar dados de baseline.

Isso permite:
1. Entender comportamento atual dos usuários
2. Medir impacto real das mudanças
3. Tomar decisões data-driven
4. Evitar otimizações prematuras

### Próximos Passos

Após coletar baseline:
1. Exportar CSV com métricas iniciais
2. Documentar números atuais
3. Implementar Fase 1 (Quick Wins)
4. Comparar métricas antes/depois

### Eventos Mixpanel Adicionados

Novos eventos de tracking implementados:

**Free Tier Limits**:
- `Free Tier Limit Hit`
- `Premium Feature Attempted`

**Trial Management**:
- `Trial Started`
- `Trial Day Check-in`
- `Trial Ending Soon`

**Churn Analysis**:
- `Subscription Cancelled`
- `Downgraded to Free`

Esses eventos serão usados nas próximas fases para otimizar conversão.

### Schema Sugerido (Backend)

Para melhorar tracking, considere adicionar tabelas:

```sql
-- Subscription events log
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50), -- 'trial.started', 'subscription.paid', 'subscription.cancelled'
  plan VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversion trigger tracking
CREATE TABLE conversion_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  trigger_type VARCHAR(50), -- 'chat_limit', 'meditation_preview', etc.
  converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User subscription status
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP;
```

### Debugging

Se dashboard não carregar:
1. Verificar se usuário logado está na whitelist
2. Abrir console para ver erros
3. Verificar se Supabase está acessível
4. Verificar permissões na tabela `users`

### Suporte

Dúvidas ou bugs, reportar em:
- GitHub Issues
- Email: dev@ecotopia.com
