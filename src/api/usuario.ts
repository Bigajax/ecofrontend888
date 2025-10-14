// src/api/usuario.ts
import { getSupabase } from '../lib/supabaseClient';

export async function criarUsuario({
  nome,
  email,
  tipo_plano = 'free',
}: {
  nome: string
  email: string
  tipo_plano?: string
}) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { data, error } = await supabase
    .from('usuario')
    .insert([
      {
        nome,
        email,
        tipo_plano,
      },
    ])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
