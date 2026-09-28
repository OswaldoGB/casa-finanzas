import "server-only";
import { z } from "zod";
import { getAccess } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { getBudgets } from "@/features/budgets/queries";
import { getLoans } from "@/features/loans/queries";
import { getSavings } from "@/features/savings/queries";
import { getProjects } from "@/features/projects/queries";
import { getAnalytics } from "@/features/analytics/queries";
import { collectPages, transactionLabels, type ExportRow } from "./format";
import { BACKUP_TABLES } from "./backup-tables";

export const targets = {
  categories: {
    table: "categories",
    module: "transactions",
    label: "Categorías",
  },
  payment_methods: {
    table: "payment_methods",
    module: "transactions",
    label: "Métodos de pago",
  },
  recurring: {
    table: "recurring_rules",
    module: "transactions",
    label: "Recurrentes",
  },
  accounts: { table: "accounts", module: "accounts", label: "Cuentas" },
  transactions: {
    table: "transactions",
    module: "transactions",
    label: "Movimientos",
  },
  budgets: { table: "budgets", module: "budgets", label: "Presupuestos" },
  inventory: {
    table: "inventory_items",
    module: "inventory",
    label: "Inventario",
  },
  shopping: { table: "shopping_items", module: "shopping", label: "Compras" },
  lists: { table: "shopping_lists", module: "shopping_lists", label: "Listas" },
  list_items: {
    table: "shopping_list_items",
    module: "shopping_lists",
    label: "Artículos de lista",
  },
  projects: { table: "projects", module: "projects", label: "Proyectos" },
  loans: { table: "loans", module: "loans", label: "Préstamos" },
  savings: { table: "savings_goals", module: "savings", label: "Ahorros" },
  reports: { table: "transactions", module: "reports", label: "Reportes" },
} as const;
export type ExportTarget = keyof typeof targets;
export function isExportTarget(value: string): value is ExportTarget {
  return Object.hasOwn(targets, value);
}
export class ExportError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const uuid = (value: string | null) =>
  value && z.string().uuid().safeParse(value).success;
const date = (value: string | null) =>
  value && z.string().date().safeParse(value).success;

export async function exportRows(
  target: ExportTarget,
  params: URLSearchParams,
): Promise<ExportRow[]> {
  const access = await getAccess();
  const config = targets[target];
  if (
    ["categories", "payment_methods", "recurring"].includes(target) &&
    access.profile.role !== "admin"
  )
    throw new ExportError(
      "La descarga de catálogos es exclusiva del administrador.",
      403,
    );
  if (
    !canAccess(access.profile.role, access.permissions, config.module, "view")
  )
    throw new ExportError("No tienes permiso para descargar este módulo.", 403);
  if (target === "budgets")
    return (await getBudgets(params.get("month") ?? undefined)).budgets;
  if (target === "loans") return (await getLoans()).loans;
  if (target === "savings") return (await getSavings()).goals;
  if (target === "projects")
    return (await getProjects()).projects.map((row) => {
      const exported: ExportRow = { ...row };
      delete exported.expenses;
      return exported;
    });
  if (target === "reports") {
    const data = await getAnalytics(
      "reports",
      params.get("from") ?? undefined,
      params.get("to") ?? undefined,
    );
    return [
      { sección: "Totales", ...data.totals, desde: data.from, hasta: data.to },
      ...data.categories.map((row) => ({
        sección: "Gastos por categoría",
        ...row,
      })),
      ...data.methods.map((row) => ({ sección: "Gastos por método", ...row })),
      ...data.users.map((row) => ({ sección: "Por usuario", ...row })),
      ...data.projects.map((row) => ({
        sección: "Gastos por proyecto",
        ...row,
      })),
      ...data.trend.map((row) => ({
        sección: "Tendencia de 12 meses",
        ...row,
      })),
      ...data.netWorth.map((row) => ({
        sección: "Patrimonio de 12 meses",
        ...row,
      })),
    ];
  }
  const rows = await collectPages(async (offset, size) => {
    let query = access.supabase
      .from(config.table)
      .select("*")
      .eq("household_id", access.profile.household_id)
      .order("id")
      .range(offset, offset + size - 1);
    if (target === "transactions") {
      for (const [filter, operator] of [
        ["from", "gte"],
        ["to", "lte"],
      ] as const) {
        const value = params.get(filter);
        if (date(value)) query = query[operator]("date", value!);
      }
      const type = params.get("type");
      if (type && ["income", "expense", "transfer"].includes(type))
        query = query.filter("type", "eq", type);
      const account = params.get("account");
      if (uuid(account))
        query = query.or(
          `account_id.eq.${account},destination_account_id.eq.${account}`,
        );
      for (const [filter, column] of [
        ["category", "category_id"],
        ["method", "payment_method_id"],
        ["user", "created_by"],
        ["project", "project_id"],
      ]) {
        const value = params.get(filter);
        if (uuid(value)) query = query.eq(column, value!);
      }
      const search = params
        .get("q")
        ?.trim()
        .replaceAll(/[%,()]/g, "")
        .slice(0, 80);
      if (search) query = query.ilike("description", `%${search}%`);
    }
    if (target === "inventory" && params.get("location"))
      query = query.filter("location", "eq", params.get("location")!);
    if (target === "shopping") {
      const status = params.get("status") ?? "pending";
      if (["pending", "bought", "discarded"].includes(status))
        query = query.filter("status", "eq", status);
      else throw new ExportError("Estado de compra no válido.", 400);
    }
    if (target === "list_items") {
      const list = params.get("list");
      if (!uuid(list))
        throw new ExportError("Selecciona una lista válida.", 400);
      query = query.filter("list_id", "eq", list!);
    }
    const { data, error } = await query;
    if (error)
      throw new ExportError(
        "No se pudieron leer los datos de la descarga.",
        500,
      );
    return (data ?? []).map((row) => ({ ...row }));
  });
  if (target === "accounts") {
    const balances = await access.supabase.rpc("account_balances");
    if (balances.error)
      throw new ExportError("No se pudieron calcular los saldos.", 500);
    const byId = new Map(
      (balances.data ?? []).map((row) => [row.account_id, Number(row.balance)]),
    );
    return rows.map((row) => ({ ...row, balance: byId.get(row.id) ?? 0 }));
  }
  if (target === "transactions") {
    const catalogs = await Promise.all(
      ["accounts", "categories", "payment_methods", "projects"].map(
        async (table) => {
          const configTable = table as
            "accounts" | "categories" | "payment_methods" | "projects";
          const values = await collectPages(async (offset, size) => {
            const result = await access.supabase
              .from(configTable)
              .select("id,name")
              .eq("household_id", access.profile.household_id)
              .order("id")
              .range(offset, offset + size - 1);
            if (result.error)
              throw new ExportError(
                "No se pudieron cargar los nombres para la descarga.",
                500,
              );
            return result.data ?? [];
          });
          return new Map(values.map((row) => [row.id, row.name]));
        },
      ),
    );
    const members = await access.supabase
      .from("profiles")
      .select("id,full_name")
      .eq("household_id", access.profile.household_id);
    if (members.error)
      throw new ExportError(
        "No se pudieron cargar los nombres de los miembros.",
        500,
      );
    const names = {
      accounts: catalogs[0],
      categories: catalogs[1],
      methods: catalogs[2],
      projects: catalogs[3],
      members: new Map(
        (members.data ?? []).map((row) => [row.id, row.full_name]),
      ),
    };
    return rows.map((row) => transactionLabels(row, names));
  }
  return rows;
}

export async function householdBackup() {
  const { supabase, profile } = await getAccess();
  if (profile.role !== "admin")
    throw new ExportError(
      "El respaldo completo es exclusivo del administrador.",
      403,
    );
  const entries = await Promise.all(
    BACKUP_TABLES.map(
      async (table) =>
        [
          table,
          await collectPages(async (offset, size) => {
            const result = await supabase
              .from(table)
              .select("*")
              .eq("household_id", profile.household_id)
              .order("id")
              .range(offset, offset + size - 1);
            if (result.error)
              throw new ExportError(
                "No se pudo preparar el respaldo completo.",
                500,
              );
            return result.data ?? [];
          }),
        ] as const,
    ),
  );
  const [household, permissions] = await Promise.all([
    supabase
      .from("households")
      .select("*")
      .eq("id", profile.household_id)
      .single(),
    supabase
      .from("module_permissions")
      .select("*")
      .eq("household_id", profile.household_id),
  ]);
  if (household.error || permissions.error)
    throw new ExportError("No se pudo completar el respaldo.", 500);
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    household: household.data,
    module_permissions: permissions.data,
    tables: Object.fromEntries(entries),
    files:
      "Fotos y comprobantes privados se conservan por separado; este JSON contiene sus rutas, no los archivos ni contraseñas.",
  };
}
