export type ReminderSchedule = {
  dueDate: string | null;
  dueTime: string | null;
  anchorDate: string | null;
  repeatUnit: "day" | "week" | "month" | "year" | null;
  repeatInterval: number;
  repeatFrom: "completion" | "calendar";
  dueKm: number | null;
  currentKm: number | null;
  repeatKm: number | null;
  snoozedUntil: string | null;
  status: string;
};
export type CompletionInput = {
  performedDate: string;
  performedKm: number | null;
  today: string;
};
export type NextOccurrence = {
  dueDate: string | null;
  dueKm: number | null;
  anchorDate: string | null;
  skippedCount: number;
};
function advance(
  current: string,
  anchor: string,
  unit: NonNullable<ReminderSchedule["repeatUnit"]>,
  n: number,
) {
  const date = new Date(`${current}T00:00:00Z`),
    base = new Date(`${anchor}T00:00:00Z`);
  if (unit === "day" || unit === "week")
    date.setUTCDate(date.getUTCDate() + n * (unit === "week" ? 7 : 1));
  else {
    const month = unit === "year" ? base.getUTCMonth() : date.getUTCMonth() + n;
    const year = date.getUTCFullYear() + (unit === "year" ? n : 0);
    date.setUTCDate(1);
    date.setUTCFullYear(year, month, 1);
    const end = new Date(date);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
    date.setUTCDate(Math.min(base.getUTCDate(), end.getUTCDate()));
  }
  const result = date.toISOString().slice(0, 10);
  if (result.length !== 10) throw new RangeError("Fecha fuera de rango");
  return result;
}
export function nextOccurrence(
  s: ReminderSchedule,
  input: CompletionInput,
): NextOccurrence {
  let dueDate: string | null = null,
    skippedCount = 0;
  const anchorDate =
    s.repeatFrom === "completion"
      ? input.performedDate
      : (s.anchorDate ?? s.dueDate);
  if (s.repeatUnit) {
    let start = s.repeatFrom === "completion" ? input.performedDate : s.dueDate;
    if (!start || !anchorDate) throw new Error("Falta fecha inicial");
    dueDate = advance(start, anchorDate, s.repeatUnit, s.repeatInterval);
    if (s.repeatFrom === "calendar") {
      const after =
        input.today > input.performedDate ? input.today : input.performedDate;
      while (dueDate <= after) {
        start = dueDate;
        dueDate = advance(start, anchorDate, s.repeatUnit, s.repeatInterval);
        skippedCount++;
      }
    }
  }
  if (s.repeatKm && input.performedKm == null)
    throw new Error("Indica el kilometraje de realización");
  return {
    dueDate,
    dueKm: s.repeatKm
      ? Math.round((input.performedKm! + s.repeatKm) * 10) / 10
      : null,
    anchorDate,
    skippedCount,
  };
}
