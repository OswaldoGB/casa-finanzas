"use client";

import { useState } from "react";
import { toast } from "sonner";
import { csvText, type ExportRow } from "../format";

export function ExportButtons({
  target,
  filters = {},
  rows,
}: {
  target: string;
  filters?: Record<string, string>;
  rows?: ExportRow[];
}) {
  const [pending, setPending] = useState(false);
  async function download(format: string) {
    setPending(true);
    try {
      let file: Blob;
      if (rows) {
        file =
          format === "csv"
            ? new Blob([csvText(rows)], { type: "text/csv;charset=utf-8" })
            : new Blob(
                [
                  await (
                    await import("../workbook")
                  ).excelFile([{ name: "Proyecciones", rows }]),
                ],
                {
                  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                },
              );
      } else {
        const params = new URLSearchParams(window.location.search);
        Object.entries(filters).forEach(([key, value]) =>
          params.set(key, value),
        );
        params.set("table", target);
        params.set("format", format);
        const response = await fetch(`/api/export?${params}`);
        if (!response.ok || !response.headers.get("content-disposition")) {
          const detail = await response.json().catch(() => null);
          throw new Error(
            detail?.error ?? "No se pudo descargar. Revisa tu sesión.",
          );
        }
        file = await response.blob();
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `casa-finanzas-${target}.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo descargar.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-wrap gap-2" aria-label="Exportar datos">
      {["csv", "xlsx"].map((format) => (
        <button
          key={format}
          type="button"
          disabled={pending}
          onClick={() => download(format)}
          className="bg-secondary text-secondary-foreground rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50"
        >
          {pending
            ? "Preparando…"
            : format === "csv"
              ? "Descargar CSV"
              : "Descargar Excel"}
        </button>
      ))}
    </div>
  );
}
