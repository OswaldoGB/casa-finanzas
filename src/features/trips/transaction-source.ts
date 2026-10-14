import { z } from "zod";
const uuid = z.string().uuid();
export const travelTransactionSourceSchema = z
  .object({
    purchase: z
      .object({ id: uuid, list_id: uuid, store_name: z.string() })
      .nullable(),
    list: z.object({ id: uuid, name: z.string() }).nullable(),
    project: z
      .object({ id: uuid, name: z.string(), is_trip: z.boolean() })
      .nullable(),
    cost: z.object({ id: uuid, name: z.string() }).nullable(),
    items: z.array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        unit: z.string(),
        real_price: z.number().nullable(),
      }),
    ),
    activities: z.array(z.object({ title: z.string(), date: z.string() })),
  })
  .nullable();
export type TravelTransactionSource = z.infer<
  typeof travelTransactionSourceSchema
>;
