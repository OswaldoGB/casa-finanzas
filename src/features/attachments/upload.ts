import { createClient } from "@/lib/supabase/client";
import { prepareAttachmentUpload, saveAttachment } from "./actions";
import { compressImage } from "./image";
import { MAX_FILE_BYTES } from "./schemas";

export function validateReceipt(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      file.type,
    )
  )
    throw new Error("Selecciona una imagen JPG, PNG, WebP o un PDF.");
  if (file.size < 1 || file.size > 20 * 1024 * 1024)
    throw new Error("El archivo debe pesar entre 1 byte y 20 MB.");
}

export async function uploadReceipt(transactionId: string, file: File) {
  validateReceipt(file);
  const prepared =
    file.type === "application/pdf" ? file : await compressImage(file);
  if (prepared.size < 1 || prepared.size > MAX_FILE_BYTES)
    throw new Error("El comprobante debe pesar 10 MB o menos.");
  const values = {
    transactionId,
    mimeType: prepared.type,
    sizeBytes: prepared.size,
  };
  const { path } = await prepareAttachmentUpload(values);
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, prepared, { contentType: prepared.type, upsert: false });
  if (error) throw new Error("No se pudo subir el comprobante.");
  try {
    return await saveAttachment({ ...values, path });
  } catch (cause) {
    await supabase.storage.from("receipts").remove([path]);
    throw cause;
  }
}
