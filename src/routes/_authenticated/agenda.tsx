import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/lib/crm";
import { useMe } from "@/lib/use-me";
import { LeadTable, type LeadRow } from "@/components/LeadTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda de retornos — Ateliê CRM" }] }),
  component: Agenda,
});

function Fila({ fila }: { fila: string }) {
  const me = useMe();
  const { data, isLoading, error } = useQuery({ queryKey: ["leads", "fila", fila], queryFn: () => rpc<LeadRow[]>("listar_leads", { _fila: fila }) });
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;
  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  return <LeadTable rows={data ?? []} mostrarLoja={me.perfil === "SUPERVISOR"} />;
}

function Agenda() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-primary">Agenda de retornos</h1>
      <Tabs defaultValue="hoje">
        <TabsList><TabsTrigger value="hoje">Hoje</TabsTrigger><TabsTrigger value="atrasados">Atrasados</TabsTrigger><TabsTrigger value="sem_acao">Sem data definida</TabsTrigger></TabsList>
        {["hoje", "atrasados", "sem_acao"].map((f) => <TabsContent key={f} value={f} className="mt-4"><Fila fila={f} /></TabsContent>)}
      </Tabs>
    </div>
  );
}
