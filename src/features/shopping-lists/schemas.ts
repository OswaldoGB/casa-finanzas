import { z } from "zod";

export const listIdSchema = z.string().uuid("Lista inválida");
export const groupSchema = z.object({
  name: z.string().trim().min(1, "Escribe un lugar").max(100),
});
const money = z
  .string()
  .trim()
  .regex(
    /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/,
    "Precio inválido; máximo dos decimales",
  )
  .transform(Number);
const optionalMoney = z
  .union([z.literal(""), money])
  .transform((value) => (value === "" ? null : value));
export const listSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre").max(100),
  store: z.string().trim().max(100),
  project_id: z
    .union([z.literal(""), listIdSchema])
    .optional()
    .transform((value) => value || null),
  budget: optionalMoney.refine(
    (value) => value === null || value > 0,
    "El tope debe ser mayor que cero",
  ),
});
export const itemSchema = z.object({
  name: z.string().trim().min(1, "Escribe un artículo").max(100),
  group_id: z
    .union([z.literal(""), z.literal("unassigned"), listIdSchema])
    .optional()
    .transform((value) => (value && value !== "unassigned" ? value : null)),
  quantity: z
    .string()
    .trim()
    .regex(
      /^(?:0|[1-9]\d{0,6})(?:\.\d{1,3})?$/,
      "Cantidad inválida; máximo tres decimales",
    )
    .transform(Number)
    .refine((value) => value > 0, "La cantidad debe ser mayor que cero"),
  unit: z.string().trim().max(30),
  estimated_price: optionalMoney,
  real_price: optionalMoney,
  notes: z.string().trim().max(1000),
  sort_order: z.coerce.number().int().min(0).max(1000000).default(0),
});
export const purchaseInputSchema = z.object({
  list_id: listIdSchema,
  group_id: z
    .union([z.literal(""), listIdSchema])
    .transform((value) => value || null),
  item_ids: z
    .array(listIdSchema)
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, "Artículos repetidos"),
  account_id: listIdSchema,
  category_id: listIdSchema,
  date: z.string().date(),
  payment_method_id: z
    .union([z.literal(""), listIdSchema])
    .transform((value) => value || null),
  request_key: listIdSchema,
});
export type TotalsItem = {
  quantity: number;
  estimated_price: number | null;
  real_price: number | null;
  checked: boolean;
};
export function shoppingTotals(items: TotalsItem[]) {
  let cart = 0,
    estimated = 0,
    missingCart = 0,
    missingRemaining = 0;
  for (const item of items) {
    if (item.checked) {
      if (item.real_price === null) missingCart++;
      else
        cart +=
          Math.round(item.real_price * 100) * Math.round(item.quantity * 1000);
    } else if (item.estimated_price === null) missingRemaining++;
    else
      estimated +=
        Math.round(item.estimated_price * 100) *
        Math.round(item.quantity * 1000);
  }
  return {
    cart: Math.round(cart / 1000) / 100,
    estimated: Math.round(estimated / 1000) / 100,
    projected: Math.round((cart + estimated) / 1000) / 100,
    missingCart,
    missingRemaining,
  };
}
