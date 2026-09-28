import { z } from "zod";
import { amount, optionalDate, optionalText } from "../projects/schemas";

export const nullableAmount = z
  .union([z.literal(""), amount])
  .transform((value) => (value === "" ? null : value));
export const inventorySchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre.").max(100),
  location: z.string().trim().max(100),
  category: z.string().trim().max(100),
  quantity: z.coerce
    .number()
    .finite()
    .positive()
    .max(9999999)
    .refine(
      (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 0.00001,
      "Usa hasta tres decimales en la cantidad.",
    ),
  purchase_date: optionalDate,
  purchase_price: nullableAmount,
  warranty_until: optionalDate,
  condition: z.string().trim().min(1).max(50),
  notes: optionalText,
  transaction_id: z
    .union([z.literal(""), z.string().uuid()])
    .transform((value) => value || null),
});
export function inventoryValue(
  items: { quantity: number; purchase_price: number | null }[],
) {
  return (
    Math.round(
      items.reduce(
        (total, item) => total + item.quantity * (item.purchase_price ?? 0),
        0,
      ) * 100,
    ) / 100
  );
}
export function warrantyExpiring(date: string | null, today: string) {
  if (!date || date < today) return false;
  const last = new Date(`${today}T12:00:00Z`);
  last.setUTCDate(last.getUTCDate() + 30);
  return date <= last.toISOString().slice(0, 10);
}
