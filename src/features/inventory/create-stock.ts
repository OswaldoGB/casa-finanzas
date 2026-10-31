import { z } from "zod";

export const initialStockSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("simple") }),
  z.object({
    mode: z.literal("packages"),
    package_name: z.string().trim().min(1).max(60),
    package_count: z.coerce.number().int().min(1).max(1000),
    package_capacity: z.coerce.number().int().min(1).max(1000000),
    group_name: z.string().trim().max(60),
  }),
]);
