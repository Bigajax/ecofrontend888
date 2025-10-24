// src/api/mensagem.ts
import { supabase } from "../lib/supabaseClient";

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

type ListarMensagensFiltro = Record<string, string | number | boolean>;

const API_BASE_PATH = "/api/mensagens";

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function buildUrl(path: string = ""): string {
  if (!path) {
    return API_BASE_PATH;
  }

  if (path.startsWith("/")) {
    return `${API_BASE_PATH}${path}`;
  }

  return `${API_BASE_PATH}/${path}`;
}

async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(init.headers ?? {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

function ensureMensagem(data: unknown): MensagemRow {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta inválida ao processar a mensagem.");
  }

  const mensagem = data as MensagemRow;

  if (!mensagem.id) {
    throw new Error("Mensagem retornada sem identificador.");
  }

  return mensagem;
}

export async function salvarMensagem(
  payload: NovaMensagemPayload,
): Promise<MensagemRow> {
  const response = await authenticatedFetch(buildUrl("/registrar"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Erro ao salvar mensagem: ${error || `${response.status} ${response.statusText}`}`,
    );
  }

  const data = await response.json();
  return ensureMensagem(data);
}

export async function listarMensagens(
  select: string = "*",
  filtros: ListarMensagensFiltro = {},
): Promise<MensagemRow[]> {
  const params = new URLSearchParams();

  if (select) {
    params.set("select", select);
  }

  Object.entries(filtros).forEach(([coluna, valor]) => {
    params.append(coluna, String(valor));
  });

  const queryString = params.toString();
  const url = queryString ? `${buildUrl()}?${queryString}` : buildUrl();

  const response = await authenticatedFetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Erro ao listar mensagens: ${error || `${response.status} ${response.statusText}`}`,
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Resposta inválida ao listar mensagens.");
  }

  return data as MensagemRow[];
}

export async function atualizarMensagem(
  id: string,
  updates: Partial<Omit<MensagemRow, "id" | "usuario_id">>,
): Promise<MensagemRow> {
  const response = await authenticatedFetch(buildUrl(`/${id}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Erro ao atualizar mensagem ${id}: ${error || `${response.status} ${response.statusText}`}`,
    );
  }

  const data = await response.json();
  return ensureMensagem(data);
}

export async function apagarMensagem(id: string): Promise<void> {
  const response = await authenticatedFetch(buildUrl(`/${id}`), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Erro ao apagar mensagem ${id}: ${error || `${response.status} ${response.statusText}`}`,
    );
  }
}
