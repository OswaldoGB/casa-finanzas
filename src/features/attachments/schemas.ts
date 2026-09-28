import { z } from "zod";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const transactionIdSchema = z.string().uuid("Movimiento inválido");
export const attachmentIdSchema = z.string().uuid("Comprobante inválido");

export const uploadSchema = z.object({
  transactionId: transactionIdSchema,
  mimeType: z.enum(["image/jpeg", "image/webp", "application/pdf"]),
  sizeBytes: z.number().int().min(1).max(MAX_FILE_BYTES),
});

export const uploadPathSchema = z
  .string()
  .regex(
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|webp|pdf)$/,
    "Ruta de comprobante inválida",
  );
