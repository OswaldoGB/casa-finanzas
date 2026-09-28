import { z } from "zod";

const id = z.string().uuid();
const date = z.string().date("Fecha inválida");
const amount = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "Monto inválido")
  .transform(Number)
  .refine((value) => value > 0, "El monto debe ser mayor que cero");
export const installmentSchema = z
  .object({
    card_id: id,
    name: z.string().trim().min(1).max(120),
    amount,
    installments: z.coerce.number().int().min(1).max(120),
    purchase_date: date,
    first_close: date,
    mode: z.enum(["new", "existing"]),
    category_id: z
      .union([z.literal(""), id])
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (value.first_close < value.purchase_date)
      context.addIssue({
        code: "custom",
        path: ["first_close"],
        message: "El primer corte no puede ser anterior a la compra",
      });
    if (Math.round(value.amount * 100) < value.installments)
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Cada cuota debe ser de al menos un centavo",
      });
    if (value.mode === "new" && !value.category_id)
      context.addIssue({
        code: "custom",
        path: ["category_id"],
        message: "Elige la categoría del gasto",
      });
  });
export const cardPaymentSchema = z
  .object({
    card_id: id,
    date,
    sources: z
      .array(z.object({ account_id: id, amount }))
      .min(1)
      .max(20),
  })
  .superRefine((value, context) => {
    const ids = value.sources.map((source) => source.account_id);
    if (new Set(ids).size !== ids.length || ids.includes(value.card_id))
      context.addIssue({
        code: "custom",
        path: ["sources"],
        message: "Elige cuentas de origen distintas de la tarjeta y entre sí",
      });
  });
