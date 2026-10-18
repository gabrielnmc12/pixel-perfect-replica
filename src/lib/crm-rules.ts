// Pure business rules mirrored from the database (the database is authoritative).

export function normalizarTelefone(t: string): string {
  const d = (t ?? "").replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d.slice(2);
  return d;
}

/** Two business days (Mon–Sat, no holidays), excluding creation day, same local time. */
export function addDiasUteis(base: Date, n = 2): Date {
  const d = new Date(base.getTime());
  let c = 0;
  while (c < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) c++;
  }
  return d;
}

export function totalVendaCentavos(itens: { quantidade: number; valor_unitario_centavos: number }[]) {
  return itens.reduce((s, i) => s + i.quantidade * i.valor_unitario_centavos, 0);
}

/** "1.234,56" or "1234.56" → integer cents, without floating point. */
export function reaisParaCentavos(v: string): number | null {
  const s = v.trim().replace(/\s/g, "").replace("R$", "");
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(norm);
  if (!m) return null;
  return parseInt(m[1] ?? "0", 10) * 100 + parseInt((m[2] ?? "0").padEnd(2, "0"), 10);
}

export function formatarCentavos(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function justificativaNormalizada(j: string): string | null {
  const t = j.trim();
  return t === "" ? null : t;
}
