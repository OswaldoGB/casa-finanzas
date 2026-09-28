import { z } from "zod";

const amount = z.number();
const named = { id: z.string(), name: z.string() };
export const analyticsSnapshotSchema = z.object({
  totals: z.object({ income: amount, expense: amount }),
  categories: z.array(z.object({ ...named, color: z.string(), amount })),
  methods: z.array(z.object({ ...named, amount })),
  users: z.array(z.object({ ...named, income: amount, expense: amount })),
  projects: z.array(z.object({ ...named, amount })),
  trend: z.array(
    z.object({ month: z.string().date(), income: amount, expense: amount }),
  ),
  netWorth: z.array(z.object({ month: z.string().date(), balance: amount })),
  upcoming: z.array(
    z.object({
      ...named,
      date: z.string().date(),
      amount,
      cashImpact: amount,
      repaymentCardId: z.string().uuid().nullable(),
      kind: z.literal("recurring"),
    }),
  ),
});

export function reportDateRange(today: string, from?: string, to?: string) {
  const date = z.string().date();
  const end = date.safeParse(to).success ? to! : today;
  const start = date.safeParse(from).success ? from! : `${end.slice(0, 7)}-01`;
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}
