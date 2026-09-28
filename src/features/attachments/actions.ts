"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/features/permissions/queries";
import { attachmentIdSchema, uploadPathSchema, uploadSchema } from "./schemas";

async function requireTransaction(
  transactionId: string,
  level: "view" | "edit",
) {
  const access = await requireModule("transactions", level);
  const { data, error } = await access.supabase
    .from("transactions")
    .select("id")
    .eq("id", transactionId)
    .eq("household_id", access.profile.household_id)
    .maybeSingle();
  if (error || !data) throw new Error("Movimiento no encontrado.");
  return access;
}

export async function prepareAttachmentUpload(input: {
  transactionId: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      "El comprobante debe ser una imagen JPG/WebP o PDF de hasta 10 MB.",
    );
  const { profile } = await requireTransaction(
    parsed.data.transactionId,
    "edit",
  );
  const extension =
    parsed.data.mimeType === "application/pdf"
      ? "pdf"
      : parsed.data.mimeType === "image/webp"
        ? "webp"
        : "jpg";
  return {
    path: `${profile.household_id}/${parsed.data.transactionId}/${randomUUID()}.${extension}`,
  };
}

export async function saveAttachment(input: {
  transactionId: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const parsed = uploadSchema.safeParse(input);
  const path = uploadPathSchema.safeParse(input.path);
  if (!parsed.success || !path.success)
    throw new Error("Comprobante inválido.");
  const { supabase, profile } = await requireTransaction(
    parsed.data.transactionId,
    "edit",
  );
  const expectedPrefix = `${profile.household_id}/${parsed.data.transactionId}/`;
  if (!path.data.startsWith(expectedPrefix))
    throw new Error("Comprobante inválido.");
  const suffix =
    parsed.data.mimeType === "application/pdf"
      ? ".pdf"
      : parsed.data.mimeType === "image/webp"
        ? ".webp"
        : ".jpg";
  if (!path.data.endsWith(suffix))
    throw new Error("El formato no coincide con el archivo.");
  const { data: file, error: fileError } = await supabase.storage
    .from("receipts")
    .info(path.data);
  if (
    fileError ||
    !file ||
    file.size !== parsed.data.sizeBytes ||
    file.contentType !== parsed.data.mimeType
  )
    throw new Error("No se pudo verificar el archivo subido.");
  const { data, error } = await supabase
    .from("attachments")
    .insert({
      household_id: profile.household_id,
      created_by: profile.id,
      transaction_id: parsed.data.transactionId,
      storage_path: path.data,
      mime_type: parsed.data.mimeType,
      size_bytes: parsed.data.sizeBytes,
    })
    .select("id, transaction_id, mime_type, size_bytes, created_at")
    .single();
  if (error || !data) throw new Error("No se pudo guardar el comprobante.");
  revalidatePath(`/transactions/${parsed.data.transactionId}`);
  return data;
}

export async function getAttachmentUrl(attachmentId: string) {
  const parsed = attachmentIdSchema.safeParse(attachmentId);
  if (!parsed.success) throw new Error("Comprobante inválido.");
  const { supabase, profile } = await requireModule("transactions", "view");
  const { data, error } = await supabase
    .from("attachments")
    .select("storage_path, transaction_id")
    .eq("id", parsed.data)
    .eq("household_id", profile.household_id)
    .maybeSingle();
  if (error || !data) throw new Error("Comprobante no encontrado.");
  const { data: signed, error: signError } = await supabase.storage
    .from("receipts")
    .createSignedUrl(data.storage_path, 60);
  if (signError || !signed) throw new Error("No se pudo abrir el comprobante.");
  return signed.signedUrl;
}

export async function deleteAttachment(attachmentId: string) {
  const parsed = attachmentIdSchema.safeParse(attachmentId);
  if (!parsed.success) throw new Error("Comprobante inválido.");
  const { supabase, profile } = await requireModule("transactions", "edit");
  const { data, error } = await supabase
    .from("attachments")
    .select("storage_path, transaction_id")
    .eq("id", parsed.data)
    .eq("household_id", profile.household_id)
    .maybeSingle();
  if (error || !data) throw new Error("Comprobante no encontrado.");
  const { error: storageError } = await supabase.storage
    .from("receipts")
    .remove([data.storage_path]);
  if (storageError) throw new Error("No se pudo borrar el archivo.");
  const { error: rowError } = await supabase
    .from("attachments")
    .delete()
    .eq("id", parsed.data)
    .eq("household_id", profile.household_id);
  if (rowError)
    throw new Error("No se pudo borrar el registro del comprobante.");
  revalidatePath(`/transactions/${data.transaction_id}`);
}
