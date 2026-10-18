import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Perfil = "VENDEDOR" | "GERENTE" | "SUPERVISOR" | "DIRETOR" | "MARKETING";
export type Status = "NOVO" | "DISTRIBUIDO" | "NEGOCIACAO" | "GANHO" | "PERDIDO";
export type Me = { id: string; nome: string; login: string; perfil: Perfil; loja_id: number | null; loja_nome: string | null };

export const ORIGENS = ["Instagram", "WhatsApp", "Loja física", "Site", "Indicação", "Decorador"];
export const PORTES = ["Pequeno", "Médio", "Grande"];
export const CANAIS = ["Telefone", "WhatsApp", "Presencial", "Instagram", "Outro"];
export const MOTIVOS_PERDA = ["Preço", "Prazo de entrega", "Desistiu da compra", "Comprou com concorrente", "Sem retorno", "Produto indisponível", "Outro"];
export const CATEGORIAS = ["Sofá", "Mesa de jantar", "Cama", "Guarda-roupa", "Rack", "Poltrona", "Cozinha planejada", "Escritório"];
export const STATUS_LABEL: Record<Status, string> = { NOVO: "Novo", DISTRIBUIDO: "Distribuído", NEGOCIACAO: "Negociação", GANHO: "Ganho", PERDIDO: "Perdido" };
export const RESULTADO_LABEL: Record<string, string> = { FALOU: "Falou", NAO_ATENDEU: "Não atendeu", REMARCOU: "Remarcou" };
export const PERFIL_LABEL: Record<Perfil, string> = { VENDEDOR: "Vendedor", GERENTE: "Gerente", SUPERVISOR: "Supervisor", DIRETOR: "Diretor", MARKETING: "Marketing" };

export const loginParaEmail = (login: string) => `${login.trim().toLowerCase()}@crm.local`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

export const meQuery = queryOptions({ queryKey: ["me"], queryFn: () => rpc<Me>("me"), staleTime: 60_000 });

export const fmtData = (s?: string | null) =>
  s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }) : "—";

/** datetime-local value → ISO (interpreted in browser local time). */
export const localParaIso = (v: string) => (v ? new Date(v).toISOString() : null);
