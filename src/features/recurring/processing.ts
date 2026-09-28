import {
  nextRecurringDate,
  type RecurrenceFrequency,
} from "../finance/recurrence";

type RuleSchedule = {
  next_run_date: string;
  start_date: string;
  end_date: string | null;
  frequency: RecurrenceFrequency;
  interval_count: number;
  is_active: boolean;
  mode: "auto" | "confirm";
};

export function todayInTimeZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function planOccurrence(rule: RuleSchedule, today: string) {
  const date = rule.next_run_date;
  if (
    !rule.is_active ||
    date > today ||
    (rule.end_date && date > rule.end_date)
  )
    return null;

  const nextRunDate = nextRecurringDate(
    date,
    rule.start_date,
    rule.frequency,
    rule.interval_count,
  );
  return {
    date,
    status: rule.mode === "auto" ? ("posted" as const) : ("pending" as const),
    nextRunDate,
    isActive: !rule.end_date || nextRunDate <= rule.end_date,
  };
}
