"use client";

import { useRef, useState } from "react";
import { FileImage, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  deleteAttachment,
  getAttachmentUrl,
  prepareAttachmentUpload,
  saveAttachment,
} from "../actions";
import type { AttachmentSummary } from "../queries";
import { MAX_FILE_BYTES } from "../schemas";

import { compressImage } from "../image";

export function AttachmentsPanel({
  transactionId,
  initialAttachments,
  canEdit,
}: {
  transactionId: string;
  initialAttachments: AttachmentSummary[];
  canEdit: boolean;
}) {
  const [items, setItems] = useState(initialAttachments);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.type,
      )
    ) {
      setError("Selecciona una imagen JPG, PNG, WebP o un PDF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("El archivo original supera 20 MB.");
      return;
    }
    setBusy(true);
    try {
      const prepared =
        file.type === "application/pdf" ? file : await compressImage(file);
      if (prepared.size < 1 || prepared.size > MAX_FILE_BYTES)
        throw new Error("El comprobante debe pesar 10 MB o menos.");
      const { path } = await prepareAttachmentUpload({
        transactionId,
        mimeType: prepared.type,
        sizeBytes: prepared.size,
      });
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, prepared, { contentType: prepared.type, upsert: false });
      if (uploadError) throw new Error("No se pudo subir el comprobante.");
      try {
        const saved = await saveAttachment({
          transactionId,
          path,
          mimeType: prepared.type,
          sizeBytes: prepared.size,
        });
        setItems((current) => [saved, ...current]);
        router.refresh();
      } catch (saveError) {
        await supabase.storage.from("receipts").remove([path]);
        throw saveError;
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo adjuntar el comprobante.",
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function open(id: string) {
    setError("");
    const tab = window.open("", "_blank");
    try {
      const url = await getAttachmentUrl(id);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (cause) {
      tab?.close();
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo abrir el comprobante.",
      );
    }
  }

  async function remove(id: string) {
    setError("");
    setBusy(true);
    try {
      await deleteAttachment(id);
      setItems((current) => current.filter((item) => item.id !== id));
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo borrar el comprobante.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="bg-card space-y-4 rounded-2xl border p-5 sm:p-6"
      aria-labelledby="attachments-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="attachments-title" className="font-semibold">
            Comprobantes
          </h2>
          <p className="text-muted-foreground text-xs">
            Imágenes comprimidas y PDF, hasta 10 MB.
          </p>
        </div>
        {canEdit && (
          <label className="border-input hover:bg-accent focus-within:ring-ring inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium focus-within:ring-2">
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Paperclip className="size-4" aria-hidden />
            )}
            {busy ? "Subiendo…" : "Adjuntar"}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={busy}
              className="sr-only"
              aria-label="Adjuntar comprobante"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </label>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Sin comprobantes adjuntos.
        </p>
      ) : (
        <ul className="divide-border divide-y rounded-xl border">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
              {item.mime_type === "application/pdf" ? (
                <FileText
                  className="text-muted-foreground size-5 shrink-0"
                  aria-hidden
                />
              ) : (
                <FileImage
                  className="text-muted-foreground size-5 shrink-0"
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={() => void open(item.id)}
                className="focus-visible:ring-ring min-w-0 flex-1 truncate text-left text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                Comprobante {items.length - index} ·{" "}
                {item.mime_type === "application/pdf" ? "PDF" : "Imagen"}
              </button>
              <span className="text-muted-foreground text-xs tabular-nums">
                {Math.ceil(item.size_bytes / 1024)} KB
              </span>
              {canEdit && (
                <ConfirmDialog
                  title="¿Borrar este comprobante?"
                  description="El archivo adjunto se eliminará permanentemente."
                  confirmLabel="Borrar comprobante"
                  trigger={
                    <button
                      type="button"
                      disabled={busy}
                      aria-label="Borrar comprobante"
                      className="text-muted-foreground hover:text-destructive focus-visible:ring-ring rounded p-1.5 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  }
                  actionProps={{
                    onClick: () => void remove(item.id),
                    disabled: busy,
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
