# 📍 Onde Aparece o Modal de Assinatura

Este documento explica **exatamente onde** o usuário vê a oferta de planos premium no ECO.

---

## ✅ **IMPLEMENTADO - Modal Funciona Aqui**

### 1. **Página Dr. Joe Dispenza** (`/app/dr-joe-dispenza`)

**Como funciona:**
- Usuário vê lista de meditações
- Última meditação tem **ícone de cadeado** 🔒
- Quando usuário **clica** na meditação premium:
  - ❌ Meditação **não toca**
  - ✅ Modal de assinatura **abre automaticamente**
  - 📊 Analytics registra "Premium Content Blocked"

**Meditação Premium:**
- ✅ `Espaço-Tempo, Tempo-Espaço` (isPremium: true)

**Código:**
```tsx
// src/pages/DrJoeDispenzaPage.tsx:126-145
if (meditation.isPremium) {
  const { hasAccess } = checkAccess(true);

  if (!hasAccess) {
    // Registra analytics
    trackMeditationEvent('Front-end: Premium Content Blocked', payload);

    // Abre modal
    requestUpgrade('dr_joe_dispenza_meditation');
    return;
  }
}
```

**Aparência Visual:**
```
┌─────────────────────────────────────┐
│ ⚪ Espaço-Tempo, Tempo-Espaço  🔒   │  ← Ícone de cadeado
│ Transcenda dimensões...             │
│                            5 min ▶  │
└─────────────────────────────────────┘
       ↓ (usuário clica)

┌─────────────────────────────────────┐
│        MODAL DE ASSINATURA          │
│                                     │
│  [Plano Mensal R$29,90]             │
│  [Plano Anual R$299]                │
│                                     │
│  [Começar 7 Dias Grátis]            │
└─────────────────────────────────────┘
```

---

### 2. **Página Introdução à Meditação** (`/app/introducao-meditacao`)

**Como funciona:**
- Similar ao Dr. Joe Dispenza
- Tem meditações com `isPremium: true`
- Clique abre modal automaticamente

**Código:**
```tsx
// src/pages/IntroducaoMeditacaoPage.tsx (similar à linha 126+)
```

---

### 3. **Página de Teste** (`/app/subscription/test`) ⭐ NOVO

**Como funciona:**
- Botão manual "Abrir Modal de Upgrade"
- Mostra todos os componentes isoladamente
- Permite testar sem backend

---

## ❌ **NÃO IMPLEMENTADO - Deveria Ter Mas Não Tem**

### 1. **Página Programas** (`/app/programas`)

**Problema:**
- Tem 2 meditações marcadas como `isPremium: true`
- Ícone de cadeado aparece
- Mas clique **não faz nada** (só bloqueia navegação)
- Modal **não abre**

**Meditações Premium:**
- `Quem Pensa Enriquece` (isPremium: true)
- `Programa de Meditação do Caleidoscópio e Mind Movie` (isPremium: true)

**Código Atual (incompleto):**
```tsx
// src/pages/ProgramasPage.tsx:196-202
const handleMeditationClick = (meditationId: string) => {
  const meditation = meditations.find(m => m.id === meditationId);

  // ❌ Bloqueia mas não abre modal
  if (meditation?.isPremium) {
    return;  // ← Deveria chamar requestUpgrade() aqui!
  }

  // ... resto do código
```

**O que falta:**
```tsx
// DEVERIA SER ASSIM:
import { usePremiumContent } from '@/hooks/usePremiumContent';
import UpgradeModal from '@/components/subscription/UpgradeModal';

// No componente:
const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();

// No handleMeditationClick:
if (meditation?.isPremium) {
  const { hasAccess } = checkAccess(true);
  if (!hasAccess) {
    requestUpgrade('programas_meditation');
    return;
  }
}

// No JSX (final do componente):
<UpgradeModal
  open={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  source="programas"
/>
```

---

### 2. **Painel de Configurações** (`/app/configuracoes`)

**Status:** Implementado mas escondido

**Como funciona:**
- Componente `SubscriptionManagement` existe
- Mostra plano atual, trial, renovação
- Permite cancelar/gerenciar assinatura
- **MAS:** não está sendo exibido na página de configurações

**O que falta:**
Adicionar componente em `ConfiguracoesPage.tsx`:
```tsx
import SubscriptionManagement from '@/components/settings/SubscriptionManagement';

// No JSX:
<section>
  <h2>Assinatura</h2>
  <SubscriptionManagement />
</section>
```

---

### 3. **Chat Page** (Ideia Futura)

**Onde deveria aparecer:**
- Após X mensagens (ex: 50 mensagens)
- Banner no topo: "Você usou 50 de 100 mensagens gratuitas"
- Botão "Assinar Premium"

**Status:** Não implementado

---

### 4. **Memória Emocional** (`/app/memoria`)

**Onde deveria aparecer:**
- Seção "Relatórios Avançados" bloqueada
- Badge "Premium" em recursos avançados
- Clique abre modal

**Status:** Não implementado

---

### 5. **Voice Page** (`/app/voice`)

**Onde deveria aparecer:**
- Após X minutos de uso (ex: 10 minutos)
- Banner: "Upgrade para conversas ilimitadas"

**Status:** Não implementado

---

## 🎯 **Resumo Visual - Fluxo do Usuário**

```
USUÁRIO FREE
    ↓
Navega pelo app
    ↓
Encontra conteúdo PREMIUM
    ↓
    ├─→ [Dr. Joe Dispenza] → Clica meditação 🔒 → MODAL ABRE ✅
    ├─→ [Introdução Meditação] → Clica meditação 🔒 → MODAL ABRE ✅
    ├─→ [Programas] → Clica meditação 🔒 → NADA ACONTECE ❌
    ├─→ [Chat] → Usa 100 mensagens → SEM LIMITE ❌
    ├─→ [Memória] → Vê recursos avançados → SEM BLOQUEIO ❌
    └─→ [Configurações] → Quer gerenciar → SEÇÃO NÃO EXISTE ❌
```

---

## 📋 **Checklist de Implementação**

### Alta Prioridade (UX Crítica)
- [ ] **Programas Page**: Adicionar modal quando clica em conteúdo premium
- [ ] **Configurações Page**: Exibir painel de gerenciamento de assinatura
- [ ] **Home Page**: Adicionar banner/CTA de upgrade (opcional)

### Média Prioridade (Nice to Have)
- [ ] **Chat Page**: Limitar mensagens e mostrar contador
- [ ] **Memória Page**: Bloquear relatórios avançados para free users
- [ ] **Voice Page**: Limitar minutos de uso

### Baixa Prioridade (Futuro)
- [ ] **Header Global**: Badge "Premium" no avatar de usuários premium
- [ ] **Sidebar**: Ícone de cadeado em seções premium
- [ ] **Toast Notification**: "Você é Premium! 🎉" após primeiro pagamento

---

## 🧪 **Como Testar Agora**

### Teste 1: Modal Funciona (Dr. Joe)
1. Acesse: http://localhost:5173/app/dr-joe-dispenza
2. Role até a última meditação: "Espaço-Tempo, Tempo-Espaço" 🔒
3. Clique na meditação
4. ✅ Modal deve abrir com 2 planos

### Teste 2: Modal NÃO Funciona (Programas)
1. Acesse: http://localhost:5173/app/programas
2. Procure "Quem Pensa Enriquece" 🔒
3. Clique na meditação
4. ❌ Nada acontece (bug)

### Teste 3: Página de Teste
1. Acesse: http://localhost:5173/app/subscription/test
2. Clique "Abrir Modal de Upgrade"
3. ✅ Modal abre

---

## 🎨 **Aparência do Modal**

Quando o usuário clica em conteúdo premium bloqueado:

```
┌─────────────────────────────────────────────────────┐
│                    ❌ Fechar                        │
│                                                     │
│           Desbloqueie Todo o Potencial do ECO       │
│                                                     │
│  ┌─────────────────┐   ┌─────────────────────────┐ │
│  │   PLANO MENSAL  │   │   PLANO ANUAL           │ │
│  │                 │   │   🔥 MAIS POPULAR       │ │
│  │   R$ 29,90/mês  │   │   R$ 299/ano            │ │
│  │                 │   │   (2 meses grátis!)     │ │
│  │   ✓ Meditações  │   │   ✓ Meditações          │ │
│  │   ✓ Chat ECO    │   │   ✓ Chat ECO            │ │
│  │   ✓ Análises    │   │   ✓ Análises            │ │
│  │   ✓ Suporte     │   │   ✓ Suporte             │ │
│  └─────────────────┘   └─────────────────────────┘ │
│                                                     │
│          🎁 7 Dias Grátis - Cancele Quando Quiser  │
│                                                     │
│      ┌───────────────────────────────────────┐     │
│      │   Começar 7 Dias Grátis               │     │
│      └───────────────────────────────────────┘     │
│                                                     │
│  🔒 Seguro  |  💳 Cancele quando quiser             │
└─────────────────────────────────────────────────────┘
```

---

## 📞 **Próximos Passos**

1. **Teste os lugares que funcionam:**
   - Dr. Joe Dispenza
   - Introdução à Meditação
   - Página de teste

2. **Decida quais lugares implementar:**
   - Prioridade 1: Programas Page (já tem conteúdo premium)
   - Prioridade 2: Configurações (gerenciamento)
   - Prioridade 3: Outras páginas (futuro)

3. **Depois de implementar backend:**
   - Teste fluxo completo (modal → checkout → pagamento → callback)
   - Valide que usuários premium veem conteúdo desbloqueado

---

**Última atualização:** 2026-01-21
