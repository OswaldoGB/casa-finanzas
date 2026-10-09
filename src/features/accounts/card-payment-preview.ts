const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function paymentPreview(
  amount: number,
  statements: { dueOn: string; unpaid: number }[],
) {
  let remaining = Math.max(0, Math.round(amount * 100)) / 100;
  let settled = 0;
  for (const statement of statements) {
    if (remaining >= statement.unpaid) {
      settled += 1;
      remaining = Math.round((remaining - statement.unpaid) * 100) / 100;
    } else break;
  }
  const next = statements[settled];
  if (!next) return "Este pago salda todos los cortes pendientes.";
  const left = Math.max(0, next.unpaid - remaining);
  return `Este pago salda ${settled} corte${settled === 1 ? "" : "s"} y deja ${money.format(left)} pendientes del siguiente.`;
}
