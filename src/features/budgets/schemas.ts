import { z } from "zod";

export const budgetMonthSchema = z
  .string()
  .date("Mes inválido")
  .refine((value) => value.endsWith("-01"), "Selecciona el primer día del mes");
export const budgetIdSchema = z.string().uuid("Presupuesto inválido");
export const budgetSchema = z.object({
  month: budgetMonthSchema,
  category_id: z.string().uuid("Elige una categoría"),
  amount: z
    .string()
    .trim()
    .regex(
      /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/,
      "Escribe un monto válido con hasta dos decimales",
    )
    .transform(Number),
  carry_over: z.enum(["on", "off"]).transform((value) => value === "on"),
});
export const budgetSnapshotSchema = z.array(
  z.object({
    id: z.string().uuid(),
    category_id: z.string().uuid(),
    name: z.string(),
    color: z.string(),
    amount: z.number(),
    carry_over: z.boolean(),
    carried: z.number(),
    available: z.number(),
    spent: z.number(),
  }),
);
export type BudgetSummary = z.infer<typeof budgetSnapshotSchema>[number];

export function budgetProgress(available: number, spent: number) {
  const percent =
    available > 0 ? (spent / available) * 100 : spent > 0 ? 100 : 0;
  return {
    percent,
    remaining: Math.round((available - spent) * 100) / 100,
    status:
      percent >= 100
        ? "exceeded"
        : percent >= 90
          ? "danger"
          : percent >= 70
            ? "warning"
            : "normal",
  } as const;
}
