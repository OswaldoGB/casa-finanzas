"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ExportButtons } from "./export-buttons";

export function DataDownloads({ month }: { month: string }) {
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [pending, setPending] = useState(false);
  async function download(format: "json" | "xlsx") {
    setPending(true);
    try {
      const response = await fetch(
        `/api/backup?${new URLSearchParams({ format, month: selectedMonth })}`,
      );
      if (!response.ok || !response.headers.get("content-disposition")) {
        const detail = await response.json().catch(() => null);
        throw new Error(
          detail?.error ?? "No se pudo descargar. Revisa tu sesión.",
        );
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download =
        format === "json"
          ? "respaldo-casa-finanzas.json"
          : `casa-finanzas-${selectedMonth}.xlsx`;
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
    <section
      className="bg-card space-y-4 rounded-2xl border p-5 sm:p-6"
      aria-labelledby="downloads-title"
    >
      <h2 id="downloads-title" className="text-lg font-semibold">
        Descargas y respaldo
      </h2>
      <p className="text-muted-foreground text-sm">
        Guarda los datos de tu hogar. El respaldo JSON incluye los registros y
        permisos; las fotos y los comprobantes se conservan por separado y las
        contraseñas no se incluyen.
      </p>
      <button
        disabled={pending}
        onClick={() => download("json")}
        type="button"
        className="bg-secondary text-secondary-foreground rounded-lg px-4 py-2 text-sm disabled:opacity-50"
      >
        {pending ? "Preparando…" : "Descargar respaldo JSON"}
      </button>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Mes del reporte
          <input
            type="month"
            required
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="bg-background rounded-lg border px-3 py-2"
          />
        </label>
        <button
          disabled={pending || !selectedMonth}
          onClick={() => download("xlsx")}
          type="button"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          Descargar reporte mensual Excel
        </button>
      </div>
      <p className="text-muted-foreground text-xs">
        Movimientos, presupuestos y gastos por categoría corresponden al mes
        elegido; las demás hojas muestran el estado actual.
      </p>
      <details className="space-y-3 rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Descargar catálogos y recurrentes
        </summary>
        {[
          ["categories", "Categorías"],
          ["payment_methods", "Métodos de pago"],
          ["recurring", "Movimientos recurrentes"],
        ].map(([target, label]) => (
          <div key={target} className="space-y-2 pt-3">
            <p className="text-sm">{label}</p>
            <ExportButtons target={target} />
          </div>
        ))}
      </details>
    </section>
  );
}
