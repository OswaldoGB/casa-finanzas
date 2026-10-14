import { z } from "zod";
import { amount } from "../projects/schemas";
import type { Json } from "../../lib/supabase/database.types";
export const uuid = z.string().uuid();
export const optionalId = z
  .union([z.literal(""), z.literal("none"), uuid])
  .transform((v) => (v && v !== "none" ? v : null));
export const quantity = z.coerce
  .number()
  .finite()
  .min(0.001)
  .max(9999999.999)
  .refine(
    (v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 0.001,
    "Usa hasta tres decimales",
  );
export const nullableMoney = z
  .union([z.literal(""), amount])
  .transform((v) => (v === "" ? null : v));
const name = z.string().trim().min(1, "Escribe un nombre").max(100);
export const tripSchema = z
  .object({
    name,
    budget: amount,
    start_date: z.string().date(),
    end_date: z.string().date(),
    status: z.enum(["planned", "active", "completed", "archived"]),
    destination: z.string().trim().max(200),
    participants: z.string().trim().max(500),
    description: z.string().trim().max(2000),
  })
  .refine((v) => v.end_date >= v.start_date, {
    message: "El final debe ser igual o posterior al inicio",
    path: ["end_date"],
  });
export const activityKinds = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snacks",
  outing: "Salida",
  experience: "Experiencia",
  other: "Otro",
} as const;
export const activitySchema = z.object({
  date: z.string().date(),
  kind: z.enum([
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "outing",
    "experience",
    "other",
  ]),
  time: z
    .union([z.literal(""), z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)])
    .transform((v) => v || null),
  title: name,
  location: z.string().trim().max(200),
  notes: z.string().trim().max(2000),
});
export const costLineSchema = z.object({
  is_settled: z.preprocess(
    (value) => value === true || value === "on",
    z.boolean(),
  ),
  name,
  quantity,
  unit: z.string().trim().max(30),
  estimated_price: nullableMoney,
  activity_id: optionalId,
  category_id: optionalId,
});
export const ingredientSchema = z
  .object({
    activity_id: uuid,
    item_id: optionalId,
    name: z.string().trim().max(100),
    quantity,
    unit: z.string().trim().max(30),
    estimated_price: nullableMoney,
  })
  .refine((data) => Boolean(data.item_id) || data.name.length > 0, {
    message: "Escribe el nombre del producto",
    path: ["name"],
  });
export const expenseSchema = z.object({
  is_settled: z.preprocess(
    (value) => value === true || value === "on",
    z.boolean(),
  ),
  line_id: uuid,
  amount: amount.refine((v) => v > 0, "Monto mayor que cero"),
  date: z.string().date(),
  account_id: uuid,
  category_id: uuid,
  payment_method_id: optionalId,
  request_key: uuid,
});
const audit = z.object({
  id: uuid,
  household_id: uuid,
  created_by: uuid,
  created_at: z.string(),
  updated_at: z.string(),
});
const project = audit.extend({
  name: z.string(),
  description: z.string(),
  budget: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  status: z.enum(["planned", "active", "completed", "archived"]),
});
export const tripSnapshotSchema = z.object({
  project,
  detail: audit.extend({
    project_id: uuid,
    destination: z.string(),
    participants: z.string(),
  }),
  activities: z.array(
    audit.extend({
      project_id: uuid,
      date: z.string(),
      kind: z.string(),
      time: z.string().nullable(),
      title: z.string(),
      location: z.string(),
      notes: z.string(),
      sort_order: z.number(),
    }),
  ),
  costLines: z.array(
    audit.extend({
      is_settled: z.boolean(),
      project_id: uuid,
      activity_id: uuid.nullable(),
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      estimated_price: z.number().nullable(),
      category_id: uuid.nullable(),
    }),
  ),
  costTransactions: z.array(
    audit.extend({
      project_id: uuid,
      cost_line_id: uuid,
      transaction_id: uuid,
    }),
  ),
  activityItems: z.array(
    audit.extend({
      project_id: uuid,
      activity_id: uuid,
      item_id: uuid,
      required_quantity: z.number(),
      unit: z.string(),
    }),
  ),
  lists: z.array(
    audit.extend({
      name: z.string(),
      store: z.string(),
      budget: z.number().nullable(),
      status: z.string(),
      transaction_id: uuid.nullable(),
      completed_at: z.string().nullable(),
      project_id: uuid.nullable(),
    }),
  ),
  groups: z.array(
    audit.extend({
      list_id: uuid,
      name: z.string(),
      sort_order: z.number(),
      is_archived: z.boolean(),
    }),
  ),
  items: z.array(
    audit.extend({
      list_id: uuid,
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      estimated_price: z.number().nullable(),
      real_price: z.number().nullable(),
      checked: z.boolean(),
      sort_order: z.number(),
      notes: z.string(),
      group_id: uuid.nullable(),
      purchase_id: uuid.nullable(),
      resolution: z.string(),
    }),
  ),
  purchases: z.array(
    audit.extend({
      list_id: uuid,
      group_id: uuid.nullable(),
      store_name: z.string(),
      transaction_id: uuid,
      request_key: uuid,
      request_payload: z.custom<Json>(),
    }),
  ),
  transactions: z.array(
    z.object({
      id: uuid,
      amount: z.number(),
      date: z.string(),
      description: z.string(),
      status: z.string(),
      created_by: uuid,
    }),
  ),
  shoppingSummary: z.object({
    estimated: z.number(),
    pending: z.number(),
    missing: z.number(),
  }),
});
export type TripData = z.infer<typeof tripSnapshotSchema>;
export type TripSnapshot = TripData & {
  canEdit: boolean;
  canEditLists: boolean;
  canViewLists: boolean;
  canEditTransactions: boolean;
  canViewTransactions: boolean;
  today: string;
  options: {
    accounts: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    methods: { id: string; name: string }[];
    expenses: {
      id: string;
      description: string;
      date: string;
      amount: number;
    }[];
  };
};
