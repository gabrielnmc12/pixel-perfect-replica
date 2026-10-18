import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ateliê CRM — Atendimento das lojas de móveis" },
      { name: "description", content: "Clientes, oportunidades, agenda de retornos e resultados das quatro lojas em um só lugar." },
      { property: "og:title", content: "Ateliê CRM" },
      { property: "og:description", content: "Atendimento comercial organizado para quatro lojas de móveis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Rede de móveis · 4 lojas</p>
      <h1 className="max-w-2xl text-5xl font-semibold text-primary md:text-6xl">Cada cliente atendido no momento certo.</h1>
      <p className="max-w-lg text-muted-foreground">Oportunidades, retornos e vendas organizados para vendedores, gerentes e direção.</p>
      <Button asChild size="lg"><Link to="/auth">Entrar no sistema</Link></Button>
    </main>
  );
}
