// Decodifica o e-mail do payload de um id_token (JWT) do Google, sem validar a
// assinatura — só precisamos do e-mail para salvar o lead ANTES de chamar
// signInWithGoogleIdToken. O Supabase valida o token de verdade no login.
// Retorna o e-mail normalizado (trim + lowercase) ou null se ausente/malformado.
export function emailFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return null;
    // base64url → base64 + padding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = JSON.parse(atob(padded)) as { email?: unknown };
    const email = typeof json.email === 'string' ? json.email.trim().toLowerCase() : '';
    return email || null;
  } catch {
    return null;
  }
}
