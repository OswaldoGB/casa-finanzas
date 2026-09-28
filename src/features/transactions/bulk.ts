import { z } from "zod";
import { transactionIdSchema } from "./schemas";

export const bulkSelectionSchema = z
  .array(transactionIdSchema)
  .min(1)
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length);

export function canRecategorize(
  movements: { type: string; status: string }[],
  categoryType: "income" | "expense",
) {
  return (
    movements.length > 0 &&
    movements.every(
      (movement) =>
        movement.status === "posted" && movement.type === categoryType,
    )
  );
}
