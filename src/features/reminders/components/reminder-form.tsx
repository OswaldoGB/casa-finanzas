"use client";
import { useState } from "react";
import { FormSelect } from "@/components/ui/form-select";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import type { ReminderCategory, ReminderRecord } from "../types";
import { nextOccurrence, type ReminderSchedule } from "../schedule";
export function ReminderForm({
  record,
  categories,
  today,
  userId,
}: {
  record?: ReminderRecord;
  categories: ReminderCategory[];
  today: string;
  userId: string;
}) {
  const [kind, setKind] = useState(record?.kind ?? "once"),
    [track, setTrack] = useState(
      record?.due_km != null ? (record.due_date ? "both" : "km") : "date",
    ),
    [done, setDone] = useState(false);
  const [date, setDate] = useState(record?.due_date ?? today),
    [unit, setUnit] = useState<ReminderSchedule["repeatUnit"]>(
      record?.repeat_unit ?? "month",
    ),
    [interval, setInterval] = useState(record?.repeat_interval ?? 1),
    [from, setFrom] = useState(record?.repeat_from ?? "completion"),
    [performed, setPerformed] = useState(today),
    [km, setKm] = useState(""),
    [repeatKm, setRepeatKm] = useState(record?.repeat_km?.toString() ?? "");
  const dates = kind !== "note" && track !== "km",
    mileage = kind !== "note" && track !== "date";
  let preview = "";
  if (done && kind === "recurring") {
    try {
      const n = nextOccurrence(
        {
          dueDate: dates ? date : null,
          dueTime: null,
          anchorDate: record?.anchor_date ?? date,
          repeatUnit: dates ? unit : null,
          repeatInterval: interval,
          repeatFrom: from,
          dueKm: record?.due_km ?? null,
          currentKm: null,
          repeatKm: mileage && repeatKm ? Number(repeatKm) : null,
          snoozedUntil: null,
          status: "active",
        },
        {
          performedDate: performed,
          performedKm: km ? Number(km) : null,
          today,
        },
      );
      preview = [
        n.dueDate,
        n.dueKm != null ? `${n.dueKm.toLocaleString("es")} km` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    } catch {
      preview =
        "Completa la fecha y los kilómetros para ver la próxima ocasión.";
    }
  }
  return (
    <>
      {record && <input name="id" type="hidden" value={record.id} />}
      <label className="grid gap-1 text-sm">
        Título
        <input
          name="title"
          maxLength={120}
          defaultValue={record?.title}
          placeholder="Cambio de aceite, parcial, desparasitación…"
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Tipo
        <FormSelect
          name="kind"
          value={kind}
          onValueChange={(v) => setKind(v as typeof kind)}
          placeholder="Tipo"
          options={[
            { value: "once", label: "Recordatorio puntual" },
            { value: "recurring", label: "Recordatorio recurrente" },
            { value: "note", label: "Nota sin vencimiento" },
          ]}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Categoría
          <FormSelect
            name="category_id"
            defaultValue={record?.category_id ?? "none"}
            placeholder="Sin categoría"
            options={[
              { value: "none", label: "Sin categoría" },
              ...categories
                .filter((c) => !c.is_archived || c.id === record?.category_id)
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Referencia (opcional)
          <input
            name="reference"
            maxLength={80}
            defaultValue={record?.reference}
            placeholder="Pickup, nombre del perro, materia…"
            className={fieldClass}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        Notas
        <textarea
          name="notes"
          maxLength={5000}
          defaultValue={record?.notes}
          rows={3}
          className={`${fieldClass} h-auto py-3`}
          placeholder="Detalles que quieras conservar"
        />
      </label>
      {!record || record.owner_id === userId ? (
        <label className="grid gap-1 text-sm">
          Privacidad
          <FormSelect
            name="visibility"
            defaultValue={record?.visibility ?? "personal"}
            placeholder="Privacidad"
            options={[
              { value: "personal", label: "Solo yo" },
              { value: "household", label: "Compartido con el hogar" },
            ]}
          />
          <span className="text-muted-foreground text-xs">
            Al compartir también será visible el historial.
          </span>
        </label>
      ) : (
        <input type="hidden" name="visibility" value={record.visibility} />
      )}
      {kind !== "note" && (
        <>
          <label className="grid gap-1 text-sm">
            ¿Cómo lo quieres seguir?
            <FormSelect
              name="tracking"
              value={track}
              onValueChange={setTrack}
              placeholder="Seguimiento"
              options={[
                { value: "date", label: "Por fecha" },
                { value: "km", label: "Por kilometraje" },
                {
                  value: "both",
                  label: "Fecha o kilómetros, lo que ocurra primero",
                },
              ]}
            />
          </label>
          {dates && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Próxima fecha
                <input
                  type="date"
                  name="due_date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Hora (opcional)
                <input
                  type="time"
                  name="due_time"
                  defaultValue={record?.due_time?.slice(0, 5)}
                  className={fieldClass}
                />
              </label>
            </div>
          )}
          {mileage && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Lectura actual (km)
                  <input
                    type="number"
                    name="current_km"
                    step="0.1"
                    min="0"
                    defaultValue={record?.current_km ?? ""}
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Objetivo (km)
                  <input
                    type="number"
                    name="due_km"
                    step="0.1"
                    min="0"
                    defaultValue={record?.due_km ?? ""}
                    className={fieldClass}
                  />
                </label>
              </div>
              <p className="text-muted-foreground text-xs">
                La lectura se actualiza manualmente; la app no mide el uso del
                vehículo.
              </p>
              {record && (
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" name="confirm_reading_correction" />
                  Confirmo si estoy corrigiendo una lectura anterior hacia
                  abajo.
                </label>
              )}
            </>
          )}
          {kind === "recurring" && (
            <fieldset className="grid gap-3 rounded-xl border p-4">
              <legend className="px-1 text-sm font-medium">
                Próximas ocasiones
              </legend>
              {dates && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-sm">
                    Cada
                    <input
                      name="repeat_interval"
                      type="number"
                      min="1"
                      max="365"
                      value={interval}
                      onChange={(e) => setInterval(Number(e.target.value))}
                      className={fieldClass}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Unidad
                    <FormSelect
                      name="repeat_unit"
                      value={unit ?? "month"}
                      onValueChange={(v) => setUnit(v as typeof unit)}
                      placeholder="Repetición"
                      options={[
                        { value: "day", label: "Días" },
                        { value: "week", label: "Semanas" },
                        { value: "month", label: "Meses" },
                        { value: "year", label: "Años" },
                      ]}
                    />
                  </label>
                </div>
              )}
              {dates && (
                <label className="grid gap-1 text-sm">
                  Contar desde
                  <FormSelect
                    name="repeat_from"
                    value={from}
                    onValueChange={(v) => setFrom(v as typeof from)}
                    placeholder="Base"
                    options={[
                      {
                        value: "completion",
                        label: "La fecha en que lo realicé",
                      },
                      { value: "calendar", label: "Calendario fijo" },
                    ]}
                  />
                </label>
              )}
              {mileage && (
                <label className="grid gap-1 text-sm">
                  Repetir cada (km)
                  <input
                    name="repeat_km"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={repeatKm}
                    onChange={(e) => setRepeatKm(e.target.value)}
                    className={fieldClass}
                  />
                </label>
              )}
            </fieldset>
          )}
          {dates ? (
            <label className="grid gap-1 text-sm">
              Avisarme estos días antes
              <input
                name="alert_days"
                defaultValue={record?.alert_days.join(", ") ?? "7, 1, 0"}
                placeholder="7, 1, 0"
                className={fieldClass}
              />
              <span className="text-muted-foreground text-xs">
                0 es el mismo día. Deja vacío para no recibir avisos. Revisión
                diaria, sin alarma a una hora exacta.
              </span>
            </label>
          ) : (
            <input name="alert_days" type="hidden" value="0" />
          )}
          {!record && (
            <label className="flex items-center gap-2 text-sm">
              <input
                name="already_done"
                type="checkbox"
                checked={done}
                onChange={(e) => setDone(e.target.checked)}
              />
              Ya lo realicé; guardar en el historial
            </label>
          )}
          {done && (
            <fieldset className="grid gap-3 rounded-xl border p-4">
              <legend className="px-1 text-sm">Última realización</legend>
              <label className="grid gap-1 text-sm">
                Fecha realizada
                <input
                  type="date"
                  name="performed_date"
                  max={today}
                  value={performed}
                  onChange={(e) => setPerformed(e.target.value)}
                  className={fieldClass}
                />
              </label>
              {mileage && (
                <label className="grid gap-1 text-sm">
                  Kilometraje al realizarlo
                  <input
                    name="performed_km"
                    type="number"
                    step="0.1"
                    min="0"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    className={fieldClass}
                  />
                </label>
              )}
              <label className="grid gap-1 text-sm">
                Observaciones
                <input
                  name="performed_notes"
                  maxLength={5000}
                  className={fieldClass}
                />
              </label>
              {preview && (
                <p className="text-primary text-sm">Siguiente: {preview}</p>
              )}
            </fieldset>
          )}
        </>
      )}
    </>
  );
}
