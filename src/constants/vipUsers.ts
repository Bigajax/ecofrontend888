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
];

/**
 * Verifica se um email está na lista VIP
 * @param email - Email do usuário (case-insensitive)
 * @returns true se o email está na lista VIP
 */
export function isVipUser(email: string | null | undefined): boolean {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase().trim();
  return VIP_EMAILS.some(vipEmail => vipEmail.toLowerCase() === normalizedEmail);
}
