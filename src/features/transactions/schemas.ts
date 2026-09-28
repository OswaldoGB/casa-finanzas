import { z } from "zod";

const optionalId = z
  .union([z.literal(""), z.string().uuid()])
  .transform((value) => value || null);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Fecha inválida");

export const transactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: z
      .string()
      .trim()
      .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "Monto inválido")
      .transform(Number)
      .refine((amount) => amount > 0, "El monto debe ser mayor que cero"),
    date,
    account_id: z.string().uuid("Elige una cuenta"),
    destination_account_id: optionalId,
    category_id: optionalId,
    payment_method_id: optionalId,
    description: z.string().trim().max(240, "Máximo 240 caracteres"),
    notes: z
      .string()
      .trim()
      .max(2000, "Máximo 2000 caracteres")
      .transform((value) => value || null),
  })
  .superRefine((value, ctx) => {
    if (value.type === "transfer") {
      if (!value.destination_account_id)
        ctx.addIssue({
          code: "custom",
          path: ["destination_account_id"],
          message: "Elige una cuenta destino",
        });
      if (value.destination_account_id === value.account_id)
        ctx.addIssue({
          code: "custom",
          path: ["destination_account_id"],
          message: "El destino debe ser diferente",
        });
    } else if (!value.category_id)
      ctx.addIssue({
        code: "custom",
        path: ["category_id"],
        message: "Elige una categoría",
      });
  })
  .transform((value) =>
    value.type === "transfer"
      ? { ...value, category_id: null, payment_method_id: null }
      : { ...value, destination_account_id: null },
  );

export const transactionIdSchema = z.string().uuid("Movimiento inválido");
