import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

/**
 * Garante que exista um registro correspondente ao usuário autenticado
 * na tabela `usuarios`, evitando acessos a perfis de terceiros.
 */
export async function ensureProfile(user: User | null | undefined) {
  if (!user?.id) return;

  const userId = user.id;

  // Verifica se o perfil já existe (restrito ao próprio usuário pela cláusula eq)
  const { data: existingProfile, error: fetchError } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) {
    // Ignora erro "not found" (PostgREST code PGRST116) e prossegue para criação
    if ((fetchError as any)?.code !== 'PGRST116') {
      throw fetchError;
    }
  }

  if (existingProfile) return;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Sem nome';

  const profilePayload = {
    id: userId,
    email: user.email,
    nome: fullName,
    telefone: (user.user_metadata?.phone as string | undefined) ?? null,
    data_criacao: new Date().toISOString(),
    tipo_plano: (user.user_metadata?.plan as string | undefined) ?? 'free',
    ativo: true,
  };

  const { error: insertError } = await supabase.from('usuarios').insert([profilePayload]);

  if (insertError && (insertError as any)?.code !== '23505') {
    // 23505 = unique_violation (perfil já criado por trigger simultânea)
    throw insertError;
  }
}
