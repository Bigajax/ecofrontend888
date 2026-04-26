import { supabase } from "../lib/supabaseClient";
import { buildIdentityHeaders } from "../lib/guestId";
import { apiUrl } from "../config/apiBase";

export interface DreamRow {
  id: string;
  usuario_id: string;
  is_guest: boolean;
  dream_text: string;
  interpretation: string | null;
  tags: string[];
  created_at: string;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const identity = buildIdentityHeaders();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    return { ...identity, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }
  return { ...identity, "Content-Type": "application/json" };
}

export async function interpretarSonho(
  dreamText: string,
  signal?: AbortSignal,
): Promise<Response> {
  const headers = await buildAuthHeaders();
  return fetch(apiUrl("/api/dream/interpret"), {
    method: "POST",
    headers: { ...headers, Accept: "text/event-stream" },
    body: JSON.stringify({ dream_text: dreamText }),
    signal,
  });
}

export async function buscarHistoricoSonhos(): Promise<DreamRow[]> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) return [];

  const res = await fetch(apiUrl("/api/dream/history"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = await res.json() as { dreams?: DreamRow[] };
  return json.dreams ?? [];
}
