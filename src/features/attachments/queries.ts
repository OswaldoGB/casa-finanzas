import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { transactionIdSchema } from "./schemas";

export async function getAttachments(transactionId: string) {
  const parsed = transactionIdSchema.safeParse(transactionId);
  if (!parsed.success) return [];
  const { supabase, profile } = await requireModule("transactions", "view");
  const { data, error } = await supabase
    .from("attachments")
    .select("id, transaction_id, mime_type, size_bytes, created_at")
    .eq("household_id", profile.household_id)
    .eq("transaction_id", parsed.data)
    .order("created_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los comprobantes.");
  return data;
}

export type AttachmentSummary = Awaited<
  ReturnType<typeof getAttachments>
>[number];
