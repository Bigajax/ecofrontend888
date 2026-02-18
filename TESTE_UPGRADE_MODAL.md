# 🧪 Guia de Teste - UpgradeModal Melhorado

## 🚀 Como Testar

### 1. Acesse a Página de Teste

Abra seu navegador e vá para:

```
http://localhost:5177/test-upgrade-modal
```

Você verá uma página dedicada ao teste com botões e informações sobre as melhorias.

---

## ✅ Checklist de Testes

### 📋 Teste 1: Estado Normal (Free User)

**Passos:**
1. Click em "Abrir Modal (Estado Normal)"
2. Verifique os elementos visuais

**O que deve aparecer:**
- ✅ Logo ECOTOPIA no topo
- ✅ Header: "Desbloqueie Todo o Potencial da ECOTOPIA"
- ✅ Badge azul: "7 Dias Grátis • Cancele Quando Quiser"
- ✅ Social proof verde: "XXX+ pessoas começaram trial esta semana" (número dinâmico 180-280)
- ✅ "Junte-se a 1.200+ membros transformando suas vidas 🌱"
- ✅ 3 pricing cards lado a lado:
  - **Essentials** (R$ 14,90) - "Comece sua jornada"
  - **Premium** (R$ 29,90) - "Mais popular" com badge
  - **Premium Anual** (R$ 299,00) - "Melhor custo-benefício" com desconto
- ✅ Seção de testimonials com 3 depoimentos:
  - Maria Clara (Premium · 6 meses) - ★★★★★
  - Ricardo Silva (Essentials · 3 meses) - ★★★★★
  - Ana Luíza (Premium Anual · 1 ano) - ★★★★★
- ✅ Botão CTA: "✨ Começar 7 Dias Grátis"
- ✅ Disclaimer: "Você não será cobrado agora. Após 7 dias..."
- ✅ Trust badges: Seguro, Cancele, Suporte, 4.8/5 estrelas, 1.200+ membros

---

### ⏰ Teste 2: Trial Urgency (Usuário em Trial com < 2 dias)

**Passos:**
1. Abra DevTools (F12)
2. Console → Cole e execute:
   ```javascript
   // Mock trial state temporário
   window.mockTrialState = { isTrialActive: true, trialDaysRemaining: 1 };
   ```
3. Recarregue a página
4. Click em "Abrir Modal"

**O que deve aparecer ADICIONALMENTE:**
- ✅ Banner laranja/vermelho no topo do modal (antes do social proof)
- ✅ Ícone de relógio animado (pulsando)
- ✅ Texto: "⏰ Seu trial termina em 1 dia"
- ✅ Subtexto: "Mantenha seu acesso premium por apenas R$ 14,90/mês"
- ✅ CTA button mudou para: "Manter Acesso Premium" (em vez de "Começar 7 Dias Grátis")
- ✅ Disclaimer mudou para: "Escolha seu plano antes que o trial expire. **Sem cobrança agora**..."

---

### 🎯 Teste 3: Seleção de Planos

**Passos:**
1. Abra o modal
2. Click em cada pricing card (Essentials, Premium, Anual)

**O que deve acontecer:**
- ✅ Card selecionado ganha:
  - Border azul brilhante
  - Glow effect (sombra azul)
  - Checkmark no canto superior direito
  - Texto no rodapé: "Plano Selecionado ✓"
- ✅ Card não selecionado:
  - Border cinza
  - Sem glow
  - Sem checkmark

---

### 📊 Teste 4: Conteúdo dos Pricing Cards

**Verifique cada card:**

#### Essentials (R$ 14,90/mês)
- ✅ Nome: "Essentials"
- ✅ Subtitle: "Comece sua jornada"
- ✅ Preço: R$ 14,90/mês
- ✅ Badge: "7 dias grátis"
- ✅ Features:
  - 100 conversas/dia com ECO
  - Five Rings diário
  - 15 meditações guiadas
  - Diário Estoico (30 dias)
  - Memory Standard
  - Cancele quando quiser

#### Premium (R$ 29,90/mês)
- ✅ Nome: "Premium"
- ✅ Subtitle: "Mais popular"
- ✅ Badge no topo: "Mais Popular" (azul)
- ✅ Preço: R$ 29,90/mês
- ✅ Badge: "7 dias grátis"
- ✅ Features:
  - Conversas ilimitadas com ECO
  - Todas as meditações premium
  - Diário Estoico completo
  - Memory Advanced + AI insights
  - Suporte prioritário
  - Cancele quando quiser

#### Premium Anual (R$ 299/ano)
- ✅ Nome: "Premium Anual"
- ✅ Subtitle: "Melhor custo-benefício"
- ✅ Preço: R$ 24,92/mês (equivalente)
- ✅ Preço total: R$ 299,00 cobrado anualmente
- ✅ Desconto: -16% (R$ 358,80 riscado)
- ✅ Badge: "7 dias grátis"
- ✅ Features:
  - Tudo do Premium Mensal
  - Economia de R$ 59,80/ano
  - R$ 24,92/mês (pagamento anual)
  - Acesso premium por 1 ano
  - Todas as funcionalidades
  - Melhor investimento

---

### 💬 Teste 5: Testimonials Section

**Verifique os 3 depoimentos:**

1. **Maria Clara** (avatar azul "MC")
   - ✅ Badge: Premium · 6 meses
   - ✅ Text: "As meditações me ajudaram a dormir melhor..."
   - ✅ Rating: ★★★★★ (amarelo)
   - ✅ Background: gradient azul

2. **Ricardo Silva** (avatar verde "RS")
   - ✅ Badge: Essentials · 3 meses
   - ✅ Text: "Comecei com Essentials e em 2 meses senti mudanças reais..."
   - ✅ Rating: ★★★★★
   - ✅ Background: gradient verde

3. **Ana Luíza** (avatar roxo "AL")
   - ✅ Badge: Premium Anual · 1 ano
   - ✅ Text: "O plano anual foi a melhor escolha..."
   - ✅ Rating: ★★★★★
   - ✅ Background: gradient roxo

---

### 🎨 Teste 6: Animações e Interações

**Verifique:**
- ✅ Modal aparece com fade in (opacity 0 → 1)
- ✅ Modal escala de 0.95 → 1.0 ao abrir
- ✅ Hover nos pricing cards: scale 1.02
- ✅ Click nos pricing cards: scale 0.98 (tap effect)
- ✅ Trial urgency banner aparece com slide down (y: -10 → 0)
- ✅ Botão CTA tem hover effect (shadow-lg + translate-y)
- ✅ Fechar modal: fade out + scale down

---

### 📈 Teste 7: Social Proof Dinâmico

**Verifique:**
1. Abra o modal
2. Veja o número de signups semanais (ex: "247+ pessoas")
3. Anote o número
4. Recarregue a página na próxima semana
5. ✅ O número deve mudar (range: 180-280)

**Como funciona:**
- Número baseado no número da semana do ano
- Consistente durante a mesma semana
- Muda automaticamente a cada 7 dias
- Fórmula: `180 + ((weekNumber * 37) % 100)`

---

### 🖱️ Teste 8: Fluxo Completo (Simulação)

**Passos:**
1. Abra o modal
2. Leia o social proof
3. Scroll até testimonials
4. Selecione Essentials (R$ 14,90)
5. Leia as features
6. Mude para Premium (R$ 29,90)
7. Compare as features
8. Click no CTA "Começar 7 Dias Grátis"

**O que deve acontecer:**
- ✅ Loading state: Botão mostra spinner + "Processando..."
- ✅ Redirect para Mercado Pago checkout (se backend estiver rodando)
- ✅ OU Erro mostrado em banner vermelho (se backend offline)

---

### 📱 Teste 9: Responsividade

**Teste em diferentes viewports:**

**Desktop (> 1024px):**
- ✅ 3 pricing cards lado a lado
- ✅ Testimonials em grid 3 colunas
- ✅ Trust badges em linha horizontal

**Tablet (768px - 1024px):**
- ✅ 3 pricing cards lado a lado (menor)
- ✅ Testimonials em grid 3 colunas
- ✅ Trust badges em linha

**Mobile (< 768px):**
- ✅ Pricing cards empilhados (1 coluna)
- ✅ Testimonials empilhados (1 coluna)
- ✅ Trust badges empilhados ou wrap

---

### 🔍 Teste 10: Acessibilidade

**Verifique:**
- ✅ Modal tem `role="dialog"`
- ✅ Modal tem `aria-modal="true"`
- ✅ Header tem `id="upgrade-title"` e `aria-labelledby`
- ✅ Botão de fechar tem `aria-label="Fechar"`
- ✅ Todas as cores têm contraste adequado
- ✅ Tab navigation funciona corretamente
- ✅ Escape fecha o modal

---

### 📊 Teste 11: Analytics (DevTools Console)

**Passos:**
1. Abra DevTools → Console
2. Filtre por "Mixpanel"
3. Abra o modal
4. Selecione um plano
5. Click no CTA

**Eventos esperados:**
- ✅ `Premium Screen Viewed` (ao abrir modal)
- ✅ `Premium Card Clicked` (ao selecionar plano)
- ✅ `Checkout Started` (ao clicar CTA)
- ✅ `Upgrade Modal Closed` (ao fechar)

---

## 🐛 Problemas Conhecidos / Expected Behavior

### ❓ "Modal não abre"
- **Causa:** Estado `open` não está sendo setado para `true`
- **Solução:** Verifique se o botão está chamando `setIsOpen(true)`

### ❓ "Trial urgency não aparece"
- **Causa:** Variáveis `isTrialActive` e `trialDaysRemaining` não estão vindo do AuthContext
- **Solução:** Implemente mock ou configure trial real no backend

### ❓ "CTA não redireciona"
- **Causa:** Backend não está rodando ou erro na API
- **Solução:** Verifique console para erro, inicie backend

### ❓ "Número de signups sempre igual"
- **Comportamento esperado:** Número só muda semanalmente (não diariamente)
- **Para testar variação:** Mude a data do sistema

---

## 📸 Screenshots Esperados

### Desktop View
```
┌─────────────────────────────────────────────────────────────┐
│  [X]                    ECOTOPIA Logo                       │
│                                                              │
│       Desbloqueie Todo o Potencial da ECOTOPIA              │
│  Acesso ilimitado a meditações guiadas, programas...        │
│                                                              │
│         ✨ 7 Dias Grátis • Cancele Quando Quiser            │
├─────────────────────────────────────────────────────────────┤
│  ⏰ Seu trial termina em 1 dia                              │ (se trial < 2d)
│  Mantenha seu acesso premium por apenas R$ 14,90/mês        │
├─────────────────────────────────────────────────────────────┤
│  📈 247+ pessoas começaram trial esta semana                │
│  Junte-se a 1.200+ membros transformando suas vidas 🌱      │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Essentials │  │  Premium   │  │   Anual    │            │
│  │ Comece sua │  │Mais Popular│  │Melhor valor│            │
│  │  jornada   │  │            │  │            │            │
│  │ R$ 14,90   │  │ R$ 29,90   │  │ R$ 24,92   │            │
│  │   /mês     │  │   /mês     │  │   /mês     │            │
│  │            │  │            │  │ R$ 299/ano │            │
│  │ [features] │  │ [features] │  │ [features] │            │
│  └────────────┘  └────────────┘  └────────────┘            │
├─────────────────────────────────────────────────────────────┤
│  💬 O que nossos membros dizem                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Maria   │  │ Ricardo  │  │   Ana    │                 │
│  │ [avatar] │  │ [avatar] │  │ [avatar] │                 │
│  │ ★★★★★   │  │ ★★★★★   │  │ ★★★★★   │                 │
│  │[review]  │  │[review]  │  │[review]  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
├─────────────────────────────────────────────────────────────┤
│        [✨ Começar 7 Dias Grátis]                           │
│                                                              │
│  Você não será cobrado agora. Após 7 dias...               │
├─────────────────────────────────────────────────────────────┤
│  ✓ Seguro  ✓ Cancele  ✓ Suporte                           │
│  ✓ 4.8/5 ⭐  ✓ 1.200+ membros  ✓ 1 clique                  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Critérios de Sucesso

O modal está funcionando corretamente se:

1. ✅ Todos os elementos visuais aparecem corretamente
2. ✅ Trial urgency aparece quando `trialDaysRemaining <= 2`
3. ✅ Social proof mostra número dinâmico (180-280)
4. ✅ Testimonials renderizam com avatares e ratings
5. ✅ Pricing cards são selecionáveis com feedback visual
6. ✅ CTA muda texto baseado em trial status
7. ✅ Animações são suaves e responsivas
8. ✅ Modal é responsivo em mobile/tablet/desktop
9. ✅ Analytics tracking funciona (console logs)
10. ✅ Acessibilidade está correta (role, aria-labels)

---

## 🎯 Next Steps

Após validar o modal:

1. **A/B Testing:** Implementar testes A/B para validar hipóteses
2. **Voice Limits:** Continuar com Fase 1.4 (limites de voice)
3. **Trial Onboarding:** Implementar checklist de ativação
4. **Analytics Dashboard:** Dashboard para métricas de conversão

---

**Data de Criação:** 2026-02-13
**Versão:** 1.0
**Autor:** Claude Code
