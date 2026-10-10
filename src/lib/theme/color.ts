// Conversión OKLCH → sRGB y contraste WCAG 2.x. Sin dependencias.

export type Oklch = { l: number; c: number; h: number };

function oklchToLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

/** ¿El color cabe en sRGB (se ve igual en cualquier pantalla)? */
export function inSrgbGamut(color: Oklch, eps = 1e-4): boolean {
  return oklchToLinearRgb(color).every((v) => v >= -eps && v <= 1 + eps);
}

/** Luminancia relativa WCAG (usa RGB lineal, recortado al gamut). */
export function luminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearRgb(color).map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function toCss({ l, c, h }: Oklch): string {
  const r = (n: number, d: number) => Number(n.toFixed(d));
  return `oklch(${r(l, 3)} ${r(c, 3)} ${r(h, 1)})`;
}
