import { describe, expect, it } from "vitest";
import { suggestFor } from "./suggestions";

describe("suggestFor", () => {
  it("reconoce lo común sin importar tildes ni mayúsculas", () => {
    expect(suggestFor("Cambio de ACEITE de la pickup")).toMatchObject({ preset: "month:3", km: 5000, category: "vehicles" });
    expect(suggestFor("Rotación de llantas")).toMatchObject({ km: 10000 });
    expect(suggestFor("Desparasitación de Luna")).toMatchObject({ preset: "month:3", category: "pets" });
    expect(suggestFor("Baño del perro")).toMatchObject({ category: "pets" });
  });
  it("devuelve null si no hay pista", () => {
    expect(suggestFor("Pagar la renta")).toBeNull();
    expect(suggestFor("")).toBeNull();
  });
});
