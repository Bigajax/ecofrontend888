# Sistema de Acesso por Tiers - Biblioteca de Meditações

## 📊 Resumo da Implementação

Sistema completo de **tiered access** para a biblioteca de meditações do ECOTOPIA, implementando controle de acesso por tier (Free, Essentials, Premium) com tracking, UI/UX aprimorado e copy contextual.

---

## ✅ O que foi Implementado

### 1. Arquivo de Constantes de Tiers (`src/constants/meditationTiers.ts`)

**Criado arquivo centralizado** que define:

#### Estrutura de Tiers:

**FREE TIER:**
- 6 meditações básicas (5-8 minutos)
- Meditações disponíveis:
  - Bênção dos Centros de Energia (7 min)
  - Sintonizar Novos Potenciais (7 min)
  - Recondicionar o Corpo (7 min)
  - Meditação Caminhando (5 min)
  - Espaço-Tempo (5 min)
  - Introdução à Meditação (8 min)

**ESSENTIALS TIER (R$ 14,90/mês):**
- Todas as meditações FREE
- Meditações intermediárias (até 14 minutos)
- **Bloqueia** meditações de 15min+

**PREMIUM TIER (R$ 29,90/mês):**
- Acesso completo ilimitado
- Meditações longas (15-25 min):
  - Meditação do Sono (15 min)
  - Caleidoscópio Mind Movie (22 min)
  - Quem Pensa Enriquece (25 min)
- Programas completos

#### Helper Functions:

```typescript
// Verifica se usuário tem acesso a meditação
canAccessMeditation(meditationId: string, userTier: 'free' | 'essentials' | 'premium' | 'vip'): boolean

// Retorna tier necessário para meditação
getRequiredTier(meditationId: string): MeditationTier

// Retorna mensagem de upgrade contextual
getUpgradeMessage(meditationTier: MeditationTier, userTier: string): string
```

---

### 2. Tracking de Analytics (`ProgramasPage.tsx`)

**Eventos Mixpanel adicionados:**

#### Quando meditação premium é bloqueada:
```typescript
trackPremiumFeatureAttempted({
  feature_id: meditationId,
  feature_name: meditation.title,
  context: 'meditation_library',
  is_premium_user: false,
  user_id: user?.id,
});

mixpanel.track('Meditation Premium Clicked', {
  meditation_id: meditationId,
  meditation_title: meditation.title,
  duration_minutes: meditation.durationMinutes,
  user_tier: tier,
  is_locked: true,
  user_id: user?.id,
});
```

#### Quando meditação é acessada com sucesso:
```typescript
mixpanel.track('Meditation Started', {
  meditation_id: meditationId,
  meditation_title: meditation.title,
  duration_minutes: meditation.durationMinutes,
  user_tier: tier,
  is_premium: meditation.isPremium,
  user_id: user?.id,
});
```

#### Tracking de CTAs de upgrade:
- `Meditation Library Upgrade Banner Click`
- `Meditation Footer Upgrade Click`

---

### 3. UI/UX Aprimorado

#### **Banner Informativo no Topo** (Free/Essentials apenas)

```
┌─────────────────────────────────────────────────────┐
│ 📚 Você tem acesso a 6 meditações gratuitas        │
│ 6 de 9 meditações disponíveis • 3 premium 🔒       │
│                                    [Ver Planos] ─┐ │
└─────────────────────────────────────────────────────┘
```

- Mostra estatísticas de acesso (X de Y meditações)
- Diferencia copy para Free vs Essentials
- Botão de upgrade contextual
- Tracking de cliques

#### **Badge de Tier Dinâmico**

Badges nos cards de meditação mostram tier necessário:
- **FREE** - Sem lock icon (acessível)
- **PREMIUM** - Com lock icon 🔒 (bloqueado)
- Gradient azul-roxo para premium

#### **Footer com Estatísticas** (Free/Essentials apenas)

```
Você desbloqueou 6 de 9 meditações

[████████████░░░░] 66%

[🔒 Desbloquear todas as 3 meditações premium]
```

- Progress bar visual
- Contador de meditações locked/unlocked
- CTA grande e destacado
- Tracking de conversão

#### **Overlay Visual em Meditações Locked**

- Filtro grayscale parcial (20%)
- Blur leve no overlay
- Lock icon no badge
- Botão Play continua visível (mas trigger modal)

---

### 4. Copy Contextual Atualizada

**Novos contextos adicionados em `conversionCopy.ts`:**

#### `meditation_library_banner`:
```typescript
{
  title: 'Desbloqueie a Biblioteca Completa',
  message: 'Acesse meditações longas, programas completos e novos conteúdos toda semana. Aprofunde sua prática sem limites.',
  primaryCta: 'Ver Planos',
  secondaryCta: 'Continuar explorando',
  subtitle: '7 dias grátis • Cancele quando quiser',
}
```

#### `meditation_library_footer`:
```typescript
{
  title: 'Aprofunde Sua Prática',
  message: 'Desbloqueie meditações de 15-25 minutos, programas completos de transformação e novos conteúdos exclusivos.',
  primaryCta: 'Desbloquear Biblioteca Premium',
  secondaryCta: 'Voltar',
  subtitle: '7 dias grátis • R$ 29,90/mês depois',
}
```

#### `meditation_premium_locked` (já existia, mantido):
```typescript
{
  title: 'Meditação Premium',
  message: 'Esta meditação é exclusiva do plano Premium. Upgrade para acessar todas as práticas de 15+ minutos e conteúdos avançados.',
  primaryCta: 'Upgrade para Premium',
  secondaryCta: 'Voltar à biblioteca',
  subtitle: '7 dias grátis • Todas as meditações',
}
```

---

## 🎯 Lógica de Bloqueio por Tier

### Free Tier:
- ✅ Acessa 6 meditações básicas (5-8 min)
- ❌ Bloqueado: Meditações 15min+ (Sono, Caleidoscópio, Quem Pensa Enriquece)

### Essentials Tier (R$ 14,90/mês):
- ✅ Acessa todas as meditações FREE
- ✅ Acessa meditações de até 14 minutos
- ❌ Bloqueado: Meditações 15min+ (Sono, Caleidoscópio, Quem Pensa Enriquece)
- **Copy diferenciada**: "Upgrade Premium para meditações longas"

### Premium Tier (R$ 29,90/mês):
- ✅ Acesso ilimitado a todas as meditações
- ✅ Programas completos
- ✅ Novos conteúdos em breve

### VIP Tier:
- ✅ Acesso completo (igual Premium)

---

## 📈 Métricas de Conversão Esperadas

### KPIs a Monitorar:

1. **Taxa de Clique em Meditação Premium (Locked)**
   - Evento: `Meditation Premium Clicked` com `is_locked: true`
   - Meta: >15% dos usuários free/essentials

2. **Taxa de Conversão no Banner**
   - Evento: `Meditation Library Upgrade Banner Click`
   - Meta: 5-10% CTR

3. **Taxa de Conversão no Footer**
   - Evento: `Meditation Footer Upgrade Click`
   - Meta: 3-7% CTR

4. **Conversão Final (Modal → Checkout)**
   - Contextos: `meditation_library_banner`, `meditation_library_footer`, `meditation_premium_locked`
   - Meta: 20-30% dos que abriram modal iniciam checkout

5. **Free → Essentials vs Free → Premium**
   - Comparar qual tier converte mais de free users
   - Essentials pode atrair usuários sensíveis a preço

---

## 🧪 Como Testar

### Teste como Free User:

1. Logout da conta (ou use modo incógnito)
2. Crie conta free (sem subscription)
3. Acesse `/app/programas`
4. Verifique:
   - ✅ Banner no topo mostra "6 de 9 meditações disponíveis"
   - ✅ Meditações FREE (5-8min) têm botão Play funcional
   - ✅ Meditações PREMIUM (15min+) têm badge "PREMIUM" + lock icon
   - ✅ Click em meditação premium abre `UpgradeModal`
   - ✅ Footer mostra progress bar e CTA de upgrade
   - ✅ Eventos Mixpanel são trackados

### Teste como Essentials User:

1. Login com conta Essentials (R$ 14,90)
2. Acesse `/app/programas`
3. Verifique:
   - ✅ Banner mostra "Plano Essentials: Meditações até 15 minutos"
   - ✅ Meditações até 14min são acessíveis
   - ✅ Meditações 15min+ continuam locked
   - ✅ Modal mostra copy de upgrade para Premium

### Teste como Premium User:

1. Login com conta Premium (R$ 29,90)
2. Acesse `/app/programas`
3. Verifique:
   - ✅ Nenhum banner informativo
   - ✅ Todas as meditações acessíveis
   - ✅ Nenhum lock icon
   - ✅ Nenhum footer de upgrade

---

## 📂 Arquivos Modificados/Criados

### Criados:
- ✅ `src/constants/meditationTiers.ts` - Sistema de tiers centralizado

### Modificados:
- ✅ `src/pages/ProgramasPage.tsx` - UI, tracking, lógica de bloqueio
- ✅ `src/constants/conversionCopy.ts` - Novos contextos e copy

### Imports Adicionados:
```typescript
// ProgramasPage.tsx
import { useAuth } from '@/contexts/AuthContext';
import { trackPremiumFeatureAttempted } from '@/lib/mixpanelConversionEvents';
import mixpanel from '@/lib/mixpanel';
import {
  canAccessMeditation,
  getRequiredTier,
  getUpgradeMessage,
  MEDITATION_TIER_MAP,
} from '@/constants/meditationTiers';
```

---

## 🚀 Próximos Passos (Opcional)

### Fase 2.2: Memory Freemium Model
- Limitar histórico de memórias (30 dias free, ilimitado premium)
- Blur em charts avançados para free users
- Badge "Premium" em insights de AI

### Fase 2.3: Trial Onboarding
- Checklist de ativação durante trial
- Email reminders (Day 1, 3, 5, 6)
- Trial countdown no header

### Fase 3.3: Referral Program
- Sistema de códigos únicos
- Recompensas (1 mês grátis por referido)
- Dashboard de referrals

---

## 📝 Notas Importantes

1. **Backend**: O sistema atual funciona 100% no frontend via `canAccessMeditation()`. Backend pode adicionar validação adicional se necessário.

2. **Dynamic Pricing**: O hook `useDynamicPricing` já existe e pode ser integrado para oferecer descontos personalizados (ex: "20% off se bateu 3 limites").

3. **A/B Testing**: Considerar testar diferentes limites:
   - Free: 6 vs 8 meditações
   - Essentials: 14min vs 15min cutoff
   - Copy: "Upgrade" vs "Desbloquear" vs "Aprofundar"

4. **Baseline Metrics**: Coletar 1-2 semanas de dados via Conversion Dashboard (`/admin/conversion`) antes de otimizar.

---

## ✨ Conclusão

Sistema de **tiered access para meditações** está **100% implementado e pronto para produção**! ✅

**Destaques:**
- ✅ Lógica de bloqueio centralizada e reutilizável
- ✅ Tracking completo de conversão
- ✅ UI/UX elegante com badges, banners e progress bars
- ✅ Copy contextual filosófica
- ✅ Suporte a 3 tiers (Free, Essentials, Premium)

**Impacto Esperado:**
- Aumento de conversão Free → Essentials/Premium
- Maior consciência de limites (via banner/footer)
- Dados para otimizar pricing e messaging

---

**Documentação criada em**: 2026-02-16
**Versão**: 1.0
**Status**: ✅ Implementado e Testável
