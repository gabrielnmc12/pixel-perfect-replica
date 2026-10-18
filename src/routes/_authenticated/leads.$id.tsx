import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CANAIS, MOTIVOS_PERDA, RESULTADO_LABEL, STATUS_LABEL, fmtData, localParaIso, rpc, type Status } from "@/lib/crm";
import { formatarCentavos, reaisParaCentavos, totalVendaCentavos } from "@/lib/crm-rules";
import { useMe } from "@/lib/use-me";
import { StatusBadge } from "@/components/LeadTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/leads/$id")({
  head: () => ({ meta: [{ title: "Lead — Ateliê CRM" }] }),
  component: LeadPage,
});

const sel = "h-9 w-full rounded-md border bg-card px-3 text-sm";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function Painel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <section className="space-y-3 rounded-lg border bg-card p-5"><h2 className="text-lg font-semibold">{titulo}</h2>{children}</section>;
}

function LeadPage() {
  const { id } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const { data: d, isLoading, error } = useQuery({ queryKey: ["lead", id], queryFn: () => rpc<Any>("obter_lead", { _id: id }) });
  const [aberto, setAberto] = useState<string | null>(null);
  const exec = useMutation({
    mutationFn: ({ fn, args }: { fn: string; args: Record<string, unknown> }) => rpc(fn, args),
    onSuccess: () => { toast.success("Registrado"); setAberto(null); qc.invalidateQueries({ queryKey: ["lead", id] }); qc.invalidateQueries({ queryKey: ["leads"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const run = (fn: string, args: Record<string, unknown>) => exec.mutate({ fn, args: { _lead: id, ...args } });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (error || !d) return <div className="space-y-3"><p className="text-lg">Lead não encontrado.</p><Link to="/leads" className="text-primary underline">Voltar à carteira</Link></div>;

  const l = d.lead; const pode = d.pode;
  const pend = (d.acoes as Any[]).find((a) => !a.encerrada_em);
  const toggle = (k: string) => setAberto(aberto === k ? null : k);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <header className="space-y-2">
          <Link to="/leads" className="text-sm text-muted-foreground hover:underline">← Carteira</Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-primary">{d.cliente.nome}</h1>
            <StatusBadge status={l.status} />
            {l.arquivado_em && <span className="rounded bg-muted px-2 py-0.5 text-xs">Arquivado</span>}
          </div>
          <p className="text-sm text-muted-foreground">{d.cliente.telefone}{d.cliente.instagram ? ` · ${d.cliente.instagram}` : ""} · Origem: {l.origem} · {d.responsavel_nome} ({d.loja_nome})</p>
          {l.status === "PERDIDO" && <p className="text-sm text-destructive">Perdido: {l.motivo_perda}{l.observacao_perda ? ` — ${l.observacao_perda}` : ""}</p>}
        </header>

        <Painel titulo="Próxima ação">
          {pend ? <div><p className="font-medium">{pend.descricao}</p><p className="text-sm text-muted-foreground">{pend.prevista_para ? fmtData(pend.prevista_para) : "Sem data definida"} · por {pend.autor}</p></div>
            : <p className="text-sm text-muted-foreground">Nenhuma ação pendente.</p>}
          {pode.planejar && <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toggle("acao")}>{pend ? "Substituir" : "Criar ação"}</Button>
            {pend && <Button size="sm" variant="ghost" onClick={() => toggle("cancelar")}>Cancelar ação</Button>}
          </div>}
          {aberto === "acao" && <AcaoForm substituir={!!pend} onSubmit={(a) => run("definir_acao", a)} />}
          {aberto === "cancelar" && <MotivoForm label="Motivo do cancelamento" onSubmit={(m) => run("cancelar_acao", { _motivo: m })} />}
        </Painel>

        {(pode.operar || pode.gerir) && <Painel titulo="Ações">
          <div className="flex flex-wrap gap-2">
            {pode.operar && <>
              <Button size="sm" onClick={() => toggle("interacao")}>Registrar contato</Button>
              <Button size="sm" variant="secondary" onClick={() => toggle("venda")}>Registrar venda</Button>
              <Button size="sm" variant="outline" onClick={() => toggle("perda")}>Registrar perda</Button>
            </>}
            {pode.gerir && l.status !== "GANHO" && l.status !== "PERDIDO" && <Button size="sm" variant="outline" onClick={() => toggle("distribuir")}>Distribuir / transferir</Button>}
            {pode.reabrir && <Button size="sm" variant="outline" onClick={() => run("reabrir_lead", {})}>Reabrir</Button>}
            {pode.gerir && <Button size="sm" variant="ghost" onClick={() => toggle("arquivo")}>{l.arquivado_em ? "Desarquivar" : "Arquivar"}</Button>}
          </div>
          {aberto === "interacao" && <InteracaoForm onSubmit={(a) => run("registrar_interacao", a)} />}
          {aberto === "venda" && <VendaForm onSubmit={(itens) => run("registrar_venda", { _itens: itens })} />}
          {aberto === "perda" && <PerdaForm onSubmit={(a) => run("registrar_perda", a)} />}
          {aberto === "distribuir" && <DistribuirForm perfil={me.perfil} atual={l.responsavel_id} onSubmit={(dest) => run("distribuir_lead", { _destino: dest })} />}
          {aberto === "arquivo" && <ArquivoForm arquivar={!l.arquivado_em} onSubmit={(j) => run("arquivar_lead", { _arquivar: !l.arquivado_em, _justificativa: j })} />}
        </Painel>}

        <Painel titulo="Interações">
          {(d.interacoes as Any[]).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum contato registrado.</p> :
            <ul className="space-y-3">{(d.interacoes as Any[]).map((i) => <li key={i.id} className="border-l-2 border-accent pl-3">
              <p className="text-sm font-medium">{RESULTADO_LABEL[i.resultado]} · {i.canal}{i.resultado === "REMARCOU" && i.acordo_remarcacao_confirmado ? " (acordo confirmado)" : ""}</p>
              <p className="text-sm">{i.resumo}</p><p className="text-xs text-muted-foreground">{fmtData(i.ocorreu_em)} · {i.autor}</p></li>)}</ul>}
        </Painel>

        {d.venda && <Painel titulo={`Venda · ${formatarCentavos(d.venda.valor_total_centavos)}`}>
          <ul className="text-sm">{d.venda.itens.map((it: Any) => <li key={it.id}>{it.quantidade}× {it.descricao} — {formatarCentavos(it.valor_unitario_centavos)}</li>)}</ul>
          <p className="text-xs text-muted-foreground">{fmtData(d.venda.vendida_em)}</p>
        </Painel>}
      </div>

      <aside className="space-y-6">
        <Painel titulo="Produtos de interesse">
          <ul className="space-y-1 text-sm">{(d.produtos as Any[]).map((p) => <li key={p.id}>{p.categoria} · {p.porte}{p.observacao ? ` — ${p.observacao}` : ""}</li>)}</ul>
        </Painel>
        <Painel titulo="Histórico do funil">
          <ul className="space-y-2 text-sm">{(d.transicoes as Any[]).map((t) => <li key={t.id}>
            <b>{t.status_anterior ? `${STATUS_LABEL[t.status_anterior as Status]} → ` : ""}{STATUS_LABEL[t.status_novo as Status]}</b> <span className="text-muted-foreground">({t.origem_fato})</span>
            {t.motivo_perda && <div className="text-xs">Motivo: {t.motivo_perda}{t.observacao_perda ? ` — ${t.observacao_perda}` : ""}</div>}
            <div className="text-xs text-muted-foreground">{fmtData(t.ocorreu_em)} · {t.autor}</div></li>)}</ul>
        </Painel>
        <Painel titulo="Responsáveis">
          <ul className="space-y-2 text-sm">{(d.atribuicoes as Any[]).map((a, i) => <li key={i}>{a.responsavel} ({a.loja})
            <div className="text-xs text-muted-foreground">{fmtData(a.inicio_em)} → {a.fim_em ? fmtData(a.fim_em) : "atual"} · por {a.por}</div></li>)}</ul>
        </Painel>
        <Painel titulo="Ações planejadas">
          <ul className="space-y-2 text-sm">{(d.acoes as Any[]).map((a) => <li key={a.id}>{a.descricao}
            <div className="text-xs text-muted-foreground">{a.prevista_para ? fmtData(a.prevista_para) : "sem data"} · {a.encerramento ? `${a.encerramento.replaceAll("_", " ").toLowerCase()}${a.motivo_encerramento ? ` (${a.motivo_encerramento})` : ""}` : "pendente"}</div></li>)}</ul>
        </Painel>
        {d.arquivamentos && <Painel titulo="Histórico de arquivamento">
          {(d.arquivamentos as Any[]).length === 0 ? <p className="text-sm text-muted-foreground">Nunca arquivado.</p> :
            <ul className="space-y-2 text-sm">{(d.arquivamentos as Any[]).map((o) => <li key={o.id}>v{o.versao} · {o.operacao === "ARQUIVAR" ? "Arquivado" : "Desarquivado"} por {o.autor}
              <div className="text-xs text-muted-foreground">{fmtData(o.ocorreu_em)}{o.justificativa ? ` — ${o.justificativa}` : ""}</div></li>)}</ul>}
        </Painel>}
      </aside>
    </div>
  );
}

function AcaoForm({ substituir, onSubmit }: { substituir: boolean; onSubmit: (a: Record<string, unknown>) => void }) {
  const [desc, setDesc] = useState(""); const [data, setData] = useState(""); const [motivo, setMotivo] = useState("");
  return <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onSubmit({ _descricao: desc, _prevista: localParaIso(data), _motivo: motivo || null }); }}>
    <Input placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} required />
    <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
    {substituir && <Input className="sm:col-span-2" placeholder="Motivo da substituição" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />}
    <Button type="submit" size="sm" className="w-fit">Salvar</Button></form>;
}

function MotivoForm({ label, onSubmit }: { label: string; onSubmit: (m: string) => void }) {
  const [m, setM] = useState("");
  return <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onSubmit(m); }}><Input placeholder={label} value={m} onChange={(e) => setM(e.target.value)} required /><Button size="sm" type="submit">Confirmar</Button></form>;
}

function InteracaoForm({ onSubmit }: { onSubmit: (a: Record<string, unknown>) => void }) {
  const [canal, setCanal] = useState(CANAIS[0]); const [res, setRes] = useState("FALOU"); const [resumo, setResumo] = useState("");
  const [acordo, setAcordo] = useState(false); const [nd, setNd] = useState(""); const [ndata, setNdata] = useState("");
  return <form className="space-y-3 border-t pt-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ _canal: canal, _resultado: res, _resumo: resumo, _acordo: acordo, _nova_descricao: nd || null, _nova_prevista: localParaIso(ndata) }); }}>
    <div className="grid gap-2 sm:grid-cols-2">
      <div><Label>Canal</Label><select className={sel} value={canal} onChange={(e) => setCanal(e.target.value)}>{CANAIS.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div><Label>Resultado</Label><select className={sel} value={res} onChange={(e) => setRes(e.target.value)}>{Object.entries(RESULTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
    </div>
    {res === "REMARCOU" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={acordo} onChange={(e) => setAcordo(e.target.checked)} />Houve conversa e acordo de nova data com o cliente</label>}
    <Textarea placeholder="O que aconteceu?" value={resumo} onChange={(e) => setResumo(e.target.value)} required />
    <p className="text-sm font-medium">Próximo passo (opcional — conclui a ação pendente)</p>
    <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Ex.: Ligar para enviar orçamento" value={nd} onChange={(e) => setNd(e.target.value)} />
      <Input type="datetime-local" value={ndata} onChange={(e) => setNdata(e.target.value)} /></div>
    <Button size="sm" type="submit">Salvar contato</Button></form>;
}

function VendaForm({ onSubmit }: { onSubmit: (itens: Any[]) => void }) {
  const [itens, setItens] = useState([{ descricao: "", quantidade: "1", valor: "" }]);
  const parsed = itens.map((i) => ({ descricao: i.descricao, quantidade: parseInt(i.quantidade, 10), valor_unitario_centavos: reaisParaCentavos(i.valor) ?? 0 }));
  const upd = (j: number, k: string, v: string) => setItens(itens.map((x, i) => i === j ? { ...x, [k]: v } : x));
  return <form className="space-y-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); onSubmit(parsed); }}>
    {itens.map((it, j) => <div key={j} className="grid gap-2 sm:grid-cols-[1fr_5rem_8rem]">
      <Input placeholder="Produto" value={it.descricao} onChange={(e) => upd(j, "descricao", e.target.value)} required />
      <Input type="number" min={1} step={1} value={it.quantidade} onChange={(e) => upd(j, "quantidade", e.target.value)} required />
      <Input placeholder="R$ unitário" value={it.valor} onChange={(e) => upd(j, "valor", e.target.value)} required /></div>)}
    <div className="flex items-center gap-3"><Button type="button" size="sm" variant="outline" onClick={() => setItens([...itens, { descricao: "", quantidade: "1", valor: "" }])}>+ Item</Button>
      <span className="text-sm">Total: <b>{formatarCentavos(totalVendaCentavos(parsed.map((p) => ({ ...p, quantidade: p.quantidade || 0 }))))}</b></span></div>
    <Button size="sm" type="submit">Confirmar venda (Ganho)</Button></form>;
}

function PerdaForm({ onSubmit }: { onSubmit: (a: Record<string, unknown>) => void }) {
  const [m, setM] = useState(MOTIVOS_PERDA[0]); const [obs, setObs] = useState("");
  return <form className="space-y-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ _motivo: m, _obs: obs || null }); }}>
    <select className={sel} value={m} onChange={(e) => setM(e.target.value)}>{MOTIVOS_PERDA.map((x) => <option key={x}>{x}</option>)}</select>
    <Textarea placeholder={m === "Outro" ? "Explique o motivo (obrigatório)" : "Observação (opcional)"} value={obs} onChange={(e) => setObs(e.target.value)} required={m === "Outro"} />
    <Button size="sm" variant="destructive" type="submit">Confirmar perda</Button></form>;
}

function DistribuirForm({ perfil, atual, onSubmit }: { perfil: string; atual: string; onSubmit: (id: string) => void }) {
  const eq = useQuery({ queryKey: ["equipe"], queryFn: () => rpc<{ id: string; nome: string; perfil: string; loja_nome: string }[]>("listar_equipe") });
  const [dest, setDest] = useState("");
  return <form className="flex gap-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); onSubmit(dest); }}>
    <select className={sel} value={dest} onChange={(e) => setDest(e.target.value)} required><option value="">Escolha o responsável</option>
      {eq.data?.filter((u) => u.id !== atual).map((u) => <option key={u.id} value={u.id}>{u.nome} · {u.perfil === "GERENTE" ? "Gerente" : "Vendedor"}{perfil === "SUPERVISOR" ? ` · ${u.loja_nome}` : ""}</option>)}</select>
    <Button size="sm" type="submit">Confirmar</Button></form>;
}

function ArquivoForm({ arquivar, onSubmit }: { arquivar: boolean; onSubmit: (j: string | null) => void }) {
  const [j, setJ] = useState("");
  return <form className="space-y-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); onSubmit(j.trim() || null); }}>
    <Textarea maxLength={500} placeholder="Justificativa (opcional, até 500 caracteres)" value={j} onChange={(e) => setJ(e.target.value)} />
    <Button size="sm" type="submit">{arquivar ? "Arquivar" : "Desarquivar"}</Button></form>;
}
