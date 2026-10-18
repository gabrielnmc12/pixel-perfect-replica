import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loginParaEmail } from "@/lib/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Ateliê CRM" }, { name: "description", content: "Acesso ao sistema comercial." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null); setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginParaEmail(login), password: senha });
    if (!error) {
      const { error: e2 } = await supabase.rpc("me");
      if (e2) { await supabase.auth.signOut(); setErro("Usuário inativo ou sem acesso."); setCarregando(false); return; }
      navigate({ to: "/painel", replace: true });
      return;
    }
    setErro("Usuário ou senha inválidos.");
    setCarregando(false);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-8 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Ateliê CRM</p>
          <h1 className="mt-2 text-3xl font-semibold text-primary">Entrar</h1>
        </div>
        <div className="space-y-2"><Label htmlFor="login">Usuário</Label>
          <Input id="login" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="senha">Senha</Label>
          <Input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <Button type="submit" className="w-full" disabled={carregando}>{carregando ? "Entrando..." : "Entrar"}</Button>
      </form>
    </main>
  );
}
