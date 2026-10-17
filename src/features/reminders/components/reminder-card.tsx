"use client";
import Link from "next/link";
import { LockKeyhole, Users, Repeat2, Pencil } from "lucide-react";
import type { ReminderRecord, ReminderCategory } from "../types";
import { scheduleOf, statusLabels } from "../types";
import { reminderStatus } from "../status";
import { saveReminder, operateReminder } from "../actions";
import { CategoryIcon } from "./category-dialog";
import { ReminderDialog } from "./reminder-dialog";
import { ReminderForm } from "./reminder-form";
import { CompletionDialog, SnoozeDialog } from "./completion-dialog";
function Operation({
  record,
  operation,
  label,
}: {
  record: ReminderRecord;
  operation: string;
  label: string;
}) {
  return (
    <ReminderDialog
      title={label}
      description="El registro y su historial se conservan. Los avisos pendientes se actualizarán."
      action={operateReminder}
      trigger={
        <button className="text-muted-foreground min-h-10 rounded-xl border px-3 py-2 text-xs">
          {label}
        </button>
      }
    >
      <input name="id" type="hidden" value={record.id} />
      <input name="operation" type="hidden" value={operation} />
      <p className="text-sm break-words">{record.title}</p>
    </ReminderDialog>
  );
}
export function ReminderCard({
  record,
  categories,
  today,
  canEdit,
  userId,
}: {
  record: ReminderRecord;
  categories: ReminderCategory[];
  today: string;
  canEdit: boolean;
  userId: string;
}) {
  const category = categories.find((c) => c.id === record.category_id),
    status = reminderStatus(
      { ...scheduleOf(record), kind: record.kind },
      today,
    ),
    active = record.status === "active" && record.kind !== "note",
    Privacy = record.visibility === "personal" ? LockKeyhole : Users;
  return (
    <article className="bg-card min-w-0 rounded-2xl border p-4 transition-shadow duration-200 motion-reduce:transition-none sm:p-5">
      <div className="flex items-start gap-3">
        <CategoryIcon category={category} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/reminders/${record.id}`}
            className="font-semibold break-words hover:underline"
          >
            {record.title}
          </Link>
          <p className="text-muted-foreground mt-1 text-xs break-words">
            {category?.name ?? "Sin categoría"}
            {record.reference ? ` · ${record.reference}` : ""}
          </p>
        </div>
        <span
          className="shrink-0"
          title={record.visibility === "personal" ? "Solo tú" : "Compartido"}
        >
          <Privacy
            className="text-muted-foreground size-4"
            aria-label={
              record.visibility === "personal" ? "Personal" : "Compartido"
            }
          />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2.5 py-1 ${status === "overdue" ? "bg-destructive/10 text-destructive" : status === "today" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
        >
          {statusLabels[status]}
        </span>
        {record.kind === "recurring" && (
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Repeat2 className="size-3" />
            Recurrente
          </span>
        )}
        {record.effective_date && (
          <span>
            {new Date(`${record.effective_date}T12:00:00`).toLocaleDateString(
              "es",
              { day: "numeric", month: "short", year: "numeric" },
            )}
            {record.due_time ? ` · ${record.due_time.slice(0, 5)}` : ""}
          </span>
        )}
      </div>
      {record.due_km != null && (
        <p className="text-muted-foreground mt-3 text-sm">
          Objetivo: {record.due_km.toLocaleString("es")} km ·{" "}
          {record.current_km == null
            ? "Actualiza la lectura"
            : `${Math.max(0, Math.round((record.due_km - record.current_km) * 10) / 10).toLocaleString("es")} km restantes`}
        </p>
      )}
      {record.notes && (
        <p className="text-muted-foreground mt-3 line-clamp-3 text-sm break-words whitespace-pre-wrap">
          {record.notes}
        </p>
      )}
      {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          {active && (
            <>
              <CompletionDialog record={record} today={today} />
              <SnoozeDialog record={record} today={today} />
            </>
          )}
          <ReminderDialog
            title="Editar registro"
            action={saveReminder}
            trigger={
              <button className="inline-flex min-h-10 items-center gap-1 rounded-xl border px-3 py-2 text-sm">
                <Pencil className="size-3.5" />
                Editar
              </button>
            }
          >
            <ReminderForm
              record={record}
              categories={categories}
              today={today}
              userId={userId}
            />
          </ReminderDialog>
          {record.status === "paused" ? (
            <Operation record={record} operation="resume" label="Reanudar" />
          ) : (
            active && (
              <Operation record={record} operation="pause" label="Pausar" />
            )
          )}
          {record.status === "archived" ? (
            <Operation record={record} operation="restore" label="Restaurar" />
          ) : (
            <Operation record={record} operation="archive" label="Archivar" />
          )}
        </div>
      )}
    </article>
  );
}
