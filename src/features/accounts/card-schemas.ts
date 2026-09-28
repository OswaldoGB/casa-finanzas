import { z } from "zod";

const id = z.string().uuid();
const date = z.string().date("Fecha inválida");
const amount = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "Monto inválido")
  .transform(Number)
  .refine((value) => value > 0, "El monto debe ser mayor que cero");
export function installmentAmounts(
  amount: number,
  total: number,
  paid: number,
  mode: "remaining" | "original",
) {
  const cents = Math.round(amount * 100);
  if (
    !Number.isSafeInteger(cents) ||
    cents <= 0 ||
    !Number.isInteger(total) ||
    total < 1 ||
    total > 120 ||
    !Number.isInteger(paid) ||
    paid < 0 ||
    paid >= total
  )
    return null;
  const pendingCount = total - paid;
  const monthly = Math.floor(
    cents / (mode === "original" ? total : pendingCount),
  );
  if (monthly < 1) return null;
  return {
    pendingAmount: (mode === "original" ? cents - monthly * paid : cents) / 100,
    pendingCount,
    monthlyAmount: monthly / 100,
  };
}
export const installmentSchema = z
  .object({
    card_id: id,
    name: z.string().trim().min(1).max(120),
    amount,
    installments: z.coerce.number().int().min(1).max(120),
    paid_installments: z.coerce.number().int().min(0).max(119).default(0),
    amount_mode: z.enum(["remaining", "original"]).default("remaining"),
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
    if (value.paid_installments >= value.installments)
      context.addIssue({
        code: "custom",
        path: ["paid_installments"],
        message: "Debe quedar al menos una cuota pendiente",
      });
    if (value.mode === "new" && value.paid_installments !== 0)
      context.addIssue({
        code: "custom",
        path: ["paid_installments"],
        message: "Para cuotas ya pagadas, registra un plan existente",
      });
    if (
      !installmentAmounts(
        value.amount,
        value.installments,
        value.paid_installments,
        value.amount_mode,
      )
    )
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
