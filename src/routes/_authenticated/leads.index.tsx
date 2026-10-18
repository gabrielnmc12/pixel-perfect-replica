import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { rpc, STATUS_LABEL } from "@/lib/crm";
import { useMe } from "@/lib/use-me";
import { LeadTable, type LeadRow } from "@/components/LeadTable";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({ meta: [{ title: "Carteira de leads — Ateliê CRM" }] }),
  component: Carteira,
});

const sel = "h-9 rounded-md border bg-card px-3 text-sm";

function Carteira() {
  const me = useMe();
  const [status, setStatus] = useState("");
  const [resp, setResp] = useState("");
  const [arq, setArq] = useState(false);
  const gestor = me.perfil !== "VENDEDOR";
  const equipe = useQuery({ queryKey: ["equipe"], queryFn: () => rpc<{ id: string; nome: string; loja_nome: string }[]>("listar_equipe"), enabled: gestor });
  const { data, isLoading, error } = useQuery({
    queryKey: ["leads", status, resp, arq],
    queryFn: () => rpc<LeadRow[]>("listar_leads", { _status: status || null, _responsavel: resp || null, _arquivados: arq }),
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-primary">Carteira</h1>
      <div className="flex flex-wrap gap-3">
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {gestor && <select className={sel} value={resp} onChange={(e) => setResp(e.target.value)}>
          <option value="">Todos os responsáveis</option>
          {equipe.data?.map((u) => <option key={u.id} value={u.id}>{u.nome}{me.perfil === "SUPERVISOR" ? ` (${u.loja_nome})` : ""}</option>)}
        </select>}
        {gestor && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={arq} onChange={(e) => setArq(e.target.checked)} />Ver arquivados</label>}
      </div>
      {error ? <p className="text-destructive">{(error as Error).message}</p> : isLoading ? <p className="text-muted-foreground">Carregando…</p>
        : <LeadTable rows={data ?? []} mostrarLoja={me.perfil === "SUPERVISOR"} />}
    </div>
  );
}
