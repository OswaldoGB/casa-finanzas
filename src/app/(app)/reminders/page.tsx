import Link from "next/link";
import { BellRing, Plus } from "lucide-react";
import { getReminders } from "@/features/reminders/queries";
import { reminderFilters } from "@/features/reminders/filters";
import { scheduleOf } from "@/features/reminders/types";
import { reminderStatus } from "@/features/reminders/status";
import { ReminderDialog } from "@/features/reminders/components/reminder-dialog";
import { ReminderForm } from "@/features/reminders/components/reminder-form";
import { ReminderCard } from "@/features/reminders/components/reminder-card";
import { ReminderCalendar } from "@/features/reminders/components/reminder-calendar";
import { ReminderFiltersForm } from "@/features/reminders/components/reminder-filters";
import { CategoryDialog } from "@/features/reminders/components/category-dialog";
import { saveReminder } from "@/features/reminders/actions";
import { ExportButtons } from "@/features/exports/components/export-buttons";
import { ReminderSync } from "@/features/reminders/components/reminder-sync";
export const metadata = { title: "Recordatorios" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = reminderFilters.safeParse(await searchParams),
    data = await getReminders(p.success ? p.data : {});
  const { records, categories, today, canEdit, userId, filters, count } = data;
  const sections =
    filters.view === "agenda"
      ? [
          {
            title: "Vencidos",
            rows: records.filter(
              (r) =>
                reminderStatus({ ...scheduleOf(r), kind: r.kind }, today) ===
                "overdue",
            ),
          },
          {
            title: "Hoy",
            rows: records.filter(
              (r) =>
                reminderStatus({ ...scheduleOf(r), kind: r.kind }, today) ===
                "today",
            ),
          },
          {
            title: "Próximos",
            rows: records.filter(
              (r) =>
                !["today", "overdue"].includes(
                  reminderStatus({ ...scheduleOf(r), kind: r.kind }, today),
                ),
            ),
          },
        ]
      : [
          {
            title: (
              {
                calendar: filters.date ? `Para el ${filters.date}` : "Este mes",
                notes: "Tus notas",
                completed: "Realizados",
                paused: "Pausados",
                archived: "Archivados",
              } as Record<string, string>
            )[filters.view],
            rows: records,
          },
        ];
  const href = (page: number) =>
    `/reminders?${new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(filters)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
      page: String(page),
    })}`;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <ReminderSync />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <BellRing className="text-primary size-6" />
            Recordatorios
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Lo que quieres recordar. Lo que ya hiciste, siempre a mano.
          </p>
        </div>
        {canEdit && (
          <ReminderDialog
            title="Nuevo registro"
            action={saveReminder}
            listenToNew
            trigger={
              <button className="bg-primary text-primary-foreground inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm">
                <Plus className="size-4" />
                Nuevo recordatorio
              </button>
            }
          >
            <ReminderForm
              categories={categories}
              today={today}
              userId={userId}
            />
          </ReminderDialog>
        )}
      </header>
      <nav
        aria-label="Vistas de recordatorios"
        className="flex flex-wrap gap-2"
      >
        {[
          ["agenda", "Agenda"],
          ["calendar", "Calendario"],
          ["notes", "Notas"],
          ["completed", "Realizados"],
          ["paused", "Pausados"],
          ["archived", "Archivados"],
        ].map(([view, label]) => (
          <Link
            key={view}
            href={`/reminders?view=${view}`}
            aria-current={filters.view === view ? "page" : undefined}
            className={`min-h-10 rounded-xl px-3 py-2 text-sm ${filters.view === view ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap gap-2">
        <ExportButtons target="reminders" />
        <ExportButtons target="reminder_events" />
      </div>
      <ReminderFiltersForm
        key={JSON.stringify(filters)}
        filters={filters}
        categories={categories}
      />
      {filters.view === "calendar" && (
        <ReminderCalendar
          month={filters.month}
          today={today}
          selected={filters.date}
          dates={records.flatMap((r) =>
            r.effective_date ? [r.effective_date] : [],
          )}
        />
      )}
      {!records.length ? (
        <section className="bg-card rounded-2xl border border-dashed p-8 text-center">
          <BellRing className="text-primary mx-auto mb-3 size-8" />
          <h2 className="font-medium">Nada por aquí todavía</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Crea una nota o programa algo que quieras tener presente.
          </p>
        </section>
      ) : (
        sections
          .filter((s) => s.rows.length)
          .map((s) => (
            <section key={s.title} className="space-y-3">
              <h2 className="font-semibold">{s.title}</h2>
              <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                {s.rows.map((record) => (
                  <ReminderCard
                    key={record.id}
                    record={record}
                    categories={categories}
                    today={today}
                    canEdit={canEdit}
                    userId={userId}
                  />
                ))}
              </div>
            </section>
          ))
      )}
      {count > 50 && (
        <nav
          className="flex items-center justify-between gap-3 text-sm"
          aria-label="Paginación"
        >
          {filters.page > 1 ? (
            <Link href={href(filters.page - 1)}>← Anterior</Link>
          ) : (
            <span />
          )}
          <span>
            Página {filters.page} · {count} registros
          </span>
          {filters.page * 50 < count && (
            <Link href={href(filters.page + 1)}>Siguiente →</Link>
          )}
        </nav>
      )}
      {canEdit && (
        <details className="bg-card rounded-2xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Administrar categorías
          </summary>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <CategoryDialog key={c.id} category={c} />
            ))}
            <CategoryDialog />
          </div>
        </details>
      )}
    </div>
  );
}
