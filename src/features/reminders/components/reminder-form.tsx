"use client";
import { useState } from "react";
import { FormSelect } from "@/components/ui/form-select";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import type { ReminderCategory, ReminderRecord } from "../types";
import { nextOccurrence, type ReminderSchedule } from "../schedule";

type Unit = NonNullable<ReminderSchedule["repeatUnit"]>;
// "Se repite": atajos comunes; "custom" abre cada N + unidad.
const REPEAT_PRESETS = [
  { value: "none", label: "No se repite" },
  { value: "week:1", label: "Cada semana" },
  { value: "month:1", label: "Cada mes" },
  { value: "month:3", label: "Cada 3 meses" },
  { value: "month:6", label: "Cada 6 meses" },
  { value: "year:1", label: "Cada año" },
  { value: "custom", label: "Personalizado…" },
];
const ALERTS = [
  { days: 0, label: "El mismo día" },
  { days: 1, label: "1 día antes" },
  { days: 7, label: "1 semana antes" },
];
const chip =
  "inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3 text-sm transition-colors has-[:checked]:border-primary/40 has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring";
const check = "accent-primary size-4";

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
  const savedPreset = `${record?.repeat_unit}:${record?.repeat_interval}`;
  const initialPreset =
    record?.kind === "recurring" && record.repeat_unit
      ? REPEAT_PRESETS.some((p) => p.value === savedPreset)
        ? savedPreset
        : "custom"
      : "none";
  const [noDate, setNoDate] = useState(
    record
      ? record.kind === "note" || (!record.due_date && record.due_km != null)
      : false,
  );
  const [kmOn, setKmOn] = useState(record?.due_km != null);
  const [preset, setPreset] = useState(initialPreset);
  const [unit, setUnit] = useState<Unit>(record?.repeat_unit ?? "month");
  const [interval, setInterval] = useState(record?.repeat_interval ?? 1);
  const [from, setFrom] = useState(record?.repeat_from ?? "completion");
  const [date, setDate] = useState(record?.due_date ?? today);
  const [alerts, setAlerts] = useState(new Set(record?.alert_days ?? [7, 1, 0]));
  const [categoryId, setCategoryId] = useState(record?.category_id ?? "none");
  const [currentKm, setCurrentKm] = useState(record?.current_km?.toString() ?? "");
  const [repeatKm, setRepeatKm] = useState(record?.repeat_km?.toString() ?? "");
  const [done, setDone] = useState(false);
  const [performed, setPerformed] = useState(today);
  const [performedKm, setPerformedKm] = useState("");

  const dates = !noDate;
  const repeatsByDate = dates && preset !== "none";
  const [repUnit, repInterval]: [Unit, number] =
    preset === "custom" || preset === "none"
      ? [unit, preset === "none" ? 1 : interval]
      : [preset.split(":")[0] as Unit, Number(preset.split(":")[1])];
  // El tipo ya no se elige: sale de la fecha, la repetición y el kilometraje.
  const kind =
    noDate && !kmOn
      ? "note"
      : repeatsByDate || (kmOn && repeatKm !== "")
        ? "recurring"
        : "once";
  const vehicles =
    categories.find((c) => c.id === categoryId)?.slug === "vehicles";
  const owner = !record || record.owner_id === userId;
  const lowerReading =
    record?.current_km != null &&
    currentKm !== "" &&
    Number(currentKm) < record.current_km;
  const alertChips = [
    ...ALERTS,
    ...[...alerts]
      .filter((d) => !ALERTS.some((a) => a.days === d))
      .map((d) => ({ days: d, label: `${d} días antes` })),
  ].sort((a, b) => a.days - b.days);

  let preview = "";
  if (done && kind === "recurring") {
    try {
      const n = nextOccurrence(
        {
          dueDate: dates ? date : null,
          dueTime: null,
          anchorDate: record?.anchor_date ?? date,
          repeatUnit: repeatsByDate ? repUnit : null,
          repeatInterval: repInterval,
          repeatFrom: from,
          dueKm: record?.due_km ?? null,
          currentKm: null,
          repeatKm: kmOn && repeatKm ? Number(repeatKm) : null,
          snoozedUntil: null,
          status: "active",
        },
        {
          performedDate: performed,
          performedKm: performedKm ? Number(performedKm) : null,
          today,
        },
      );
      preview = [n.dueDate, n.dueKm != null ? `${n.dueKm.toLocaleString("es")} km` : null]
        .filter(Boolean)
        .join(" · ");
    } catch {
      preview = "Completa la fecha y los kilómetros para ver la próxima ocasión.";
    }
  }

  const kmToggle = (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={kmOn} onChange={(e) => setKmOn(e.target.checked)} className={check} />
      Seguir también por kilometraje
    </label>
  );

  return (
    <>
      {record && <input name="id" type="hidden" value={record.id} />}
      <input type="hidden" name="kind" value={kind} />
      {repeatsByDate && (
        <>
          <input type="hidden" name="repeat_unit" value={repUnit} />
          <input type="hidden" name="repeat_interval" value={repInterval} />
        </>
      )}
      <input type="hidden" name="alert_days" value={dates ? [...alerts].join(",") : "0"} />

      <label className="grid gap-1 text-sm">
        ¿Qué quieres recordar?
        <input
          name="title"
          maxLength={120}
          defaultValue={record?.title}
          placeholder="Cambio de aceite, parcial, desparasitación…"
          className={fieldClass}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Fecha
          <input
            type="date"
            name={dates ? "due_date" : undefined}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={noDate}
            className={`${fieldClass} disabled:opacity-50`}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Se repite
          <FormSelect
            name="repeat_preset"
            value={dates ? preset : "none"}
            onValueChange={setPreset}
            placeholder="No se repite"
            disabled={noDate}
            options={REPEAT_PRESETS}
          />
        </label>
      </div>
      <label className="-mt-1 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={noDate} onChange={(e) => setNoDate(e.target.checked)} className={check} />
        Sin fecha (solo una nota)
      </label>

      {repeatsByDate && preset === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            Cada
            <input type="number" min="1" max="365" value={interval} onChange={(e) => setInterval(Number(e.target.value))} className={fieldClass} />
          </label>
          <label className="grid gap-1 text-sm">
            Unidad
            <FormSelect
              name="repeat_custom_unit"
              value={unit}
              onValueChange={(v) => setUnit(v as Unit)}
              placeholder="Meses"
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
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm">Avisarme</legend>
          <div className="flex flex-wrap gap-2">
            {alertChips.map((a) => (
              <label key={a.days} className={chip}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={alerts.has(a.days)}
                  onChange={(e) => {
                    const next = new Set(alerts);
                    if (e.target.checked) next.add(a.days);
                    else next.delete(a.days);
                    setAlerts(next);
                  }}
                />
                {a.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "none", name: "Sin categoría" },
            ...categories.filter((c) => !c.is_archived || c.id === record?.category_id),
          ].map((c) => (
            <label key={c.id} className={chip}>
              <input
                type="radio"
                name="category_id"
                value={c.id}
                checked={categoryId === c.id}
                onChange={() => setCategoryId(c.id)}
                className="sr-only"
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>

      {owner ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="visibility"
            value="household"
            defaultChecked={record?.visibility === "household"}
            className={check}
          />
          Compartir con el hogar
          <span className="text-muted-foreground text-xs">(incluye su historial)</span>
        </label>
      ) : (
        <input type="hidden" name="visibility" value={record.visibility} />
      )}

      {vehicles && kmToggle}
      {kmOn && (
        <div className="grid gap-3 rounded-xl border p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              Lectura actual (km)
              <input type="number" name="current_km" step="0.1" min="0" value={currentKm} onChange={(e) => setCurrentKm(e.target.value)} className={fieldClass} />
            </label>
            <label className="grid gap-1 text-sm">
              Avisar a los (km)
              <input type="number" name="due_km" step="0.1" min="0" defaultValue={record?.due_km ?? ""} className={fieldClass} />
            </label>
            <label className="grid gap-1 text-sm">
              Repetir cada (km)
              <input type="number" name="repeat_km" step="0.1" min="0.1" value={repeatKm} onChange={(e) => setRepeatKm(e.target.value)} placeholder="Opcional" className={fieldClass} />
            </label>
          </div>
          {lowerReading && (
            <label className="flex gap-2 text-sm">
              <input type="checkbox" name="confirm_reading_correction" className={check} />
              La lectura es menor que la anterior ({record.current_km?.toLocaleString("es")} km). Confirmo que es una corrección.
            </label>
          )}
          <p className="text-muted-foreground text-xs">
            Actualizas la lectura a mano; la app no mide el uso del vehículo.
          </p>
        </div>
      )}

      <details
        className="rounded-xl border px-4 py-3"
        open={Boolean(record && (record.notes || record.reference || record.due_time))}
      >
        <summary className="cursor-pointer text-sm font-medium">Más opciones</summary>
        <div className="mt-4 grid gap-4">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Referencia
              <input name="reference" maxLength={80} defaultValue={record?.reference} placeholder="Pickup, Luna, Cálculo…" className={fieldClass} />
            </label>
            {dates && (
              <label className="grid gap-1 text-sm">
                Hora
                <input type="time" name="due_time" defaultValue={record?.due_time?.slice(0, 5)} className={fieldClass} />
              </label>
            )}
          </div>
          {repeatsByDate && (
            <label className="grid gap-1 text-sm">
              La próxima fecha se cuenta desde
              <FormSelect
                name="repeat_from"
                value={from}
                onValueChange={(v) => setFrom(v as typeof from)}
                placeholder="Cuando lo realice"
                options={[
                  { value: "completion", label: "Cuando lo realice" },
                  { value: "calendar", label: "La fecha fija del calendario" },
                ]}
              />
            </label>
          )}
          {!vehicles && kmToggle}
          {!record && kind !== "note" && (
            <label className="flex items-center gap-2 text-sm">
              <input name="already_done" type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} className={check} />
              Ya lo realicé; guardarlo en el historial
            </label>
          )}
          {done && kind !== "note" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Fecha realizada
                <input type="date" name="performed_date" max={today} value={performed} onChange={(e) => setPerformed(e.target.value)} className={fieldClass} />
              </label>
              {kmOn && (
                <label className="grid gap-1 text-sm">
                  Kilometraje al realizarlo
                  <input name="performed_km" type="number" step="0.1" min="0" value={performedKm} onChange={(e) => setPerformedKm(e.target.value)} className={fieldClass} />
                </label>
              )}
              <label className="grid gap-1 text-sm sm:col-span-2">
                Observaciones
                <input name="performed_notes" maxLength={5000} className={fieldClass} />
              </label>
              {preview && <p className="text-primary text-sm sm:col-span-2">Siguiente: {preview}</p>}
            </div>
          )}
        </div>
      </details>
    </>
  );
}
