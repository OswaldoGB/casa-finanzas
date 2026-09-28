import { expect, it } from "vitest";
import { allowedSearchTargets, normalizeSearch } from "./search";

it("solo busca módulos visibles, incluso cuando los catálogos tienen lectura compartida", () => {
  expect(
    allowedSearchTargets("member", {
      reports: "view",
      accounts: "none",
      transactions: "edit",
    }).map((target) => target.table),
  ).toEqual(["transactions"]);
  expect(allowedSearchTargets("member", {}).length).toBe(0);
  expect(allowedSearchTargets("admin", {}).length).toBe(8);
});

it("escapa los comodines y limita el texto que se envía a la búsqueda", () => {
  expect(normalizeSearch("  compra%_\\  ")).toBe("compra");
  expect(normalizeSearch("a".repeat(100)).length).toBe(80);
});
