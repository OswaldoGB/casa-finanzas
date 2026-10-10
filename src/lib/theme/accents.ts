import { inSrgbGamut, toCss, type Oklch } from "./color";

// Luminosidades elegidas con contraste WCAG AA (≥ 4.5:1) contra fondos y tarjetas
// en claro y oscuro; ver accents.test.ts. Cambiar un valor obliga a pasar el test.
const BASE = [
  // Vivos
  { id: "indigo", name: "Índigo", group: "vivo", h: 275, c: 0.19, l: 0.565 },
  { id: "violeta", name: "Violeta", group: "vivo", h: 300, c: 0.2, l: 0.575 },
  { id: "fucsia", name: "Fucsia", group: "vivo", h: 330, c: 0.22, l: 0.58 },
  { id: "rosa", name: "Rosa", group: "vivo", h: 355, c: 0.19, l: 0.58 },
  { id: "naranja", name: "Naranja", group: "vivo", h: 50, c: 0.148, l: 0.565 },
  { id: "ambar", name: "Ámbar", group: "vivo", h: 75, c: 0.118, l: 0.56 },
  { id: "lima", name: "Lima", group: "vivo", h: 125, c: 0.136, l: 0.545 },
  { id: "esmeralda", name: "Esmeralda", group: "vivo", h: 160, c: 0.122, l: 0.54 },
  { id: "turquesa", name: "Turquesa", group: "vivo", h: 185, c: 0.094, l: 0.54 },
  { id: "cielo", name: "Cielo", group: "vivo", h: 230, c: 0.108, l: 0.545 },
  { id: "azul", name: "Azul", group: "vivo", h: 255, c: 0.18, l: 0.555 },
  // Sobrios
  { id: "grafito", name: "Grafito", group: "sobrio", h: 260, c: 0.006, l: 0.555 },
  { id: "pizarra", name: "Pizarra", group: "sobrio", h: 245, c: 0.065, l: 0.55 },
  { id: "marino", name: "Marino", group: "sobrio", h: 262, c: 0.11, l: 0.555 },
  { id: "salvia", name: "Salvia", group: "sobrio", h: 150, c: 0.05, l: 0.55 },
  { id: "oliva", name: "Oliva", group: "sobrio", h: 115, c: 0.07, l: 0.55 },
  { id: "caramelo", name: "Caramelo", group: "sobrio", h: 58, c: 0.075, l: 0.56 },
  { id: "terracota", name: "Terracota", group: "sobrio", h: 40, c: 0.11, l: 0.565 },
  { id: "ciruela", name: "Ciruela", group: "sobrio", h: 340, c: 0.09, l: 0.565 },
] as const;

export type AccentId = (typeof BASE)[number]["id"];
export const DEFAULT_ACCENT: AccentId = "indigo";

/** Baja el croma hasta que el color quepa en sRGB (mismo tono y luminosidad). */
function fit(l: number, c: number, h: number): Oklch {
  let cc = c;
  while (cc > 0 && !inSrgbGamut({ l, c: cc, h })) cc -= 0.002;
  return { l, c: Math.max(0, Number(cc.toFixed(3))), h };
}

function derive({ h, c, l }: (typeof BASE)[number]) {
  return {
    light: { primary: fit(l, c, h), soft: fit(0.955, c * 0.15, h), softFg: fit(0.42, Math.min(c, 0.14), h) },
    dark: { primary: fit(0.7, c * 0.9, h), soft: fit(0.28, c * 0.3, h), softFg: fit(0.9, c * 0.3, h) },
  };
}

export const ACCENTS = BASE.map((b) => ({ ...b, tokens: derive(b) }));

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === "string" && ACCENTS.some((a) => a.id === value);
}

/** Variables CSS por acento; globals.css las consume con fallback al índigo. */
export function accentVars(id: AccentId): Record<string, string> {
  const { light, dark } = ACCENTS.find((a) => a.id === id)!.tokens;
  return {
    "--ac-primary": toCss(light.primary),
    "--ac-soft": toCss(light.soft),
    "--ac-soft-fg": toCss(light.softFg),
    "--ac-primary-d": toCss(dark.primary),
    "--ac-soft-d": toCss(dark.soft),
    "--ac-soft-fg-d": toCss(dark.softFg),
  };
}

export const ACCENT_STORAGE_KEY = "accent";
