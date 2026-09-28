import { unstable_rethrow } from "next/navigation";
import {
  ExportError,
  exportRows,
  isExportTarget,
  targets,
} from "@/features/exports/data";
import { csvText } from "@/features/exports/format";
import { excelFile } from "@/features/exports/workbook";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const target = params.get("table") ?? "";
  const format = params.get("format") ?? "csv";
  if (!isExportTarget(target) || !["csv", "xlsx"].includes(format))
    return Response.json({ error: "Descarga no válida." }, { status: 400 });
  try {
    const rows = await exportRows(target, params);
    const body =
      format === "csv"
        ? csvText(rows)
        : await excelFile([{ name: targets[target].label, rows }]);
    return new Response(body, {
      headers: {
        "Content-Type":
          format === "csv"
            ? "text/csv; charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="casa-finanzas-${target}.${format}"`,
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
            : "No se pudo preparar la descarga.",
      },
      { status: error instanceof ExportError ? error.status : 500 },
    );
  }
}
