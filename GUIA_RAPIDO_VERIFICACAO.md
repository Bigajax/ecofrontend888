# 🚀 GUIA RÁPIDO DE VERIFICAÇÃO - 5 MINUTOS

Siga estes passos na ordem para verificar tudo rapidamente.

---

## ⚡ PASSO 1: Testar Backend (30 segundos)

```bash
# No terminal, dentro da pasta do projeto:
node test-backend-routes.js
```

**O que esperar:**
```
✅ Servidor no ar (/health):           ✅
✅ Rota de status:                     ✅
✅ Rota de criar assinatura:           ✅
✅ Webhook do Mercado Pago:            ✅
```

**Se aparecer ❌:**
- O backend NÃO tem essas rotas implementadas
- Você precisa implementar seguindo `BACKEND_SUBSCRIPTION_TODO.md`

---

## ⚡ PASSO 2: Verificar Supabase (2 minutos)

1. **Abrir Supabase:**
   - https://supabase.com/dashboard
   - Selecionar projeto ECO
   - Clicar em "SQL Editor"

2. **Copiar e executar:**
   - Abrir arquivo: `VERIFICAR_SUPABASE.sql`
   - Copiar TUDO
   - Colar no SQL Editor
   - Clicar em "Run" (Ctrl+Enter)

3. **Ver resultados:**
   - Olhar seção "8. RESUMO FINAL"
   - Deve mostrar:
     ```
     Colunas de assinatura adicionadas | 9 | ✅ COMPLETO
     Tabelas criadas                   | 2 | ✅ COMPLETO
     ```

**Se aparecer ❌ FALTANDO:**
- Executar migração: `MIGRATION_SUBSCRIPTION.sql`

---

## ⚡ PASSO 3: Verificar Mercado Pago (2 minutos)

1. **Acessar:**
   - https://www.mercadopago.com.br/developers/panel/app
   - Fazer login

2. **Ir em Webhooks:**
   - Menu lateral > "Webhooks"

3. **Verificar:**
   - ✅ URL: `https://ecobackend888.onrender.com/api/webhooks/mercadopago`
   - ✅ Eventos: `payment` + `subscription_preapproval`
   - ✅ Status: Ativo

**Se NÃO tiver configurado:**
- Clicar "Configurar URLs"
- Adicionar URL acima
- Selecionar eventos
- Salvar

---

## 📋 CHECKLIST RÁPIDO

```
Backend:
- [ ] Servidor no ar (/health = 200)
- [ ] Rota /status existe (401)
- [ ] Rota /create-preference existe (401)
- [ ] Webhook /mercadopago existe

Supabase:
- [ ] 9 colunas adicionadas em usuarios
- [ ] 2 tabelas criadas (subscription_events, payments)
- [ ] Índices criados

Mercado Pago:
- [ ] Conta criada
- [ ] Aplicação criada
- [ ] Webhook configurado
- [ ] URL correta
- [ ] Eventos corretos
```

---

## 🆘 PROBLEMAS COMUNS

### Problema: Backend retorna 404 em todas as rotas

**Solução:**
```bash
# Testar se backend está no ar:
curl https://ecobackend888.onrender.com/health

# Se não responder:
# 1. Verificar se Render.com está com serviço ativo
# 2. Ver logs no painel do Render
```

### Problema: Supabase falta colunas/tabelas

**Solução:**
1. Abrir `MIGRATION_SUBSCRIPTION.sql`
2. Copiar TUDO
3. Colar no SQL Editor do Supabase
4. Executar
5. Verificar novamente com `VERIFICAR_SUPABASE.sql`

### Problema: Não consigo acessar Mercado Pago

**Solução:**
1. Criar conta em: https://www.mercadopago.com.br
2. Ativar conta como desenvolvedor
3. Criar aplicação nova
4. Configurar webhook

---

## ✅ DEPOIS DE VERIFICAR TUDO

Me avise qual foi o resultado:

1. **Tudo ✅:** Pode testar o fluxo completo
2. **Backend ❌:** Precisa implementar rotas
3. **Supabase ❌:** Precisa rodar migração
4. **Mercado Pago ❌:** Precisa configurar webhook

E eu te ajudo no próximo passo!

---

## 📞 ARQUIVOS CRIADOS PARA VOCÊ

- ✅ `VERIFICACAO_ASSINATURA.md` - Guia completo detalhado
- ✅ `test-backend-routes.js` - Script de teste automático
- ✅ `VERIFICAR_SUPABASE.sql` - Script SQL de verificação
- ✅ `GUIA_RAPIDO_VERIFICACAO.md` - Este arquivo (5 minutos)

---

**Comece por aqui e me diga o que aconteceu!** 🚀
