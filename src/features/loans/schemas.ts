import { z } from "zod";

export const moneyInput = z
  .string()
  .trim()
  .regex(
    /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/,
    "Escribe un monto con hasta dos decimales",
  )
  .transform(Number)
  .refine((n) => n > 0, "El monto debe ser mayor que cero");
export const optionalId = z
  .union([z.literal(""), z.string().uuid()])
  .transform((v) => v || null);
export const optionalDate = z
  .union([z.literal(""), z.string().date("Fecha inválida")])
  .transform((v) => v || null);
export const loanSchema = z
  .object({
    debtor: z.string().trim().min(1, "Escribe el deudor").max(100),
    amount: moneyInput,
    date: z.string().date(),
    expected_payment_date: optionalDate,
    notes: z.string().trim().max(2000),
    account_id: z.string().uuid("Elige una cuenta"),
    balance_effect: z.enum(["record_now", "already_recorded"]),
  })
  .refine(
    (v) => !v.expected_payment_date || v.expected_payment_date >= v.date,
    {
      path: ["expected_payment_date"],
      message: "La fecha esperada no puede ser anterior al préstamo",
    },
  );
export const repaymentSchema = z.object({
  id: z.string().uuid(),
  amount: moneyInput,
  date: z.string().date(),
  account_id: z.string().uuid("Elige una cuenta"),
});
export const loanSourceSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid("Elige una cuenta o tarjeta"),
  balance_effect: z.enum(["record_now", "already_recorded"]),
});
export const loanEditSchema = z
  .object({ id: z.string().uuid() })
  .and(loanSchema);
export const loanSnapshotSchema = z.array(
  z.object({
    id: z.string().uuid(),
    debtor: z.string(),
    amount: z.number(),
    date: z.string(),
    expected_payment_date: z.string().nullable(),
    notes: z.string().nullable(),
    status: z.enum(["active", "paid", "written_off"]),
    lent: z.number(),
    recovered: z.number(),
    pending: z.number(),
    overdue: z.boolean(),
    source_account_id: z.string().uuid().nullable(),
    source_account_name: z.string().nullable(),
    source_account_type: z.string().nullable(),
    already_recorded: z.boolean(),
  }),
);
export type Loan = z.infer<typeof loanSnapshotSchema>[number];
