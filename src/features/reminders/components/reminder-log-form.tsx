"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { FormSelect } from "@/components/ui/form-select";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import type { ReminderCategory } from "../types";
import { nextOccurrence, type ReminderSchedule } from "../schedule";
import { suggestFor } from "../suggestions";
import { ALERTS, REPEAT_PRESETS, check, chip } from "./form-options";

type Unit = NonNullable<ReminderSchedule["repeatUnit"]>;
const shift = (day: string, days: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const longDate = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });

/**
 * "Ya lo hice": registra lo realizado y propone la próxima vez. Envía los
 * mismos campos que el formulario normal con already_done=on; el servidor
 * guarda la realización y calcula la siguiente ocasión desde esa fecha.
 */
export function ReminderLogFields({
  categories,
  today,
}: {
  categories: ReminderCategory[];
  today: string;
}) {
  const [title, setTitle] = useState("");
  const [performed, setPerformed] = useState(shift(today, -1));
  const [performedKm, setPerformedKm] = useState("");
  // Lo que el usuario toca manualmente deja de seguir la sugerencia.
  const [preset, setPreset] = useState<string | null>(null);
  const [repeatKm, setRepeatKm] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [kmToggle, setKmToggle] = useState<boolean | null>(null);
  const [alerts, setAlerts] = useState(new Set([7, 0]));

  const sug = suggestFor(title);
  const effPreset = preset ?? sug?.preset ?? "none";
  const effCategory =
    categoryId ?? categories.find((c) => c.slug === sug?.category)?.id ?? "none";
  const vehicles = categories.find((c) => c.id === effCategory)?.slug === "vehicles";
  const kmOn = kmToggle ?? (vehicles || sug?.km != null);
  const effRepeatKm = kmOn ? (repeatKm ?? (sug?.km ? String(sug.km) : "")) : "";
  const repeatsByDate = effPreset !== "none" && effPreset !== "custom";
  const [unit, interval] = repeatsByDate
    ? [effPreset.split(":")[0] as Unit, Number(effPreset.split(":")[1])]
    : (["month", 1] as const);
  const repeats = repeatsByDate || effRepeatKm !== "";
  const kmMissing = effRepeatKm !== "" && performedKm === "";

  let next = "";
  if (repeats && !kmMissing) {
    try {
      const n = nextOccurrence(
        {
          dueDate: performed,
          dueTime: null,
          anchorDate: performed,
          repeatUnit: repeatsByDate ? unit : null,
          repeatInterval: interval,
          repeatFrom: "completion",
          dueKm: effRepeatKm ? Number(performedKm) : null,
          currentKm: null,
          repeatKm: effRepeatKm ? Number(effRepeatKm) : null,
          snoozedUntil: null,
          status: "active",
        },
        { performedDate: performed, performedKm: performedKm ? Number(performedKm) : null, today },
      );
      next = [
        n.dueDate ? longDate(n.dueDate) : null,
        n.dueKm != null ? `a los ${n.dueKm.toLocaleString("es")} km` : null,
      ]
        .filter(Boolean)
        .join(" o ");
    } catch {
      next = "";
    }
  }

  return (
    <>
      <input type="hidden" name="already_done" value="on" />
      <input type="hidden" name="kind" value={repeats ? "recurring" : "once"} />
      <input type="hidden" name="due_date" value={performed} />
      <input type="hidden" name="repeat_from" value="completion" />
      {repeatsByDate && (
        <>
          <input type="hidden" name="repeat_unit" value={unit} />
          <input type="hidden" name="repeat_interval" value={interval} />
        </>
      )}
      {kmOn && performedKm !== "" && (
        <>
          <input type="hidden" name="current_km" value={performedKm} />
          {effRepeatKm && <input type="hidden" name="due_km" value={performedKm} />}
        </>
      )}
      {effRepeatKm && <input type="hidden" name="repeat_km" value={effRepeatKm} />}
      <input type="hidden" name="alert_days" value={[...alerts].join(",")} />

      <label className="grid gap-1 text-sm">
        ¿Qué hiciste?
        <input
          name="title"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Cambio de aceite, vacuna de Luna, dentista…"
          className={fieldClass}
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm">¿Cuándo?</legend>
        <div className="flex flex-wrap items-center gap-2">
          {[
            [today, "Hoy"],
            [shift(today, -1), "Ayer"],
          ].map(([d, label]) => (
            <label key={label} className={chip}>
              <input type="radio" className="sr-only" checked={performed === d} onChange={() => setPerformed(d)} />
              {label}
            </label>
          ))}
          <input
            type="date"
            name="performed_date"
            max={today}
            value={performed}
            onChange={(e) => setPerformed(e.target.value)}
            aria-label="Otra fecha"
            className={`${fieldClass} w-auto`}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {[{ id: "none", name: "Sin categoría" }, ...categories.filter((c) => !c.is_archived)].map((c) => (
            <label key={c.id} className={chip}>
              <input
                type="radio"
                name="category_id"
                value={c.id}
                checked={effCategory === c.id}
                onChange={() => setCategoryId(c.id)}
                className="sr-only"
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>

      {kmOn ? (
        <label className="grid gap-1 text-sm">
          Kilometraje cuando lo hiciste
          <input
            type="number"
            name="performed_km"
            step="0.1"
            min="0"
            inputMode="decimal"
            value={performedKm}
            onChange={(e) => setPerformedKm(e.target.value)}
            placeholder="120000"
            className={fieldClass}
          />
        </label>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={false} onChange={() => setKmToggle(true)} className={check} />
          Registrar kilometraje
        </label>
      )}

      <div className="bg-muted/50 grid gap-3 rounded-xl border p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="text-primary size-4" aria-hidden />
          ¿Te lo recuerdo la próxima vez?
        </p>
        {sug && preset === null && (
          <p className="text-muted-foreground -mt-1 text-xs">
            Sugerencia para {sug.label}: {REPEAT_PRESETS.find((p) => p.value === sug.preset)?.label.toLowerCase()}
            {sug.km ? ` o cada ${sug.km.toLocaleString("es")} km` : ""}, lo que ocurra primero.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Repetir
            <FormSelect
              name="repeat_preset"
              value={effPreset}
              onValueChange={setPreset}
              placeholder="No me lo recuerdes"
              options={[
                { value: "none", label: kmOn ? "Solo por kilometraje" : "No me lo recuerdes" },
                ...REPEAT_PRESETS.filter((p) => p.value !== "none" && p.value !== "custom"),
              ]}
            />
          </label>
          {kmOn && (
            <label className="grid gap-1 text-sm">
              O cada (km)
              <input
                type="number"
                step="0.1"
                min="0.1"
                inputMode="decimal"
                value={effRepeatKm}
                onChange={(e) => setRepeatKm(e.target.value)}
                placeholder="Opcional"
                className={fieldClass}
              />
            </label>
          )}
        </div>
        {kmMissing && <p className="text-sm text-amber-600 dark:text-amber-400">Escribe el kilometraje de ese día para calcular el próximo.</p>}
        {next && (
          <p className="text-primary text-sm font-medium">Próxima vez: {next}.</p>
        )}
        {repeats && (
          <div className="flex flex-wrap gap-2">
            {ALERTS.map((a) => (
              <label key={a.days} className={chip}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={alerts.has(a.days)}
                  onChange={(e) => {
                    const n = new Set(alerts);
                    if (e.target.checked) n.add(a.days);
                    else n.delete(a.days);
                    setAlerts(n);
                  }}
                />
                Avisar {a.label.toLowerCase()}
              </label>
            ))}
          </div>
        )}
        {!repeats && (
          <p className="text-muted-foreground text-xs">Se guardará solo en el historial, sin recordatorio.</p>
        )}
      </div>

      <label className="grid gap-1 text-sm">
        Observaciones (opcional)
        <input name="performed_notes" maxLength={5000} placeholder="Aceite 5W-30, taller El Sol…" className={fieldClass} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="visibility" value="household" className={check} />
        Compartir con el hogar
      </label>
    </>
  );
}
