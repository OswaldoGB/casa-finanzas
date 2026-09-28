"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/features/attachments/image";
import { preparePhoto, savePhoto } from "../actions";

export function InventoryPhoto({
  id,
  canEdit,
}: {
  id: string;
  canEdit: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function upload(file: File) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 20 * 1024 * 1024
    ) {
      setError("Elige una foto JPG, PNG o WebP de hasta 20 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const blob = await compressImage(file);
      if (!blob || blob.size > 10 * 1024 * 1024)
        throw new Error("No se pudo comprimir la foto.");
      const path = await preparePhoto(id);
      const supabase = createClient();
      const result = await supabase.storage
        .from("inventory")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (result.error) throw new Error("No se pudo subir la foto.");
      try {
        await savePhoto(id, path, blob.size);
      } catch (cause) {
        await supabase.storage.from("inventory").remove([path]);
        throw cause;
      }
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo subir la foto.",
      );
    } finally {
      setBusy(false);
    }
  }
  return canEdit ? (
    <div>
      <label className="block text-sm">
        {busy ? "Subiendo foto…" : "Agregar o cambiar foto"}
        <input
          aria-label="Foto del artículo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          className="mt-2 block w-full text-xs"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void upload(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      )}
    </div>
  ) : null;
}
