import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { getReminders } from "@/features/reminders/queries";
import { reminderFilters } from "@/features/reminders/filters";
import { scheduleOf } from "@/features/reminders/types";
import { agendaBucket, reminderStatus, type AgendaBucket } from "@/features/reminders/status";
import { ReminderDialog } from "@/features/reminders/components/reminder-dialog";
import { ReminderForm } from "@/features/reminders/components/reminder-form";
import { ReminderCard } from "@/features/reminders/components/reminder-card";
import { ReminderCalendar } from "@/features/reminders/components/reminder-calendar";
import { RemindersFilters, RemindersMenu } from "@/features/reminders/components/reminders-toolbar";
import { saveReminder } from "@/features/reminders/actions";
import { ReminderSync } from "@/features/reminders/components/reminder-sync";

export const metadata = { title: "Recordatorios" };

const BUCKETS: [AgendaBucket, string][] = [
  ["overdue", "Vencidos"],
  ["today", "Hoy"],
  ["week", "Esta semana"],
  ["later", "Más adelante"],
  ["undated", "Sin fecha"],
];
const SECONDARY: Record<string, string> = {
  completed: "Historial de realizados",
  paused: "Pausados",
  archived: "Archivados",
  notes: "Notas",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = reminderFilters.safeParse(await searchParams),
    data = await getReminders(p.success ? p.data : {});
  const { records, categories, today, canEdit, userId, filters, count } = data;
  const secondary = SECONDARY[filters.view];
  const sections =
    filters.view === "agenda"
      ? BUCKETS.map(([bucket, title]) => ({
          title,
          rows: records.filter(
            (r) =>
              agendaBucket(
                reminderStatus({ ...scheduleOf(r), kind: r.kind }, today),
                r.effective_date,
                today,
              ) === bucket,
          ),
        }))
      : [
          {
            title:
              filters.view === "calendar"
                ? filters.date
                  ? `Para el ${filters.date}`
                  : "Este mes"
                : "",
            rows: records,
          },
        ];
  const href = (page: number) =>
    `/reminders?${new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(filters)
          .filter(([, v]) => v != null && v !== "")
          .map(([k, v]) => [k, String(v)]),
      ),
      page: String(page),
    })}`;
  const tab = (view: string, label: string) => {
    const active = filters.view === view;
    return (
      <Link
        href={`/reminders${view === "agenda" ? "" : `?view=${view}`}`}
        aria-current={active ? "page" : undefined}
        className={`rounded-lg px-4 py-1.5 text-sm ${active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ReminderSync />
      <header className="flex items-center gap-2">
        {secondary ? (
          <Link
            href="/reminders"
            className="text-muted-foreground hover:bg-muted -ml-2 grid size-10 place-items-center rounded-xl"
            aria-label="Volver a próximos"
          >
            <ArrowLeft className="size-5" />
          </Link>
        ) : null}
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">{secondary ?? "Recordatorios"}</h1>
        <RemindersMenu categories={categories} canEdit={canEdit} />
        {canEdit && (
          <ReminderDialog
            title="Nuevo recordatorio"
            action={saveReminder}
            listenToNew
            trigger={
              <button className="bg-primary text-primary-foreground inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-medium">
                <Plus className="size-4" />
                Nuevo
              </button>
            }
          >
            <ReminderForm categories={categories} today={today} userId={userId} />
          </ReminderDialog>
        )}
      </header>

      {!secondary && (
        <nav aria-label="Vistas de recordatorios" className="bg-muted inline-flex rounded-xl p-1">
          {tab("agenda", "Próximos")}
          {tab("calendar", "Calendario")}
        </nav>
      )}

      <RemindersFilters
        key={`${filters.view}:${filters.category}`}
        categories={categories}
        q={filters.q}
        category={filters.category}
      />

      {filters.view === "calendar" && (
        <ReminderCalendar
          month={filters.month}
          today={today}
          selected={filters.date}
          dates={records.flatMap((r) => (r.effective_date ? [r.effective_date] : []))}
        />
      )}

      {!records.length ? (
        <section className="text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
          {filters.q || filters.category
            ? "Nada coincide con la búsqueda."
            : secondary
              ? "No hay nada aquí."
              : "Nada pendiente. Toca «Nuevo» para recordar algo."}
        </section>
      ) : (
        sections
          .filter((s) => s.rows.length)
          .map((s) => (
            <section key={s.title || "lista"} className="space-y-2">
              {s.title && (
                <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {s.title} <span className="font-normal">· {s.rows.length}</span>
                </h2>
              )}
              <div className="stagger grid gap-2">
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
        <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Paginación">
          {filters.page > 1 ? <Link href={href(filters.page - 1)}>← Anterior</Link> : <span />}
          <span className="text-muted-foreground">
            Página {filters.page} · {count} registros
          </span>
          {filters.page * 50 < count ? <Link href={href(filters.page + 1)}>Siguiente →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
