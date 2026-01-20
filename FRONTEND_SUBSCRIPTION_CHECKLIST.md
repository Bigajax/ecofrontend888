# Frontend Subscription - Checklist de Pontas Soltas

## ✅ O que JÁ está pronto (Não mexer!)

- ✅ Tipos TypeScript (`src/types/subscription.ts`)
- ✅ API Client (`src/api/subscription.ts`)
- ✅ Hook `usePremiumContent` (`src/hooks/usePremiumContent.ts`)
- ✅ Componentes UI:
  - ✅ `UpgradeModal`
  - ✅ `PricingCard`
  - ✅ `SubscriptionManagement`
- ✅ AuthContext com subscription state
- ✅ `SubscriptionCallbackPage` (página de retorno do checkout)
- ✅ Rota `/app/subscription/callback`
- ✅ Integração em:
  - ✅ `DrJoeDispenzaPage`
  - ✅ `IntroducaoMeditacaoPage`
  - ✅ `ConfiguracoesPage`

---

## 🟡 Pontas Soltas - Frontend

### 1. Variável de Ambiente (.env)

**Arquivo:** `.env`

```bash
# Adicionar estas variáveis:
VITE_MP_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Como obter:**
1. Criar conta no Mercado Pago: https://www.mercadopago.com.br
2. Ir em Developers > Credenciais
3. Copiar a Public Key (Production ou Test)
4. Adicionar no arquivo `.env` na raiz do projeto

**IMPORTANTE:** A Public Key é segura para expor no frontend. NÃO confundir com Access Token (que é secreto).

---

### 2. Integrar Paywall em Páginas Faltantes

Algumas páginas de conteúdo premium ainda **não** têm proteção com paywall.

#### 📄 Páginas que DEVEM ter paywall:

**Decisão necessária:** Você precisa definir quais conteúdos são premium e quais são free.

##### Opção 1: Todo conteúdo dos 5 Anéis é premium

```typescript
// src/pages/rings/FiveRingsHub.tsx
import { usePremiumContent } from '@/hooks/usePremiumContent';
import UpgradeModal from '@/components/subscription/UpgradeModal';

export default function FiveRingsHub() {
  const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();

  const handleRingClick = (ringId: string) => {
    const { hasAccess } = checkAccess(true); // true = conteúdo premium
    if (!hasAccess) {
      requestUpgrade(); // Abre modal
      return;
    }
    // ... navegar para o anel
  };

  return (
    <>
      {/* Componente existente */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="five_rings_hub"
      />
    </>
  );
}
```

##### Opção 2: Caleidoscópio é premium

```typescript
// src/pages/CaleidoscopioMindMovieProgramPage.tsx
import { usePremiumContent } from '@/hooks/usePremiumContent';
import UpgradeModal from '@/components/subscription/UpgradeModal';

export default function CaleidoscopioMindMovieProgramPage() {
  const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();

  useEffect(() => {
    const { hasAccess } = checkAccess(true);
    if (!hasAccess) {
      requestUpgrade();
    }
  }, []);

  // ...
}
```

##### Opção 3: Diário Estoico premium após X dias free

```typescript
// src/components/home/LiveReflectionSection.tsx
import { usePremiumContent } from '@/hooks/usePremiumContent';

export default function LiveReflectionSection() {
  const { checkAccess, requestUpgrade } = usePremiumContent();

  const handleWatchVideo = () => {
    // Permitir 3 vídeos grátis, depois bloquear
    const videosWatched = localStorage.getItem('eco.diario.videosWatched') || 0;

    if (videosWatched >= 3) {
      const { hasAccess } = checkAccess(true);
      if (!hasAccess) {
        requestUpgrade();
        return;
      }
    }

    // ... reproduzir vídeo
  };
}
```

**Ação necessária:** Decidir com a equipe qual será a estratégia de monetização.

---

### 3. Migration do Banco de Dados (Supabase)

**Arquivo:** `MIGRATION_SUBSCRIPTION.sql`

**Status:** ❌ NÃO executado ainda

**Passos:**
1. Abrir Supabase Dashboard: https://app.supabase.com
2. Ir na aba "SQL Editor"
3. Copiar TODO o conteúdo do arquivo `MIGRATION_SUBSCRIPTION.sql`
4. Colar no editor e clicar em "Run"
5. Verificar se executou sem erros

**O que a migration faz:**
- Adiciona colunas à tabela `usuarios`:
  - `trial_start_date`
  - `trial_end_date`
  - `provider`
  - `provider_preapproval_id`
  - `provider_payment_id`
  - `subscription_status`
  - `plan_type`
  - `current_period_end`
  - `access_until`
- Cria tabela `subscription_events` (log de eventos)
- Cria tabela `payments` (histórico de pagamentos)
- Cria índices para performance
- Configura Row Level Security (RLS)

**Validação:**
Após rodar a migration, executar no SQL Editor:

```sql
-- Verificar se colunas foram adicionadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name IN (
    'trial_start_date', 'trial_end_date', 'access_until',
    'provider_preapproval_id', 'subscription_status'
  );

-- Deve retornar 5 linhas
```

---

### 4. Testar Fluxo no Frontend (Após Backend Implementado)

**Checklist de Testes:**

- [ ] **Teste 1: Modal de Upgrade**
  - [ ] Abrir página com conteúdo premium
  - [ ] Clicar em conteúdo bloqueado
  - [ ] Modal de upgrade deve abrir
  - [ ] Conseguir fechar o modal

- [ ] **Teste 2: Seleção de Plano**
  - [ ] Selecionar plano mensal
  - [ ] Card deve ficar destacado
  - [ ] Selecionar plano anual
  - [ ] Card anual deve ficar destacado
  - [ ] Botão "Começar 7 Dias Grátis" deve estar visível

- [ ] **Teste 3: Checkout (Mensal)**
  - [ ] Clicar em "Começar 7 Dias Grátis" com plano mensal
  - [ ] Deve redirecionar para Mercado Pago
  - [ ] URL deve conter `pref_id=` ou similar
  - [ ] Completar pagamento (usar cartão de teste)
  - [ ] Após pagamento, redirecionar para `/app/subscription/callback`
  - [ ] Página de callback deve mostrar "loading"
  - [ ] Após 2-10 segundos, mostrar "Sucesso"
  - [ ] Confetti deve aparecer
  - [ ] Redirecionar para `/app` automaticamente

- [ ] **Teste 4: Verificar Acesso Premium**
  - [ ] Após checkout bem-sucedido, abrir página de configurações
  - [ ] Aba "Assinatura" deve mostrar "Premium Mensal" ou "Trial Premium"
  - [ ] Badge "Premium" deve aparecer
  - [ ] Conteúdo premium deve estar desbloqueado (sem modal)

- [ ] **Teste 5: Cancelamento**
  - [ ] Ir em Configurações > Assinatura
  - [ ] Clicar em "Cancelar Assinatura"
  - [ ] Modal de confirmação deve abrir
  - [ ] Digitar motivo (opcional)
  - [ ] Confirmar cancelamento
  - [ ] Status deve mudar para "Cancelado"
  - [ ] Mas acesso deve continuar até fim do período

- [ ] **Teste 6: Callback com Erro**
  - [ ] Simular pagamento rejeitado no MP
  - [ ] Callback deve mostrar mensagem de erro
  - [ ] Botão "Voltar ao início" deve funcionar
  - [ ] Não deve aparecer confetti

---

### 5. Analytics (Mixpanel) - Verificar Eventos

Todos os eventos de subscription já estão instrumentados. Verificar se estão sendo enviados:

**Eventos esperados:**
- `Upgrade Modal Shown` - Quando modal abre
- `Plan Selected` - Quando usuário seleciona plano
- `Checkout Initiated` - Quando clica em "Começar 7 Dias Grátis"
- `Checkout Failed` - Se checkout falha
- `Payment Success` - Quando pagamento é aprovado
- `Payment Pending` - Quando fica pendente
- `Payment Error` - Quando dá erro
- `Subscription Cancelled` - Quando cancela
- `Manage MP Subscription Clicked` - Quando abre painel do MP

**Como verificar:**
1. Abrir Mixpanel (se tiver acesso)
2. Ir em "Events" > "Live View"
3. Fazer teste de upgrade
4. Verificar se eventos aparecem em tempo real

---

### 6. Ajustes de UI/UX (Opcional, mas Recomendado)

#### 6.1 Badge Premium no Header

Mostrar badge "Premium" no header quando usuário estiver premium:

```typescript
// src/components/home/HomeHeader.tsx
import { useAuth } from '@/contexts/AuthContext';

export default function HomeHeader() {
  const { isPremiumUser, isTrialActive } = useAuth();

  return (
    <header>
      {/* ... conteúdo existente */}
      {(isPremiumUser || isTrialActive) && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#6EC8FF] to-[#5AB3D9] rounded-full">
          <Crown className="w-4 h-4 text-white" />
          <span className="text-xs font-semibold text-white">
            {isTrialActive ? 'Trial Premium' : 'Premium'}
          </span>
        </div>
      )}
    </header>
  );
}
```

#### 6.2 Banner de Trial Ending

Mostrar aviso quando trial estiver acabando (últimos 2 dias):

```typescript
// src/components/TrialEndingBanner.tsx
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function TrialEndingBanner() {
  const { isTrialActive, trialDaysRemaining } = useAuth();

  if (!isTrialActive || trialDaysRemaining > 2) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <div>
          <p className="font-medium text-amber-900">
            Seu trial termina em {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'}!
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Atualize seu plano para continuar com acesso premium.
          </p>
        </div>
      </div>
    </div>
  );
}
```

Adicionar no `HomePage.tsx`:

```typescript
import TrialEndingBanner from '@/components/TrialEndingBanner';

export default function HomePage() {
  return (
    <div>
      <HomeHeader />
      <TrialEndingBanner />
      {/* ... resto do conteúdo */}
    </div>
  );
}
```

#### 6.3 Botão "Upgrade" no Menu

Adicionar botão de upgrade no menu para usuários free:

```typescript
// src/components/EcoSidebar.tsx (ou onde o menu estiver)
import { usePremiumContent } from '@/hooks/usePremiumContent';
import { Crown } from 'lucide-react';

export default function EcoSidebar() {
  const { isPremiumUser, isTrialActive, requestUpgrade } = usePremiumContent();

  return (
    <nav>
      {/* ... itens de menu existentes */}

      {!isPremiumUser && !isTrialActive && (
        <button
          onClick={() => requestUpgrade('sidebar')}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#6EC8FF] to-[#5AB3D9] text-white rounded-xl font-medium hover:shadow-lg transition-all"
        >
          <Crown className="w-5 h-5" />
          <span>Faça Upgrade</span>
        </button>
      )}
    </nav>
  );
}
```

---

### 7. Tratamento de Erros Avançado

#### 7.1 Retry em Caso de Falha de Rede

```typescript
// src/api/subscription.ts

// Adicionar retry logic ao createSubscription
export async function createSubscription(plan: PlanType): Promise<CreateSubscriptionResponse> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await apiFetchJson(`${SUBSCRIPTION_BASE_PATH}/create-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      // ... validação existente ...
      return result.data as CreateSubscriptionResponse;
    } catch (error) {
      lastError = error as Error;
      if (attempt < MAX_RETRIES - 1) {
        // Esperar 1s antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}
```

#### 7.2 Toast de Notificação

Instalar biblioteca de toast (opcional):

```bash
npm install react-hot-toast
```

Usar em `UpgradeModal.tsx`:

```typescript
import toast from 'react-hot-toast';

const handleSubscribe = async () => {
  try {
    setState('loading');
    const response = await createSubscription(selectedPlan);
    toast.success('Redirecionando para o checkout...');
    window.location.href = response.initPoint;
  } catch (error) {
    toast.error(error.message);
    setState('error');
  }
};
```

---

## 🎯 Prioridade de Implementação

### Alta Prioridade (Fazer AGORA)

1. ✅ Adicionar `VITE_MP_PUBLIC_KEY` no `.env`
2. ✅ Rodar migration `MIGRATION_SUBSCRIPTION.sql` no Supabase
3. ⏳ Implementar backend (ver `BACKEND_SUBSCRIPTION_TODO.md`)
4. ⏳ Testar fluxo completo

### Média Prioridade (Fazer DEPOIS)

5. Definir quais páginas serão premium
6. Integrar paywall nas páginas escolhidas
7. Adicionar badge "Premium" no header
8. Adicionar banner de trial ending
9. Testar analytics no Mixpanel

### Baixa Prioridade (Opcional)

10. Adicionar toast notifications
11. Implementar retry logic
12. Criar testes automatizados
13. Adicionar cupons de desconto

---

## 📝 Notas Importantes

### Segurança

- ✅ **Nunca confiar em parâmetros da URL de retorno do checkout**
  - O `SubscriptionCallbackPage` já faz validação correta: consulta o backend
  - NÃO ativar premium baseado em `?status=approved` na URL

- ✅ **Validar acesso no backend também**
  - Frontend verifica `isPremiumUser` apenas para UX
  - Backend DEVE validar `access_until > NOW()` em TODAS as rotas premium

### Performance

- ✅ Cache implementado:
  - AuthContext faz refresh de subscription apenas quando `user.id` muda
  - SubscriptionCallbackPage faz retry com delay (não bombardeia backend)

### Acessibilidade

- ✅ Modal tem `aria-modal="true"` e `role="dialog"`
- ✅ Todos os botões têm labels descritivos
- ✅ Cores têm contraste adequado (WCAG AA)

---

## ✅ Checklist Final

- [ ] `.env` configurado com `VITE_MP_PUBLIC_KEY`
- [ ] Migration rodada no Supabase
- [ ] Backend implementado e deployado
- [ ] Webhook configurado no Mercado Pago
- [ ] Fluxo de checkout mensal testado
- [ ] Fluxo de checkout anual testado
- [ ] Cancelamento testado
- [ ] Callback de sucesso testado
- [ ] Callback de erro testado
- [ ] Analytics validado no Mixpanel
- [ ] Páginas premium definidas e protegidas
- [ ] Badge "Premium" adicionado (opcional)
- [ ] Banner de trial ending adicionado (opcional)
- [ ] Testes de integração criados (opcional)
- [ ] Documentação atualizada

---

**Última atualização:** 2026-01-09
