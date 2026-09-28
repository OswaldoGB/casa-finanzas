import { z } from "zod";

const name = z
  .string()
  .trim()
  .min(1, "Escribe el nombre")
  .max(80, "Máximo 80 caracteres");
const optionalId = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.string().uuid().nullable(),
);

export const categorySchema = z.object({
  name,
  type: z.enum(["income", "expense"]),
  parentId: optionalId.optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
  icon: z.string().trim().min(1).max(40),
});

export const paymentMethodSchema = z.object({
  name,
  type: z.enum(["cash", "debit", "credit", "transfer", "other"]),
  accountId: optionalId,
});
