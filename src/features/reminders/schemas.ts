import { z } from "zod";
export const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "Fecha inválida",
  );
const optionalDay = z
  .union([day, z.literal(""), z.null()])
  .optional()
  .transform((v) => v || null);
const km = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().min(0).max(99999999).multipleOf(0.1).nullable(),
);
const optionalUnit = z
  .union([z.enum(["day", "week", "month", "year"]), z.literal(""), z.null()])
  .optional()
  .transform((v) => v || null);
export const reminderSchema = z
  .object({
    title: z.string().trim().min(1, "Escribe un título").max(120),
    notes: z.string().trim().max(5000).default(""),
    reference: z.string().trim().max(80).default(""),
    kind: z.enum(["note", "once", "recurring"]),
    visibility: z.enum(["personal", "household"]).default("personal"),
    category_id: z
      .union([z.string().uuid(), z.literal(""), z.null()])
      .optional()
      .transform((v) => v || null),
    due_date: optionalDay,
    due_time: z
      .union([
        z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((v) => v || null),
    repeat_unit: optionalUnit,
    repeat_interval: z.coerce.number().int().min(1).max(365).default(1),
    repeat_from: z.enum(["completion", "calendar"]).default("completion"),
    current_km: km,
    due_km: km,
    repeat_km: km.refine(
      (v) => v == null || v > 0,
      "El intervalo debe ser mayor que cero",
    ),
    alert_days: z
      .array(z.coerce.number().int().min(0).max(365))
      .max(12)
      .default([7, 1, 0])
      .transform((v) => [...new Set(v)].sort((a, b) => b - a)),
  })
  .transform((v) =>
    v.kind === "note"
      ? {
          ...v,
          due_date: null,
          due_time: null,
          due_km: null,
          current_km: null,
          repeat_km: null,
          repeat_unit: null,
          alert_days: [],
        }
      : v.kind === "once"
        ? { ...v, repeat_unit: null, repeat_km: null }
        : v,
  )
  .superRefine((v, c) => {
    if (v.kind !== "note" && !v.due_date && v.due_km == null)
      c.addIssue({
        code: "custom",
        path: ["due_date"],
        message: "Indica una fecha o un kilometraje objetivo",
      });
    if (v.kind === "recurring" && !v.repeat_unit && !v.repeat_km)
      c.addIssue({
        code: "custom",
        path: ["repeat_unit"],
        message: "Elige cómo se repetirá",
      });
    if (v.repeat_unit && !v.due_date)
      c.addIssue({
        code: "custom",
        path: ["due_date"],
        message: "La repetición por fecha necesita una fecha inicial",
      });
    if (v.repeat_km && v.due_km == null)
      c.addIssue({
        code: "custom",
        path: ["due_km"],
        message: "Indica el kilometraje objetivo",
      });
  });
export type ReminderInput = z.infer<typeof reminderSchema>;
export const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.enum([
    "car",
    "paw-print",
    "heart-pulse",
    "graduation-cap",
    "house",
    "notebook-pen",
  ]),
});
export const completionSchema = z.object({
  performed_date: day,
  performed_km: km,
  notes: z.string().trim().max(5000).default(""),
});
