export type ExportRow = Record<string, unknown>;

export function transactionLabels(
  row: ExportRow,
  names: {
    accounts: Map<string, string>;
    categories: Map<string, string>;
    methods: Map<string, string>;
    members: Map<string, string>;
    projects: Map<string, string>;
  },
) {
  const lookup = (key: string, map: Map<string, string>) =>
    typeof row[key] === "string" ? (map.get(row[key]) ?? "") : "";
  return {
    ...row,
    cuenta: lookup("account_id", names.accounts),
    cuenta_destino: lookup("destination_account_id", names.accounts),
    categoría: lookup("category_id", names.categories),
    método: lookup("payment_method_id", names.methods),
    registrado_por: lookup("created_by", names.members),
    proyecto: lookup("project_id", names.projects),
  };
}

export async function collectPages<T>(
  load: (offset: number, size: number) => Promise<T[]>,
  size = 1000,
) {
  const result: T[] = [];
  for (let offset = 0; ; offset += size) {
    const page = await load(offset, size);
    result.push(...page);
    if (page.length < size) return result;
  }
}

export function cellValue(value: unknown): string | number | boolean {
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value == null) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
}

export function csvText(rows: ExportRow[]) {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const escape = (value: unknown) =>
    `"${String(cellValue(value)).replaceAll('"', '""')}"`;
  return (
    "\uFEFF" +
    [
      keys.map(escape).join(","),
      ...rows.map((row) => keys.map((key) => escape(row[key])).join(",")),
    ].join("\r\n")
  );
}
