import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { getAccess } from "@/features/permissions/queries";
import {
  ExportError,
  exportRows,
  householdBackup,
  targets,
  type ExportTarget,
} from "@/features/exports/data";
import { excelFile } from "@/features/exports/workbook";
import type { ExportRow } from "@/features/exports/format";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const access = await getAccess();
  if (access.profile.role !== "admin")
    return Response.json(
      { error: "Solo el administrador puede descargar respaldos." },
      { status: 403 },
    );
  const params = new URL(request.url).searchParams;
  const format = params.get("format") ?? "json";
  if (!["json", "xlsx"].includes(format))
    return Response.json({ error: "Formato no válido." }, { status: 400 });
  try {
    let body: string | ArrayBuffer;
    let filename = "respaldo-casa-finanzas.json";
    if (format === "json")
      body = JSON.stringify(await householdBackup(), null, 2);
    else {
      const month = params.get("month") ?? "";
      if (
        !/^\d{4}-\d{2}$/.test(month) ||
        !z.string().date().safeParse(`${month}-01`).success
      )
        return Response.json(
          { error: "Selecciona un mes válido." },
          { status: 400 },
        );
      const end = new Date(`${month}-01T00:00:00Z`);
      end.setUTCMonth(end.getUTCMonth() + 1);
      end.setUTCDate(0);
      const filters = new URLSearchParams({
        month,
        from: `${month}-01`,
        to: end.toISOString().slice(0, 10),
      });
      const keys: ExportTarget[] = [
        "transactions",
        "budgets",
        "reports",
        "accounts",
        "inventory",
        "shopping",
        "lists",
        "projects",
        "loans",
        "savings",
      ];
      const sheets: { name: string; rows: ExportRow[] }[] = await Promise.all(
        keys.map(async (key) => ({
          name: targets[key].label,
          rows: await exportRows(key, filters),
        })),
      );
      sheets.unshift({
        name: "Información",
        rows: [
          {
            mes: month,
            generado: new Date().toISOString(),
            alcance:
              "Movimientos, presupuestos y gastos por categoría del mes; demás hojas muestran el estado actual del hogar.",
          },
        ],
      });
      body = await excelFile(sheets);
      filename = `casa-finanzas-${month}.xlsx`;
    }
    return new Response(body, {
      headers: {
        "Content-Type":
          format === "json"
            ? "application/json; charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    return Response.json(
      {
        error:
          error instanceof ExportError
            ? error.message
            : "No se pudo preparar el respaldo.",
      },
      { status: error instanceof ExportError ? error.status : 500 },
    );
  }
}
