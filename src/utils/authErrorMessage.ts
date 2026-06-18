/**
 * Traduz erros de autenticação (Supabase/GIS/rede) para mensagens em PT-BR
 * amigáveis ao usuário. O Supabase devolve `message` em inglês ("User already
 * registered", "Password should be at least 6 characters", "email rate limit
 * exceeded"…) e mostrá-las cruas no funil de cadastro confunde o lead pago.
 *
 * Mantém o texto cru para telemetria à parte — aqui só produz o que aparece na
 * tela. `context` muda apenas o fallback genérico (entrar vs. criar conta).
 */
/** Junta os campos de mensagem que o Supabase/GIS espalham, em minúsculas. */
function rawAuthError(err: unknown): string {
  const e = err as
    | { code?: string; message?: string; error?: { message?: string }; error_description?: string; data?: { message?: string } }
    | null
    | undefined;
  return [e?.code, e?.error?.message, e?.error_description, e?.data?.message, e?.message]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();
}

const ALREADY_REGISTERED_RE =
  /already\s*registered|user.*already.*exist|email.*already.*(in[-_\s]*use|registered|exist)|user_already_exists/;

/** True quando o erro de cadastro é "e-mail já tem conta" (qualquer provider). */
export function isAlreadyRegisteredError(err: unknown): boolean {
  return ALREADY_REGISTERED_RE.test(rawAuthError(err));
}

export function translateAuthError(err: unknown, context: 'login' | 'signup' = 'login'): string {
  const raw = rawAuthError(err);

  // Cadastro: e-mail já tem conta — vem antes do bloco de credenciais.
  if (ALREADY_REGISTERED_RE.test(raw))
    return 'Este e-mail já tem uma conta. Tente entrar.';

  if (
    /invalid\s*login\s*credentials/.test(raw) ||
    /invalid[-_\s]*credential/.test(raw) ||
    /invalid[-_\s]*credentials/.test(raw) ||
    /wrong[-_\s]*password/.test(raw) ||
    /invalid\s*password/.test(raw)
  )
    return 'E-mail ou senha incorretos.';

  if (/invalid[-_\s]*email|unable.*validate.*email|email.*invalid/.test(raw)) return 'E-mail inválido.';
  if (/user.*not.*found|no\s*user/.test(raw)) return 'Não encontramos uma conta com este e-mail.';
  if (/too.*many.*request|rate.*limit|over_email_send/.test(raw))
    return 'Muitas tentativas. Tente novamente em alguns minutos.';
  if (/network|failed\s*to\s*fetch|timeout|net::/.test(raw))
    return 'Falha de rede. Verifique sua conexão e tente novamente.';
  if (/user.*disabled|account.*disabled/.test(raw)) return 'Esta conta foi desativada.';
  if (/weak[-_\s]*password|least.*[68]|minimum.*[68]|password.*(short|weak)/.test(raw))
    return 'A senha precisa ter ao menos 8 caracteres.';

  return context === 'signup'
    ? 'Não foi possível criar a conta. Tente novamente.'
    : 'Não foi possível entrar. Tente novamente.';
}
