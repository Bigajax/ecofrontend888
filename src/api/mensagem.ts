// src/api/mensagem.ts
import { supabase } from "../lib/supabaseClient";

const rawSupabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

function getSupabaseRestBaseUrl(): string {
  if (!rawSupabaseUrl) {
    throw new Error("VITE_SUPABASE_URL não configurada.");
  }
  return `${rawSupabaseUrl}/rest/v1`;
}

export type MensagemRow = {
  id: string;
  conteudo: string;
  usuario_id: string;
  data_hora?: string | null;
  sentimento?: string | null;
  salvar_memoria?: boolean | null;
};

export type NovaMensagemPayload = Partial<Omit<MensagemRow, "id">> & {
  conteudo: string;
  usuario_id: string;
};

type SupabaseRestResponse<T> = T[] | T;

function ensureArray<T>(value: SupabaseRestResponse<T>): T[] {
  return Array.isArray(value) ? value : [value];
}

async function supabaseRestRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token ?? null;

  const headers = new Headers(init.headers ?? {});
  if (!supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_ANON_KEY não configurada.");
  }
  headers.set("apikey", supabaseAnonKey);
  headers.set("Authorization", `Bearer ${accessToken ?? supabaseAnonKey}`);

  const response = await fetch(`${getSupabaseRestBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Falha na chamada Supabase REST ${path}: ${response.status} ${response.statusText}${
        errorText ? ` - ${errorText}` : ""
      }`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = (await response.json()) as T;
  return json;
}

export async function salvarMensagem(
  payload: NovaMensagemPayload,
): Promise<MensagemRow> {
  const body = JSON.stringify(payload);

  const data = await supabaseRestRequest<SupabaseRestResponse<MensagemRow>>(
    "/mensagem",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body,
    },
  );

  const [mensagem] = ensureArray(data);
  if (!mensagem) {
    throw new Error("Nenhuma mensagem retornada pelo Supabase.");
  }

  return mensagem;
}

type ListarMensagensFiltro = Record<string, string | number | boolean>;

export async function listarMensagens(
  select: string = "*",
  filtros: ListarMensagensFiltro = {},
): Promise<MensagemRow[]> {
  const params = new URLSearchParams();
  params.set("select", select);

  Object.entries(filtros).forEach(([coluna, valor]) => {
    const valorStr = String(valor);
    const temOperador = /^([a-z]+\.)/i.test(valorStr);
    const prefixo = temOperador ? "" : "eq.";
    params.append(coluna, `${prefixo}${valorStr}`);
  });

  const data = await supabaseRestRequest<MensagemRow[]>(
    `/mensagem?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );

  return Array.isArray(data) ? data : [data];
}

export async function atualizarMensagem(
  id: string,
  updates: Partial<Omit<MensagemRow, "id" | "usuario_id">>,
): Promise<MensagemRow> {
  const body = JSON.stringify(updates);
  const data = await supabaseRestRequest<SupabaseRestResponse<MensagemRow>>(
    `/mensagem?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body,
    },
  );

  const [mensagem] = ensureArray(data);
  if (!mensagem) {
    throw new Error("Nenhuma mensagem retornada na atualização.");
  }

  return mensagem;
}

export async function apagarMensagem(id: string): Promise<void> {
  await supabaseRestRequest<void>(
    `/mensagem?id=eq.${id}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    },
  );
}
