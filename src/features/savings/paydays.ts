// Días de pago: quincenal = 15 y último día del mes; mensual = último día del mes.
export type Cadence = "quincenal" | "mensual";

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function monthPaydays(y: number, m: number, cadence: Cadence) {
  const end = iso(y, m, lastDay(y, m));
  return cadence === "quincenal" ? [iso(y, m, 15), end] : [end];
}

/** Paydays desde el mes de `from` hasta el de `to` (ambos incluidos), en orden. */
function paydaysAround(from: string, to: string, cadence: Cadence) {
  let y = Number(from.slice(0, 4)),
    m = Number(from.slice(5, 7)) - 1;
  const out: string[] = [];
  while (iso(y, m, 1) <= to) {
    out.push(...monthPaydays(y, m, cadence));
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

const monthBefore = (day: string) => {
  const d = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 10);
};

/** Último día de pago que ya llegó (≤ hoy). */
export function currentPayday(today: string, cadence: Cadence) {
  return paydaysAround(monthBefore(today), today, cadence)
    .filter((p) => p <= today)
    .at(-1)!;
}

/** Siguiente día de pago estrictamente después de `day`. */
export function nextPayday(day: string, cadence: Cadence) {
  const end = new Date(`${day}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 40);
  return paydaysAround(day, end.toISOString().slice(0, 10), cadence).find((p) => p > day)!;
}

export type ProvisionLike = {
  target_amount: number;
  balance: number;
  target_date: string | null;
  cadence: Cadence | null;
  cycle_start: string | null;
  last_contribution_date: string | null;
};

/**
 * Cuánto apartar por día de pago y si toca hoy. Reparte lo que falta entre los
 * días de pago que quedan hasta la fecha límite (mínimo 1).
 */
export function provisionPlan(goal: ProvisionLike, today: string) {
  if (!goal.cadence || !goal.target_date || !goal.cycle_start) return null;
  const missing = Math.max(0, Math.round((goal.target_amount - goal.balance) * 100) / 100);
  const pay = currentPayday(today, goal.cadence);
  const started = pay >= goal.cycle_start;
  const from = started ? pay : nextPayday(today, goal.cadence);
  const remaining = paydaysAround(from, goal.target_date, goal.cadence).filter(
    (p) => p >= from && p <= goal.target_date!,
  ).length;
  const perPayday = Math.ceil((missing * 100) / Math.max(1, remaining)) / 100;
  const due =
    missing > 0 && started && (!goal.last_contribution_date || goal.last_contribution_date < pay);
  return { perPayday, due, payday: pay, nextPayday: nextPayday(today, goal.cadence), missing, remaining };
}
