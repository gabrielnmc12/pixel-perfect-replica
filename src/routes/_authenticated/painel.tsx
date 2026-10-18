import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rpc, STATUS_LABEL, type Status } from "@/lib/crm";
import { formatarCentavos } from "@/lib/crm-rules";
import { useMe } from "@/lib/use-me";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel — Ateliê CRM" }] }),
  component: Painel,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const sel = "h-9 rounded-md border bg-card px-3 text-sm";

function Kpi({ label, valor, destaque }: { label: string; valor: string | number; destaque?: boolean }) {
  return <div className={`rounded-lg border p-4 ${destaque ? "bg-primary text-primary-foreground" : "bg-card"}`}>
    <p className={`text-xs uppercase tracking-wide ${destaque ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
    <p className="mt-1 font-display text-3xl">{valor}</p></div>;
}

function Grafico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <div className="rounded-lg border bg-card p-4"><h2 className="mb-3 text-base font-semibold">{titulo}</h2><div className="h-64">{children}</div></div>;
}

function Barras({ data, x, y }: { data: Any[]; x: string; y: string }) {
  if (!data?.length) return <p className="text-sm text-muted-foreground">Sem dados no período.</p>;
  return <ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey={x} fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey={y} fill="var(--chart-1)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>;
}

function Painel() {
  const me = useMe();
  const inicioMes = hojeSP().slice(0, 8) + "01";
  const [ini, setIni] = useState(inicioMes);
  const [fim, setFim] = useState(hojeSP());
  const [loja, setLoja] = useState("");
  const [vend, setVend] = useState("");
  const amplo = ["SUPERVISOR", "DIRETOR", "MARKETING"].includes(me.perfil);
  const lojas = useQuery({ queryKey: ["lojas"], queryFn: () => rpc<{ id: number; nome: string }[]>("listar_lojas"), enabled: amplo });
  const equipe = useQuery({ queryKey: ["equipe", loja], queryFn: () => rpc<{ id: string; nome: string }[]>("listar_equipe", { _loja: loja ? Number(loja) : null }), enabled: !["VENDEDOR", "MARKETING"].includes(me.perfil) });
  const { data: p, isLoading } = useQuery({
    queryKey: ["painel", ini, fim, loja, vend],
    queryFn: () => rpc<Any>("painel", { _inicio: ini, _fim: fim, _loja: loja ? Number(loja) : null, _vendedor: vend || null }),
  });
  const escopo = me.perfil === "VENDEDOR" ? "Seus resultados" : me.perfil === "GERENTE" ? me.loja_nome : me.perfil === "SUPERVISOR" ? "Quatro lojas" : "Rede consolidada";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm text-accent">{escopo}</p><h1 className="text-3xl font-semibold text-primary">{me.perfil === "MARKETING" ? "Origem dos leads" : "Painel comercial"}</h1></div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Input type="date" className="w-40" value={ini} onChange={(e) => setIni(e.target.value)} /> até
          <Input type="date" className="w-40" value={fim} onChange={(e) => setFim(e.target.value)} />
          {amplo && <select className={sel} value={loja} onChange={(e) => { setLoja(e.target.value); setVend(""); }}><option value="">Todas as lojas</option>{lojas.data?.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select>}
          {equipe.data && <select className={sel} value={vend} onChange={(e) => setVend(e.target.value)}><option value="">Toda a equipe</option>{equipe.data.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>}
        </div>
      </div>

      {p?.filas && <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/agenda"><Kpi label="Retornos de hoje" valor={p.filas.hoje} destaque /></Link>
        <Link to="/agenda"><Kpi label="Atrasados" valor={p.filas.atrasados} /></Link>
        <Link to="/agenda"><Kpi label="Sem data definida" valor={p.filas.sem_acao} /></Link>
      </div>}

      {isLoading || !p ? <p className="text-muted-foreground">Carregando…</p> : me.perfil === "MARKETING" ? (
        <>
          <Kpi label="Leads criados no período" valor={p.total} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Grafico titulo="Leads por origem"><Barras data={p.por_origem} x="origem" y="total" /></Grafico>
            <Grafico titulo="Origem por loja"><Barras data={p.origem_por_loja.map((r: Any) => ({ ...r, rotulo: `${r.loja} · ${r.origem}` }))} x="rotulo" y="total" /></Grafico>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Oportunidades" valor={p.total} />
            <Kpi label="Ganhas" valor={p.ganhos} />
            <Kpi label="Perdidas" valor={p.perdidos} />
            <Kpi label="Em andamento" valor={p.andamento} />
            <Kpi label="Conversão" valor={p.total ? `${((p.ganhos / p.total) * 100).toFixed(1)}%` : "Sem base"} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Kpi label="Vendas no período" valor={p.vendas.quantidade} />
            <Kpi label="Valor vendido" valor={formatarCentavos(Number(p.vendas.valor_centavos))} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Grafico titulo="Situação das oportunidades">
              {p.por_status.length ? <ResponsiveContainer><PieChart><Pie data={p.por_status.map((s: Any) => ({ name: STATUS_LABEL[s.status as Status], value: s.total }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                {p.por_status.map((_: Any, i: number) => <Cell key={i} fill={CORES[i % CORES.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="text-sm text-muted-foreground">Sem dados no período.</p>}
            </Grafico>
            <Grafico titulo="Leads por origem"><Barras data={p.por_origem} x="origem" y="total" /></Grafico>
            <Grafico titulo="Motivos de perda"><Barras data={p.perdas_motivo} x="motivo" y="total" /></Grafico>
            <Grafico titulo="Produtos mais procurados"><Barras data={p.produtos} x="categoria" y="total" /></Grafico>
            {me.perfil !== "VENDEDOR" && me.perfil !== "GERENTE" && <Grafico titulo="Resultados por loja"><Barras data={p.por_loja} x="loja" y="total" /></Grafico>}
            {me.perfil !== "VENDEDOR" && <Grafico titulo="Oportunidades por vendedor"><Barras data={p.por_vendedor} x="nome" y="total" /></Grafico>}
          </div>
        </>
      )}
    </div>
  );
}
