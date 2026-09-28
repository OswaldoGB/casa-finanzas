import { z } from "zod";

const optionalId = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.string().uuid().nullable(),
);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Fecha inválida");
const optionalDate = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  date.nullable(),
);

export const recurringRuleSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: z.enum(["income", "expense", "transfer"]),
    amount: z.coerce.number().positive().multipleOf(0.01).max(999999999999.99),
    accountId: z.string().uuid(),
    destinationAccountId: optionalId,
    categoryId: optionalId,
    paymentMethodId: optionalId,
    description: z.string().trim().max(240),
    notes: z.string().trim().optional(),
    frequency: z.enum(["weekly", "biweekly", "monthly", "yearly"]),
    intervalCount: z.coerce.number().int().min(1).max(100),
    startDate: date,
    endDate: optionalDate,
    mode: z.enum(["auto", "confirm"]),
  })
  .superRefine((value, context) => {
    if (value.type === "transfer") {
      if (
        !value.destinationAccountId ||
        value.destinationAccountId === value.accountId ||
        value.categoryId
      )
        context.addIssue({
          code: "custom",
          path: ["destinationAccountId"],
          message: "Elige otra cuenta de destino y ninguna categoría",
        });
    } else if (!value.categoryId || value.destinationAccountId) {
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Elige una categoría y ninguna cuenta destino",
      });
    }
    if (value.endDate && value.endDate < value.startDate)
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "La fecha final debe ser posterior al inicio",
      });
  });
