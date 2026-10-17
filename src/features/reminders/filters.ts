import { z } from "zod";
import { day } from "./schemas";
export const reminderFilters = z.object({
  view: z
    .enum(["agenda", "calendar", "notes", "completed", "paused", "archived"])
    .catch("agenda"),
  category: z.union([z.string().uuid(), z.literal("")]).catch(""),
  reference: z.string().max(80).catch(""),
  q: z.string().max(120).catch(""),
  privacy: z.enum(["", "personal", "household"]).catch(""),
  date: day.optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});
export type ReminderFilters = z.infer<typeof reminderFilters>;
