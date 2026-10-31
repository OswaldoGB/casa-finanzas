import { z } from "zod";

export const packagingPresets = ["Unidad", "Caja", "Paquete", "Bolsa", "Botella", "Lata", "Frasco", "Rollo", "Tubo", "Sobre", "Tarro", "Bidón"] as const;
const positiveInteger = z.coerce.number().int().min(1).max(1000000);
export const packageEntrySchema = z.object({
  name: z.string().trim().min(1).max(60),
  count: positiveInteger.max(1000),
  capacity: positiveInteger,
});
export const stockChangeSchema = z.object({ amount: positiveInteger });
