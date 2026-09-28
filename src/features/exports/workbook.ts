import { cellValue, type ExportRow } from "./format";

export async function excelFile(sheets: { name: string; rows: ExportRow[] }[]) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Casa & Finanzas";
  workbook.created = new Date();
  for (const { name, rows } of sheets) {
    const sheet = workbook.addWorksheet(name.slice(0, 31));
    const keys = [...new Set(rows.flatMap(Object.keys))];
    sheet.columns = keys.map((key) => ({ header: key, key, width: 24 }));
    rows.forEach((row) =>
      sheet.addRow(
        Object.fromEntries(keys.map((key) => [key, cellValue(row[key])])),
      ),
    );
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    if (keys.length) {
      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: keys.length },
      };
    }
  }
  // ExcelJS declara Buffer como ArrayBuffer; en Node devuelve un Uint8Array.
  const bytes = (await workbook.xlsx.writeBuffer()) as unknown as Uint8Array;
  return new Uint8Array(bytes).buffer;
}
