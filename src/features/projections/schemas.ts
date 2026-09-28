import { z } from "zod";
export const projectionInputSchema = z.object({
  today: z.string().date(),
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      balance: z.number(),
      statement_closing_day: z.number().nullable(),
      payment_due_day: z.number().nullable(),
      statement_close: z.string().nullable(),
      statement_unpaid: z.number(),
    }),
  ),
  recurring: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["income", "expense", "transfer"]),
      amount: z.number(),
      account_id: z.string(),
      destination_account_id: z.string().nullable(),
      category_id: z.string().nullable(),
      frequency: z.enum(["weekly", "biweekly", "monthly", "yearly"]),
      interval_count: z.number().int().positive(),
      start_date: z.string().date(),
      end_date: z.string().date().nullable(),
      next_run_date: z.string().date(),
      mode: z.enum(["auto", "confirm"]),
    }),
  ),
  budgets: z.array(
    z.object({
      month: z.string().date(),
      rows: z.array(
        z.object({
          id: z.string(),
          category_id: z.string(),
          name: z.string(),
          color: z.string(),
          amount: z.number(),
          carry_over: z.boolean(),
          carried: z.number(),
          available: z.number(),
          spent: z.number(),
        }),
      ),
    }),
  ),
});
