import { describe, expect, it } from "vitest";
import { csvText, collectPages, transactionLabels } from "./format";
import { BACKUP_TABLES } from "./backup-tables";

describe("descargas", () => {
  it("conserva las referencias a los comprobantes privados en el respaldo", () => {
    expect(BACKUP_TABLES).toContain("attachments");
  });
  it("conserva IDs y añade las etiquetas visibles del movimiento", () => {
    expect(
      transactionLabels(
        { account_id: "a", category_id: "c", created_by: "u" },
        {
          accounts: new Map([["a", "Banco"]]),
          categories: new Map([["c", "Salario"]]),
          methods: new Map(),
          members: new Map([["u", "Ana"]]),
          projects: new Map(),
        },
      ),
    ).toMatchObject({
      account_id: "a",
      cuenta: "Banco",
      categoría: "Salario",
      registrado_por: "Ana",
      método: "",
    });
  });
  it("escapa comillas, saltos y fórmulas conservando importes numéricos", () => {
    expect(
      csvText([
        { name: "=SUM(A1)", amount: -12, notes: 'dos, "tres"\ncuatro' },
      ]),
    ).toBe(
      '\uFEFF"name","amount","notes"\r\n"\'=SUM(A1)","-12","dos, ""tres""\ncuatro"',
    );
  });
  it("recorre todas las páginas, incluida la última vacía", async () => {
    const calls: number[] = [];
    const rows = await collectPages(async (offset, size) => {
      calls.push(offset);
      return [1, 2, 3, 4].slice(offset, offset + size);
    }, 2);
    expect(rows).toEqual([1, 2, 3, 4]);
    expect(calls).toEqual([0, 2, 4]);
  });
});
