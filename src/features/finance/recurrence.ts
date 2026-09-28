export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly" | "yearly";

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError("Invalid date");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (date.toISOString().slice(0, 10) !== value)
    throw new RangeError("Invalid date");
  return date;
}

function dateAt(year: number, month: number, day: number): Date {
  const lastDay = new Date(0);
  lastDay.setUTCFullYear(year, month, 0);
  const result = new Date(0);
  result.setUTCFullYear(year, month - 1, Math.min(day, lastDay.getUTCDate()));
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

export function nextRecurringDate(
  currentDate: string,
  startDate: string,
  frequency: RecurrenceFrequency,
  interval: number,
): string {
  if (!Number.isSafeInteger(interval) || interval < 1)
    throw new RangeError("Interval must be a positive integer");
  const current = parseDate(currentDate);
  const anchor = parseDate(startDate);

  if (frequency === "weekly" || frequency === "biweekly") {
    current.setUTCDate(
      current.getUTCDate() + interval * (frequency === "weekly" ? 7 : 14),
    );
  } else if (frequency === "monthly") {
    const monthIndex =
      current.getUTCFullYear() * 12 + current.getUTCMonth() + interval;
    const year = Math.floor(monthIndex / 12);
    current.setTime(
      dateAt(year, (monthIndex % 12) + 1, anchor.getUTCDate()).getTime(),
    );
  } else {
    current.setTime(
      dateAt(
        current.getUTCFullYear() + interval,
        anchor.getUTCMonth() + 1,
        anchor.getUTCDate(),
      ).getTime(),
    );
  }

  const next = current.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next))
    throw new RangeError("Date outside supported range");
  return next;
}
