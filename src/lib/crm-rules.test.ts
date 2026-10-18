import { describe, it, expect } from "vitest";
import { addDiasUteis, normalizarTelefone, reaisParaCentavos, totalVendaCentavos } from "./crm-rules";

describe("retorno padrão em dois dias úteis", () => {
  it("sexta 16/10 14h30 → segunda 19/10 14h30", () => {
    const r = addDiasUteis(new Date(2026, 9, 16, 14, 30));
    expect([r.getDate(), r.getMonth(), r.getHours(), r.getMinutes()]).toEqual([19, 9, 14, 30]);
  });
  it("sábado 17/10 → terça 20/10", () => {
    expect(addDiasUteis(new Date(2026, 9, 17, 14, 30)).getDate()).toBe(20);
  });
  it("domingo 18/10 → terça 20/10", () => {
    expect(addDiasUteis(new Date(2026, 9, 18, 14, 30)).getDate()).toBe(20);
  });
});

describe("telefone", () => {
  it("normaliza máscara e DDI 55", () => {
    expect(normalizarTelefone("+55 (11) 98765-4321")).toBe("11987654321");
    expect(normalizarTelefone("(11) 98765-4321")).toBe("11987654321");
  });
});

describe("venda", () => {
  it("total = soma de quantidade × valor unitário", () => {
    expect(totalVendaCentavos([{ quantidade: 2, valor_unitario_centavos: 150050 }, { quantidade: 1, valor_unitario_centavos: 99 }])).toBe(300199);
  });
  it("converte reais em centavos sem erro de ponto flutuante", () => {
    expect(reaisParaCentavos("1.234,56")).toBe(123456);
    expect(reaisParaCentavos("0,10")).toBe(10);
    expect(reaisParaCentavos("abc")).toBeNull();
  });
});
