const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function paymentPreview(
  amount: number,
  statements: { closesOn: string; dueOn: string; unpaid: number }[],
  date = "9999-12-31",
) {
  let remaining = Math.max(0, Math.round(amount * 100)) / 100;
  let settled = 0;
  const eligible = statements
    .filter((item) => item.unpaid > 0 && item.closesOn <= date)
    .sort((a, b) => a.closesOn.localeCompare(b.closesOn));
  for (const statement of eligible) {
    if (remaining >= statement.unpaid) {
      settled += 1;
      remaining = Math.round((remaining - statement.unpaid) * 100) / 100;
    } else break;
  }
  const next = eligible[settled];
  if (!next)
    return remaining > 0
      ? `${settled ? "Este pago salda los cortes pendientes. " : ""}${money.format(remaining)} quedan sin aplicar a un corte; reducen la deuda contable sin anticipar cuotas futuras.`
      : "Este pago salda todos los cortes pendientes.";
  const left = Math.max(0, next.unpaid - remaining);
  return `Este pago salda ${settled} corte${settled === 1 ? "" : "s"} y deja ${money.format(left)} pendientes del siguiente.`;
}
