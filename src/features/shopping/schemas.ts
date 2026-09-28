import { z } from "zod";
import { optionalDate, optionalText, amount } from "../projects/schemas";
import { nullableAmount } from "../inventory/schemas";

export const shoppingSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre.").max(100),
  estimated_price: nullableAmount,
  priority: z.enum(["low", "medium", "high"]),
  target_date: optionalDate,
  url: z.union([
    z.literal(""),
    z
      .string()
      .url()
      .max(2000)
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "Usa un enlace http o https.",
      ),
  ]),
  notes: optionalText,
  status: z.enum(["pending", "discarded"]),
});
export const buySchema = z.object({
  id: z.string().uuid(),
  amount: amount.refine(
    (value) => value > 0,
    "El gasto debe ser mayor que cero.",
  ),
  account_id: z.string().uuid("Selecciona una cuenta."),
  category_id: z.string().uuid("Selecciona una categoría."),
  payment_method_id: z
    .union([z.literal(""), z.string().uuid()])
    .transform((value) => value || null),
  date: z.string().date(),
  create_inventory: z
    .string()
    .optional()
    .transform((value) => value === "on"),
});
export const priorityLabels = { high: "Alta", medium: "Media", low: "Baja" };
export const shoppingStatus = {
  pending: "Pendiente",
  bought: "Comprado",
  discarded: "Descartado",
};
