import { describe, expect, it } from "vitest";
import { manualForPath, visibleManuals } from "./registry";

describe("manuales", () => {
  it("el admin ve todos, en los grupos del menú", () => {
    const all = visibleManuals("admin", {});
    expect(all.map((m) => m.key)).toContain("settings");
    expect(all[0]).toMatchObject({ key: "dashboard", group: "Finanzas" });
  });
  it("un miembro solo ve los módulos a los que tiene acceso, sin Configuración", () => {
    const keys = visibleManuals("member", { dashboard: "view", loans: "edit" }).map((m) => m.key);
    expect(keys).toEqual(["dashboard", "loans"]);
  });
  it("detecta la pantalla actual, incluidas subrutas", () => {
    const all = visibleManuals("admin", {});
    expect(manualForPath("/accounts/abc", all)?.key).toBe("accounts");
    expect(manualForPath("/lists/x/y", all)?.key).toBe("lists");
    expect(manualForPath("/notifications", all)).toBeNull();
  });
});

describe("contenido de los manuales", () => {
  it("cada pantalla del menú tiene un manual completo que se puede cargar", async () => {
    const { loadManual } = await import("./registry");
    const all = visibleManuals("admin", {});
    expect(all).toHaveLength(15);
    for (const entry of all) {
      const m = await loadManual(entry.key);
      expect(m.title, entry.key).toBeTruthy();
      expect(m.summary, entry.key).toBeTruthy();
      expect(m.sections.length, entry.key).toBeGreaterThanOrEqual(2);
      for (const s of m.sections)
        expect(Boolean(s.text || s.steps?.length || s.tips?.length), `${entry.key}: ${s.title}`).toBe(true);
    }
  }, 30_000);
});
