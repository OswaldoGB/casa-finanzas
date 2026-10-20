"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, LockKeyhole, MoreHorizontal, Repeat2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReminderRecord, ReminderCategory } from "../types";
import { scheduleOf, statusLabels } from "../types";
import { dueLabel, reminderStatus } from "../status";
import { saveReminder, operateReminder } from "../actions";
import { CategoryIcon } from "./category-dialog";
import { ReminderDialog } from "./reminder-dialog";
import { ReminderForm } from "./reminder-form";
import { CompletionDialog, SnoozeDialog } from "./completion-dialog";

type Op = "pause" | "resume" | "archive" | "restore";
const OP_LABEL: Record<Op, string> = {
  pause: "Pausar",
  resume: "Reanudar",
  archive: "Archivar",
  restore: "Restaurar",
};

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
  // Un solo diálogo abierto a la vez, lanzado desde el menú ⋯.
  const [dialog, setDialog] = useState<"snooze" | "edit" | Op | null>(null);
  const close = (open: boolean) => !open && setDialog(null);
  const category = categories.find((c) => c.id === record.category_id),
    status = reminderStatus({ ...scheduleOf(record), kind: record.kind }, today),
    active = record.status === "active" && record.kind !== "note",
    when = record.status === "active" ? dueLabel(record.effective_date, today) : null,
    ops: Op[] = [
      ...(record.status === "paused" ? (["resume"] as const) : active ? (["pause"] as const) : []),
      record.status === "archived" ? "restore" : "archive",
    ];
  const tone =
    status === "overdue"
      ? "text-destructive"
      : status === "today"
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <article className="bg-card flex min-w-0 items-start gap-3 rounded-2xl border p-4">
      <CategoryIcon category={category} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <Link
            href={`/reminders/${record.id}`}
            className="min-w-0 flex-1 font-medium break-words hover:underline"
          >
            {record.title}
            {record.reference && (
              <span className="text-muted-foreground font-normal"> · {record.reference}</span>
            )}
          </Link>
          {record.visibility === "personal" && (
            <LockKeyhole className="text-muted-foreground mt-1 size-3.5 shrink-0" aria-label="Solo tú" />
          )}
        </div>
        <p className={`mt-1 flex flex-wrap items-center gap-x-1.5 text-sm ${tone}`}>
          {when ?? statusLabels[status]}
          {record.effective_date && (
            <span className="text-muted-foreground">
              ·{" "}
              {new Date(`${record.effective_date}T12:00:00`).toLocaleDateString("es", {
                day: "numeric",
                month: "short",
              })}
              {record.due_time ? ` ${record.due_time.slice(0, 5)}` : ""}
            </span>
          )}
          {record.due_km != null && (
            <span className="text-muted-foreground">
              ·{" "}
              {record.current_km == null
                ? "actualiza los km"
                : `faltan ${Math.max(0, Math.round((record.due_km - record.current_km) * 10) / 10).toLocaleString("es")} km`}
            </span>
          )}
          {record.kind === "recurring" && (
            <Repeat2 className="text-muted-foreground size-3.5" aria-label="Se repite" />
          )}
        </p>
        {record.kind === "note" && record.notes && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm break-words whitespace-pre-wrap">
            {record.notes}
          </p>
        )}
      </div>

      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          {active && (
            <CompletionDialog
              record={record}
              today={today}
              trigger={
                <button
                  className="bg-primary/10 text-primary hover:bg-primary/15 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium"
                  aria-label={`Marcar «${record.title}» como hecho`}
                >
                  <Check className="size-4" /> Hecho
                </button>
              }
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="text-muted-foreground hover:bg-muted grid size-10 place-items-center rounded-xl"
                aria-label={`Más acciones para «${record.title}»`}
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {active && <DropdownMenuItem onSelect={() => setDialog("snooze")}>Posponer</DropdownMenuItem>}
              <DropdownMenuItem onSelect={() => setDialog("edit")}>Editar</DropdownMenuItem>
              {ops.map((op) => (
                <DropdownMenuItem key={op} onSelect={() => setDialog(op)}>
                  {OP_LABEL[op]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {active && (
            <SnoozeDialog record={record} today={today} open={dialog === "snooze"} onOpenChange={close} />
          )}
          <ReminderDialog title="Editar" action={saveReminder} open={dialog === "edit"} onOpenChange={close}>
            <ReminderForm record={record} categories={categories} today={today} userId={userId} />
          </ReminderDialog>
          {ops.map((op) => (
            <ReminderDialog
              key={op}
              title={OP_LABEL[op]}
              description="El registro y su historial se conservan. Los avisos pendientes se actualizarán."
              action={operateReminder}
              label={OP_LABEL[op]}
              open={dialog === op}
              onOpenChange={close}
            >
              <input name="id" type="hidden" value={record.id} />
              <input name="operation" type="hidden" value={op} />
              <p className="text-sm break-words">{record.title}</p>
            </ReminderDialog>
          ))}
        </div>
      )}
    </article>
  );
}
