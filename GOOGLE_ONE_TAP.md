# Google One Tap - Guia de Configuração

## O que é Google One Tap?

Google One Tap é uma funcionalidade que permite login rápido e sem fricção para usuários que já estão autenticados com suas contas Google no navegador. Quando ativado, exibe automaticamente um prompt elegante como "Continuar como [nome do usuário]" na página de login.

![Exemplo do Google One Tap](https://developers.google.com/identity/gsi/web/images/one-tap-ux-light.png)

## Benefícios

- **Experiência sem fricção**: Login com um único clique
- **Maior taxa de conversão**: Reduz barreiras de entrada para novos usuários
- **Segurança**: Usa OAuth 2.0 do Google com tokens JWT
- **Cross-device**: Funciona em desktop e mobile

## Configuração

### 1. Obter Google OAuth Client ID

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá para **APIs & Services** > **Credentials**
4. Clique em **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure:
   - **Application type**: Web application
   - **Name**: Ecotopia Web
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (desenvolvimento)
     - `https://seu-dominio.com` (produção)
   - **Authorized redirect URIs**: (deixe vazio para One Tap)
6. Copie o **Client ID** gerado

### 2. Configurar Supabase

Para que o login com Google funcione via Supabase:

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá para **Authentication** > **Providers**
3. Encontre **Google** e habilite
4. Cole o **Client ID** e **Client Secret** do Google
5. Configure as **Redirect URLs** permitidas
6. Salve as configurações

### 3. Configurar Variáveis de Ambiente

Adicione no seu arquivo `.env`:

```bash
# Google OAuth Client ID for One Tap Sign-In
VITE_GOOGLE_CLIENT_ID=seu-client-id-aqui.apps.googleusercontent.com
```

**Importante**: Adicione também no Vercel (ou seu provedor de deploy):
1. Vá para as configurações do projeto
2. Adicione a variável `VITE_GOOGLE_CLIENT_ID` em **Environment Variables**
3. Faça redeploy para aplicar

### 4. Testar Localmente

```bash
# Certifique-se que o .env está configurado
npm run dev

# Abra http://localhost:5173
# Faça logout se estiver logado
# Navegue para a página de login
# O prompt do Google One Tap deve aparecer automaticamente
```

## Como Funciona

### Arquitetura

```
LoginPage → useGoogleOneTap → Google Identity Services
                ↓
        signInWithGoogleIdToken
                ↓
        Supabase Auth (signInWithIdToken)
                ↓
        AuthContext atualiza user/session
                ↓
        Redirect para /app
```

### Fluxo do Usuário

1. Usuário visita a página de login
2. Se estiver logado no Google, vê o prompt One Tap automaticamente
3. Clica em "Continuar como [nome]"
4. Google gera um ID token JWT
5. Frontend envia o token para Supabase
6. Supabase valida e cria a sessão
7. Usuário é redirecionado para /app

### Casos de Uso

**Quando o prompt NÃO aparece:**
- Usuário não está logado no Google
- Usuário já está autenticado na Ecotopia
- Usuário fechou o prompt anteriormente (cooldown de 2h)
- Client ID não configurado ou inválido

**Quando o prompt aparece:**
- Usuário logado no Google
- Não está autenticado na Ecotopia
- Primeira visita ou cooldown expirado

## Arquivos Modificados/Criados

### Novos Arquivos

1. **`src/hooks/useGoogleOneTap.ts`**
   - Hook principal que integra com Google Identity Services
   - Gerencia lifecycle do prompt
   - Callbacks de sucesso/erro

### Arquivos Modificados

1. **`index.html`**
   - Adicionado script do Google Identity Services
   ```html
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   ```

2. **`src/contexts/AuthContext.tsx`**
   - Novo método: `signInWithGoogleIdToken(idToken: string)`
   - Integração com Supabase `signInWithIdToken`

3. **`src/pages/LoginPage.tsx`**
   - Integração do hook `useGoogleOneTap`
   - Tracking de analytics (Mixpanel)

4. **`.env.example`**
   - Documentação da variável `VITE_GOOGLE_CLIENT_ID`

## Personalização

### Desabilitar One Tap

Se quiser desabilitar temporariamente sem remover o código:

```tsx
// Em LoginPage.tsx, altere enabled para false
useGoogleOneTap({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  enabled: false, // Desabilitado
  // ...
});
```

### Auto-Select

Para selecionar automaticamente se houver apenas uma conta Google:

```tsx
useGoogleOneTap({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  autoSelect: true, // Ativa auto-select
  // ...
});
```

### Contexto do Prompt

Personalize a mensagem do prompt:

```tsx
// Em useGoogleOneTap.ts, linha 107
window.google.accounts.id.initialize({
  client_id: clientId,
  callback: ...,
  context: 'signin', // Opções: 'signin', 'signup', 'use'
  // ...
});
```

## Troubleshooting

### O prompt não aparece

**Verifique:**
1. ✅ `VITE_GOOGLE_CLIENT_ID` está configurado no `.env`
2. ✅ Script do Google carregou (verifique console do navegador)
3. ✅ Usuário está logado no Google (abra gmail.com em outra aba)
4. ✅ Origem está autorizada no Google Cloud Console
5. ✅ Usuário não está autenticado na Ecotopia
6. ✅ Console do navegador para mensagens de debug

**Logs úteis:**
```javascript
// Console do navegador
[GoogleOneTap] Prompt não exibido: opt_out_or_no_session
[GoogleOneTap] Prompt exibido com sucesso
```

### Erro de CORS

Certifique-se que a origem está autorizada:
- `http://localhost:5173` para dev
- `https://ecotopia.com.br` para produção

### Token inválido

Se Supabase rejeitar o token:
1. Verifique se o Client ID no Google Cloud e no Supabase são os mesmos
2. Confirme que o Google Provider está habilitado no Supabase
3. Veja os logs do Supabase Auth

## Analytics

O Google One Tap está integrado com Mixpanel:

**Eventos rastreados:**
- `Front-end: Login Iniciado` (method: 'google_one_tap')
- `Front-end: Login Concluído` (method: 'google_one_tap')
- `Front-end: Login Falhou` (method: 'google_one_tap', reason: ...)

## Recursos

- [Google Identity Services - One Tap](https://developers.google.com/identity/gsi/web/guides/overview)
- [Supabase Auth - Sign in with ID Token](https://supabase.com/docs/reference/javascript/auth-signinwithidtoken)
- [Google Cloud Console](https://console.cloud.google.com/)

## Segurança

- ✅ Tokens JWT validados pelo Supabase
- ✅ HTTPS obrigatório em produção
- ✅ Client ID público (não é segredo)
- ✅ Sem armazenamento de credenciais no cliente
- ✅ OAuth 2.0 padrão da indústria

---

**Última atualização**: Dezembro 2025
**Versão**: 1.0
