export type NotificationCondition = { key: string; message: string };
export type NoticeSchedule = {
  kind: string;
  status: string;
  effective_date: string | null;
  due_km: number | null;
  current_km: number | null;
  alert_days: number[];
};
export function notificationCondition(
  r: NoticeSchedule,
  today: string,
): NotificationCondition | null {
  if (r.kind === "note" || r.status !== "active" || !r.alert_days.length)
    return null;
  if (r.due_km != null && r.current_km != null && r.current_km >= r.due_km)
    return {
      key: "mileage",
      message: "Un recordatorio alcanzó el kilometraje previsto.",
    };
  if (!r.effective_date) return null;
  const days = Math.round(
    (Date.parse(r.effective_date) - Date.parse(today)) / 86400000,
  );
  if (days < 0)
    return {
      key: "overdue",
      message: "Tienes un recordatorio pendiente por revisar.",
    };
  const offset = [...r.alert_days].sort((a, b) => a - b).find((v) => v >= days);
  if (offset == null) return null;
  return days === 0 && offset === 0
    ? { key: "due", message: "Tienes un recordatorio para hoy." }
    : {
        key: `advance:${offset}`,
        message: "Se acerca la fecha de un recordatorio.",
      };
}
