const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatUSD(value: number): string {
  return usd.format(value);
}

/** Divide "$1,234.56" en { whole: "$1,234", cents: ".56" } para jerarquía visual. */
export function splitUSD(value: number): { whole: string; cents: string } {
  const parts = usd.formatToParts(value);
  const i = parts.findIndex((p) => p.type === "decimal");
  const join = (ps: Intl.NumberFormatPart[]) => ps.map((p) => p.value).join("");
  return i === -1 ? { whole: join(parts), cents: "" } : { whole: join(parts.slice(0, i)), cents: join(parts.slice(i)) };
}
