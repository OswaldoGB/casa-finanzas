"use client";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import { completeReminder, operateReminder } from "../actions";
import type { ReminderRecord } from "../types";
import { ReminderDialog } from "./reminder-dialog";
type Controlled = { open?: boolean; onOpenChange?: (open: boolean) => void };
export function CompletionDialog({
  record,
  today,
  trigger,
}: {
  record: ReminderRecord;
  today: string;
  trigger?: React.ReactNode;
}) {
  return (
    <ReminderDialog
      title="Marcar como realizado"
      description={
        record.kind === "recurring"
          ? "Guardaremos esta realización y prepararemos la próxima ocasión."
          : "La realización quedará guardada en el historial."
      }
      action={completeReminder}
      label="Guardar realización"
      trigger={
        trigger ?? (
          <button className="bg-primary text-primary-foreground min-h-10 rounded-xl px-3 py-2 text-sm">
            Marcar como realizado
          </button>
        )
      }
    >
      <input type="hidden" name="id" value={record.id} />
      <input type="hidden" name="occurrence_id" value={record.occurrence_id} />
      <label className="grid gap-1 text-sm">
        Fecha realizada
        <input
          type="date"
          name="performed_date"
          max={today}
          defaultValue={today}
          className={fieldClass}
        />
      </label>
      {record.due_km != null && (
        <>
          <label className="grid gap-1 text-sm">
            Kilometraje al realizarlo
            <input
              type="number"
              name="performed_km"
              min="0"
              step="0.1"
              defaultValue={record.current_km ?? ""}
              className={fieldClass}
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="confirm_reading_correction" />
            Confirmo si la lectura corrige hacia abajo el kilometraje anterior.
          </label>
        </>
      )}
      <label className="grid gap-1 text-sm">
        Observaciones
        <textarea
          name="notes"
          maxLength={5000}
          rows={3}
          className={`${fieldClass} h-auto py-2`}
        />
      </label>
    </ReminderDialog>
  );
}
export function SnoozeDialog({
  record,
  today,
  open,
  onOpenChange,
}: {
  record: ReminderRecord;
  today: string;
} & Controlled) {
  return (
    <ReminderDialog
      title="Posponer esta ocasión"
      description="El calendario original de repetición se conserva. Los avisos pendientes se actualizarán."
      action={operateReminder}
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        open === undefined && (
          <button className="min-h-10 rounded-xl border px-3 py-2 text-sm">
            Posponer
          </button>
        )
      }
    >
      <input name="id" type="hidden" value={record.id} />
      <input name="operation" type="hidden" value="snooze" />
      <label className="grid gap-1 text-sm">
        Recordarme el
        <input
          type="date"
          name="date"
          defaultValue={record.effective_date ?? today}
          min={today}
          className={fieldClass}
        />
      </label>
    </ReminderDialog>
  );
}
