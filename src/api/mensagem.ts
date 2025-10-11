// src/api/mensagem.ts
import { supabase } from "../lib/supabaseClient";

export type MensagemRow = {
  id: string;
  conteudo: string;
  usuario_id: string;
  sentimento?: string | null;
  salvar_memoria?: boolean | null;
  created_at?: string;
  updated_at?: string | null;
};

export type NovaMensagemPayload = Partial<Omit<MensagemRow, "id">> & {
  conteudo: string;
  usuario_id: string;
};

export async function salvarMensagem(
  payload: NovaMensagemPayload,
): Promise<MensagemRow> {
  const { data, error } = await supabase
    .from("mensagens")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Nenhuma mensagem retornada pelo Supabase.");
  }

  return data as MensagemRow;
}
