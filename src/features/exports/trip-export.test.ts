import { expect, it } from "vitest";
import { tripExportRows } from "./trip-export";
import { makeTripFixture } from "../trips/test-fixture";
it("exports actual expenses once and preserves store and pending state", () => {
  const rows = tripExportRows(makeTripFixture());
  expect(rows[0]).toMatchObject({
    sección: "Resumen",
    real: 130,
    estimado: 357.65,
    pendiente: 222.5,
  });
  expect(rows.find((r) => r.concepto === "Leche")).toMatchObject({
    sección: "Productos",
    lugar: "Selectos",
    estado: "Pendiente",
    cantidad: 3,
    estimado: 6,
  });
  expect(rows.find((r) => r.concepto === "Airbnb")).toMatchObject({
    estado: "Pago parcial",
    real: 100,
    pendiente: 214,
    diferencia: null,
  });
  expect(rows.find((r) => r.concepto === "Gasolina")).toMatchObject({
    estado: "Completado",
    real: 30,
    diferencia: 5,
  });
});
