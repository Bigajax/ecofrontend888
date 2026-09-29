/**
 * Lista de emails VIP com acesso completo ilimitado
 *
 * Usuários VIP têm:
 * - Acesso completo sem limites de guest mode
 * - Todos os recursos desbloqueados
 * - Sem gates de conversão
 * - Experiência premium sem necessidade de assinatura
 */
export const VIP_EMAILS = [
  'acessoriaintuitivo@gmail.com',
  'eriveltonery@hotmail.com',
  'marcelorazeira@gmail.com',
  'mernomarcelo@gmail.com',
  'rafaelrazeira@hotmail.com',
];

/**
 * Verifica se um email está na lista VIP
 * @param email - Email do usuário (case-insensitive)
 * @returns true se o email está na lista VIP
 */
export function isVipUser(email: string | null | undefined): boolean {
  if (!email) return false;

  // Só em desenvolvimento (npm run dev): qualquer conta logada tem acesso
  // completo, para ver o trabalho sem esbarrar no pagamento. Para testar o
  // bloqueio: localStorage.setItem('eco.dev.plano', 'free'). Em produção,
  // import.meta.env.DEV é false e isto não existe.
  if (import.meta.env.DEV && !import.meta.env.VITEST) {
    try {
      if (localStorage.getItem('eco.dev.plano') !== 'free') return true;
    } catch {
      return true;
    }
  }

  const normalizedEmail = email.toLowerCase().trim();
  return VIP_EMAILS.some(vipEmail => vipEmail.toLowerCase() === normalizedEmail);
}
