import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CATEGORIAS, ORIGENS, PORTES, fmtData, localParaIso, rpc } from "@/lib/crm";
import { addDiasUteis, normalizarTelefone } from "@/lib/crm-rules";
import { useMe } from "@/lib/use-me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/leads/novo")({
  head: () => ({ meta: [{ title: "Novo lead — Ateliê CRM" }] }),
  component: NovoLead,
});

const sel = "h-9 w-full rounded-md border bg-card px-3 text-sm";
type Prod = { categoria: string; porte: string; observacao: string };

function NovoLead() {
  const me = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const requestId = useMemo(() => crypto.randomUUID(), []);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [insta, setInsta] = useState("");
  const [origem, setOrigem] = useState(ORIGENS[0]);
  const [loja, setLoja] = useState("");
  const [prods, setProds] = useState<Prod[]>([{ categoria: CATEGORIAS[0], porte: "Médio", observacao: "" }]);
  const [acaoModo, setAcaoModo] = useState<"padrao" | "explicita">("padrao");
  const [acaoDesc, setAcaoDesc] = useState("");
  const [acaoData, setAcaoData] = useState("");
  const [existente, setExistente] = useState<{ nome: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const lojas = useQuery({ queryKey: ["lojas"], queryFn: () => rpc<{ id: number; nome: string }[]>("listar_lojas"), enabled: me.perfil === "SUPERVISOR" });

  if (!["VENDEDOR", "GERENTE", "SUPERVISOR"].includes(me.perfil)) return <p>Acesso não permitido.</p>;

  async function verificarTelefone() {
    if (normalizarTelefone(tel).length < 10) return setExistente(null);
    const r = await rpc<{ nome: string } | null>("consultar_cliente", { _telefone: tel }).catch(() => null);
    setExistente(r);
    if (r) setNome(r.nome);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const id = await rpc<string>("criar_lead", {
        p: {
          request_id: requestId, nome, telefone: tel, instagram: insta, origem, produtos: prods,
          loja_id: me.perfil === "SUPERVISOR" ? Number(loja) : undefined,
          acao: acaoModo === "explicita" ? { descricao: acaoDesc, prevista_para: localParaIso(acaoData) } : undefined,
        },
      });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead cadastrado");
      navigate({ to: "/leads/$id", params: { id } });
    } catch (err) {
      toast.error((err as Error).message);
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold text-primary">Novo lead</h1>
      <section className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2">
        <div className="space-y-2"><Label>Telefone *</Label><Input value={tel} onChange={(e) => setTel(e.target.value)} onBlur={verificarTelefone} placeholder="(11) 98765-4321" required /></div>
        <div className="space-y-2"><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} required disabled={!!existente} /></div>
        {existente && <p className="sm:col-span-2 rounded-md bg-secondary p-3 text-sm">Cliente já cadastrado: <b>{existente.nome}</b>. Uma nova oportunidade será criada sem alterar os dados dele.</p>}
        {!existente && <div className="space-y-2"><Label>Instagram</Label><Input value={insta} onChange={(e) => setInsta(e.target.value)} placeholder="@cliente" /></div>}
        <div className="space-y-2"><Label>Origem *</Label><select className={sel} value={origem} onChange={(e) => setOrigem(e.target.value)}>{ORIGENS.map((o) => <option key={o}>{o}</option>)}</select></div>
        {me.perfil === "SUPERVISOR" && <div className="space-y-2"><Label>Loja *</Label>
          <select className={sel} value={loja} onChange={(e) => setLoja(e.target.value)} required><option value="">Selecione</option>{lojas.data?.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select>
          <p className="text-xs text-muted-foreground">O lead fica com o gerente da loja.</p></div>}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Produtos de interesse</h2>
        {prods.map((p, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_8rem_1fr_auto]">
            <select className={sel} value={p.categoria} onChange={(e) => setProds(prods.map((x, j) => j === i ? { ...x, categoria: e.target.value } : x))}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select>
            <select className={sel} value={p.porte} onChange={(e) => setProds(prods.map((x, j) => j === i ? { ...x, porte: e.target.value } : x))}>{PORTES.map((c) => <option key={c}>{c}</option>)}</select>
            <Input placeholder="Observação" value={p.observacao} onChange={(e) => setProds(prods.map((x, j) => j === i ? { ...x, observacao: e.target.value } : x))} />
            <Button type="button" variant="ghost" disabled={prods.length === 1} onClick={() => setProds(prods.filter((_, j) => j !== i))}>Remover</Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setProds([...prods, { categoria: CATEGORIAS[0], porte: "Médio", observacao: "" }])}>+ Produto</Button>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Próxima ação</h2>
        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={acaoModo === "padrao"} onChange={() => setAcaoModo("padrao")} />
          Padrão: “Retomar contato com o cliente” em {fmtData(addDiasUteis(new Date()).toISOString())}</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={acaoModo === "explicita"} onChange={() => setAcaoModo("explicita")} />Definir agora</label>
        {acaoModo === "explicita" && <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Descrição" value={acaoDesc} onChange={(e) => setAcaoDesc(e.target.value)} required />
          <Input type="datetime-local" value={acaoData} onChange={(e) => setAcaoData(e.target.value)} />
          <p className="text-xs text-muted-foreground sm:col-span-2">Sem data, o lead fica na fila “Sem data definida”.</p></div>}
      </section>
      <Button type="submit" size="lg" disabled={salvando}>{salvando ? "Salvando…" : "Cadastrar lead"}</Button>
    </form>
  );
}
