import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, PERFIL_LABEL, type Perfil } from "@/lib/crm";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, CalendarClock, PlusCircle, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

const OPERA: Perfil[] = ["VENDEDOR", "GERENTE", "SUPERVISOR"];

function Shell() {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function sair() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const opera = me && OPERA.includes(me.perfil);
  const link = "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent";
  const ativo = { className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" };
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-sidebar text-sidebar-foreground md:w-60 md:shrink-0">
        <div className="flex items-center justify-between p-4 md:block">
          <div>
            <p className="font-display text-xl text-sidebar-primary">Ateliê CRM</p>
            {me && <p className="mt-1 text-xs text-sidebar-foreground/70">{me.nome} · {PERFIL_LABEL[me.perfil]}{me.loja_nome ? ` · ${me.loja_nome}` : ""}</p>}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col">
          <Link to="/painel" className={link} activeProps={ativo}><LayoutDashboard className="size-4" />Painel</Link>
          {opera && <>
            <Link to="/agenda" className={link} activeProps={ativo}><CalendarClock className="size-4" />Agenda</Link>
            <Link to="/leads" className={link} activeProps={ativo} activeOptions={{ exact: true }}><Users className="size-4" />Carteira</Link>
            <Link to="/leads/novo" className={link} activeProps={ativo}><PlusCircle className="size-4" />Novo lead</Link>
          </>}
          <button onClick={sair} className={link}><LogOut className="size-4" />Sair</button>
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">{me ? <Outlet /> : <p className="text-muted-foreground">Carregando…</p>}</main>
    </div>
  );
}

export function useMe() {
  return useQuery(meQuery).data!;
}
export { Button };
