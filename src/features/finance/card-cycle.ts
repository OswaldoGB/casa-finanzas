function monthDay(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function cardStatementCycle(
  today: string,
  closingDay: number,
  paymentDay: number,
) {
  const now = new Date(`${today}T00:00:00Z`);
  let close = monthDay(now.getUTCFullYear(), now.getUTCMonth(), closingDay);
  if (close > now)
    close = monthDay(now.getUTCFullYear(), now.getUTCMonth() - 1, closingDay);

  const previousClose = monthDay(
    close.getUTCFullYear(),
    close.getUTCMonth() - 1,
    closingDay,
  );
  const starts = new Date(previousClose);
  starts.setUTCDate(starts.getUTCDate() + 1);

  let due = monthDay(close.getUTCFullYear(), close.getUTCMonth(), paymentDay);
  if (due <= close)
    due = monthDay(close.getUTCFullYear(), close.getUTCMonth() + 1, paymentDay);

  return {
    startsOn: dateOnly(starts),
    closesOn: dateOnly(close),
    dueOn: dateOnly(due),
  };
}
