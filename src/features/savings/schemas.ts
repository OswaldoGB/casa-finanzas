import { z } from "zod";
import { moneyInput, optionalDate, optionalId } from "../loans/schemas";

export const goalSchema = z
  .object({
    name: z.string().trim().min(1, "Escribe un nombre").max(100),
    type: z.enum(["goal", "provision"]),
    target_amount: moneyInput,
    target_date: optionalDate,
    account_id: optionalId,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    icon: z.enum(["piggy-bank", "plane", "car", "shield", "house"]),
    cadence: z
      .union([z.enum(["quincenal", "mensual"]), z.literal("")])
      .optional()
      .transform((v) => v || null),
    cycle_start: optionalDate,
  })
  .transform((v) => (v.type === "provision" ? v : { ...v, cadence: null }))
  .refine((v) => !v.cadence || v.target_date, {
    message: "Elige para cuándo lo necesitas",
    path: ["target_date"],
  })
  .refine((v) => !v.cadence || !v.cycle_start || !v.target_date || v.target_date > v.cycle_start, {
    message: "La fecha debe ser posterior a hoy",
    path: ["target_date"],
  });
export const restartSchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid("Elige el gasto de la compra"),
});
export const goalOperationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["goal_contribution", "goal_withdrawal"]),
  amount: moneyInput,
  date: z.string().date(),
  counterparty_account_id: optionalId,
});
export const savingsSnapshotSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.enum(["goal", "provision"]),
    target_amount: z.number(),
    target_date: z.string().nullable(),
    account_id: z.string().uuid().nullable(),
    color: z.string(),
    icon: z.string(),
    balance: z.number(),
    cadence: z.enum(["quincenal", "mensual"]).nullable().optional().default(null),
    cycle_start: z.string().nullable().optional().default(null),
    last_purchase_date: z.string().nullable().optional().default(null),
    last_contribution_date: z.string().nullable().optional().default(null),
  }),
);
export type SavingsGoal = z.infer<typeof savingsSnapshotSchema>[number];

export function suggestedMonthly(
  target: number,
  balance: number,
  today: string,
  targetDate: string | null,
) {
  const missing = Math.max(0, target - balance);
  if (!targetDate || !missing) return missing === 0 ? 0 : null;
  const start = new Date(`${today}T12:00:00Z`),
    end = new Date(`${targetDate}T12:00:00Z`);
  const months = Math.max(
    1,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      end.getUTCMonth() -
      start.getUTCMonth() +
      (end.getUTCDate() > start.getUTCDate() ? 1 : 0),
  );
  return Math.ceil((missing * 100) / months) / 100;
}
