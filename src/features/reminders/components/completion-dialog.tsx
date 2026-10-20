"use client";
import { useState } from "react";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import { nextOccurrence } from "../schedule";
import { scheduleOf } from "../types";
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
      <CompletionFields record={record} today={today} />
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

const longDate = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

/** Fecha y km de esta vez; el km va vacío (no la lectura vieja) y muestra el próximo. */
function CompletionFields({ record, today }: { record: ReminderRecord; today: string }) {
  const [date, setDate] = useState(today);
  const [km, setKm] = useState("");
  const tracksKm = record.due_km != null || record.repeat_km != null;
  const lower = record.current_km != null && km !== "" && Number(km) < record.current_km;
  let next = "";
  if (record.kind === "recurring" && (!record.repeat_km || km !== "")) {
    try {
      const n = nextOccurrence(scheduleOf(record), {
        performedDate: date,
        performedKm: km === "" ? null : Number(km),
        today,
      });
      next = [n.dueDate ? longDate(n.dueDate) : null, n.dueKm != null ? `a los ${n.dueKm.toLocaleString("es")} km` : null]
        .filter(Boolean)
        .join(" o ");
    } catch {
      next = "";
    }
  }
  return (
    <>
      <input type="hidden" name="id" value={record.id} />
      <input type="hidden" name="occurrence_id" value={record.occurrence_id} />
      <label className="grid gap-1 text-sm">
        ¿Cuándo lo hiciste?
        <input type="date" name="performed_date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
      </label>
      {tracksKm && (
        <label className="grid gap-1 text-sm">
          Kilometraje de hoy en el tablero
          <input
            type="number"
            name="performed_km"
            min="0"
            step="0.1"
            inputMode="decimal"
            required={record.repeat_km != null}
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder={record.current_km != null ? `Última lectura: ${record.current_km.toLocaleString("es")} km` : "Ej. 125000"}
            className={fieldClass}
          />
        </label>
      )}
      {lower && (
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="confirm_reading_correction" className="accent-primary size-4" />
          Es menor que la última lectura ({record.current_km!.toLocaleString("es")} km). Confirmo que es una corrección.
        </label>
      )}
      {next ? (
        <p className="text-primary text-sm font-medium">Próxima vez: {next}.</p>
      ) : (
        record.repeat_km != null && <p className="text-muted-foreground text-sm">Escribe el kilometraje para calcular la próxima vez.</p>
      )}
      <label className="grid gap-1 text-sm">
        Observaciones
        <textarea name="notes" maxLength={5000} rows={2} placeholder="Aceite 5W-30, taller…" className={`${fieldClass} h-auto py-2`} />
      </label>
    </>
  );
}
