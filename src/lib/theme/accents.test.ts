import { describe, expect, it } from "vitest";
import { ACCENTS, accentVars, isAccentId } from "./accents";
import { contrast, inSrgbGamut, type Oklch } from "./color";

// Superficies reales de globals.css.
const LIGHT = { bg: { l: 0.99, c: 0.002, h: 75 }, card: { l: 1, c: 0, h: 0 }, onPrimary: { l: 0.99, c: 0, h: 0 } };
const DARK = {
  bg: { l: 0.16, c: 0.004, h: 60 },
  card: { l: 0.2, c: 0.005, h: 60 },
  popover: { l: 0.21, c: 0.005, h: 60 },
  onPrimary: { l: 0.16, c: 0.004, h: 60 },
};
const AA = 4.5;

function oklab({ l, c, h }: Oklch) {
  const r = (h * Math.PI) / 180;
  return [l, c * Math.cos(r), c * Math.sin(r)];
}

describe.each(ACCENTS)("acento $name", ({ tokens: { light, dark } }) => {
  it("todos los tokens caben en sRGB", () => {
    for (const c of [...Object.values(light), ...Object.values(dark)]) expect(inSrgbGamut(c, 2e-3)).toBe(true);
  });
  it("claro: primario legible como texto sobre fondo y tarjeta, y texto blanco legible sobre él", () => {
    expect(contrast(light.primary, LIGHT.bg)).toBeGreaterThanOrEqual(AA);
    expect(contrast(light.primary, LIGHT.card)).toBeGreaterThanOrEqual(AA);
    expect(contrast(LIGHT.onPrimary, light.primary)).toBeGreaterThanOrEqual(AA);
    expect(contrast(light.softFg, light.soft)).toBeGreaterThanOrEqual(AA);
  });
  it("oscuro: primario legible sobre fondo, tarjeta y popover, y texto oscuro legible sobre él", () => {
    for (const s of [DARK.bg, DARK.card, DARK.popover]) expect(contrast(dark.primary, s)).toBeGreaterThanOrEqual(AA);
    expect(contrast(DARK.onPrimary, dark.primary)).toBeGreaterThanOrEqual(AA);
    expect(contrast(dark.softFg, dark.soft)).toBeGreaterThanOrEqual(AA);
  });
});

describe("paleta", () => {
  it("ids únicos y validación", () => {
    expect(new Set(ACCENTS.map((a) => a.id)).size).toBe(ACCENTS.length);
    expect(isAccentId("indigo")).toBe(true);
    expect(isAccentId("hackeo; background:red")).toBe(false);
  });
  it("cada par de acentos se distingue a simple vista (ΔE OKLab ≥ 0.03)", () => {
    for (const mode of ["light", "dark"] as const)
      ACCENTS.forEach((a, i) =>
        ACCENTS.slice(i + 1).forEach((b) => {
          const [p, q] = [oklab(a.tokens[mode].primary), oklab(b.tokens[mode].primary)];
          const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
          expect(d, `${a.id} vs ${b.id} (${mode})`).toBeGreaterThanOrEqual(0.03);
        }),
      );
  });
  it("genera variables CSS oklch()", () => {
    expect(accentVars("violeta")["--ac-primary"]).toMatch(/^oklch\(0\.\d+ 0\.\d+ \d+(\.\d)?\)$/);
  });
});
