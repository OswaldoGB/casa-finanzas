import { z } from "zod";

export const purchaseItemsSchema = z
  .array(
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(120),
      quantity: z.number().int().min(1).max(100000),
      unitCents: z.number().int().min(0).max(100000000000),
    }),
  )
  .max(100)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
  );

export type PurchaseItem = z.infer<typeof purchaseItemsSchema>[number];

export function purchaseTotalCents(item: PurchaseItem) {
  return item.quantity * item.unitCents;
}

export function readPurchaseItems(value: unknown): PurchaseItem[] {
  const result = purchaseItemsSchema.safeParse(value);
  return result.success ? result.data : [];
}
