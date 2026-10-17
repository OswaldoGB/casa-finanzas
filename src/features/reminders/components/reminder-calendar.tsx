"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { es } from "react-day-picker/locale";
export function ReminderCalendar({
  month,
  today,
  selected,
  dates,
}: {
  month?: string;
  today: string;
  selected?: string;
  dates: string[];
}) {
  const router = useRouter(),
    params = useSearchParams();
  const local = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function change(date: Date | undefined, isMonth = false) {
    const p = new URLSearchParams(params.toString());
    p.set("view", "calendar");
    p.delete("page");
    if (isMonth && date) {
      p.set("month", local(date).slice(0, 7));
      p.delete("date");
    } else if (date) p.set("date", local(date));
    else p.delete("date");
    router.push(`/reminders?${p}`);
  }
  return (
    <div className="bg-card max-w-full rounded-2xl border p-3">
      <Calendar
        mode="single"
        locale={es}
        month={new Date(`${month ?? today.slice(0, 7)}-01T12:00:00`)}
        onMonthChange={(d) => change(d, true)}
        selected={selected ? new Date(`${selected}T12:00:00`) : undefined}
        onSelect={(d) => change(d)}
        modifiers={{ scheduled: dates.map((d) => new Date(`${d}T12:00:00`)) }}
        modifiersClassNames={{
          scheduled: "font-bold text-primary underline underline-offset-4",
        }}
        className="mx-auto w-fit max-w-full"
      />
      <p className="text-muted-foreground mt-2 text-center text-xs">
        Elige un día para ver sus pendientes.
      </p>
    </div>
  );
}
