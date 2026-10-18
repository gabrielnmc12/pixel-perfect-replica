import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { fmtData, STATUS_LABEL, type Status } from "@/lib/crm";

export type LeadRow = {
  id: string; cliente_nome: string; telefone: string; status: Status; origem: string;
  responsavel_nome: string; loja_nome: string; arquivado: boolean;
  acao_descricao: string | null; acao_prevista: string | null; tem_acao: boolean; criado_em: string;
};

export function StatusBadge({ status }: { status: Status }) {
  const v = status === "GANHO" ? "default" : status === "PERDIDO" ? "destructive" : "secondary";
  return <Badge variant={v}>{STATUS_LABEL[status]}</Badge>;
}

export function LeadTable({ rows, mostrarLoja }: { rows: LeadRow[]; mostrarLoja?: boolean }) {
  if (!rows.length) return <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Nenhum lead aqui.</p>;
  const agora = Date.now();
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr><th className="p-3">Cliente</th><th className="p-3">Status</th><th className="p-3">Origem</th>
            <th className="p-3">Responsável</th>{mostrarLoja && <th className="p-3">Loja</th>}<th className="p-3">Próxima ação</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const atrasado = r.acao_prevista && new Date(r.acao_prevista).getTime() < agora;
            return (
              <tr key={r.id} className="border-t hover:bg-muted/50">
                <td className="p-3"><Link to="/leads/$id" params={{ id: r.id }} className="font-semibold text-primary hover:underline">{r.cliente_nome}</Link>
                  <div className="text-xs text-muted-foreground">{r.telefone}</div></td>
                <td className="p-3"><StatusBadge status={r.status} />{r.arquivado && <Badge variant="outline" className="ml-1">Arquivado</Badge>}</td>
                <td className="p-3">{r.origem}</td>
                <td className="p-3">{r.responsavel_nome}</td>
                {mostrarLoja && <td className="p-3">{r.loja_nome}</td>}
                <td className="p-3">{r.tem_acao ? <><div>{r.acao_descricao}</div>
                  <div className={atrasado ? "text-xs font-semibold text-destructive" : "text-xs text-muted-foreground"}>{r.acao_prevista ? fmtData(r.acao_prevista) : "Sem data"}</div></>
                  : <span className="text-muted-foreground">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
