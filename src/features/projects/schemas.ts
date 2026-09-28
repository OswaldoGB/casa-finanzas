import { z } from "zod";

export const optionalText = z.string().trim().max(2000);
export const optionalDate = z
  .union([z.literal(""), z.string().date()])
  .transform((value) => value || null);
export const amount = z.coerce
  .number()
  .finite()
  .min(0)
  .max(999999999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
    "Usa un máximo de dos decimales.",
  );
export const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Escribe el nombre.").max(100),
    description: optionalText,
    budget: amount,
    start_date: optionalDate,
    end_date: optionalDate,
    status: z.enum(["planned", "active", "completed", "archived"]),
  })
  .refine(
    (value) =>
      !value.start_date ||
      !value.end_date ||
      value.end_date >= value.start_date,
    {
      message: "La fecha final debe ser igual o posterior al inicio.",
      path: ["end_date"],
    },
  );
export const projectSnapshotSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    budget: z.number(),
    spent: z.number(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    status: z.enum(["planned", "active", "completed", "archived"]),
    expenses: z.array(
      z.object({
        id: z.string().uuid(),
        date: z.string(),
        description: z.string(),
        amount: z.number(),
      }),
    ),
  }),
);
export const projectStatus = {
  planned: "Planeado",
  active: "En marcha",
  completed: "Terminado",
  archived: "Archivado",
};

export const inputClass =
  "border-input bg-background w-full rounded-lg border px-3 py-2.5 text-sm";
