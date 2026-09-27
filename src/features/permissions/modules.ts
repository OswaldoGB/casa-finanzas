export const MODULE_NAMES = [
  "dashboard",
  "accounts",
  "transactions",
  "budgets",
  "projections",
  "reports",
  "inventory",
  "shopping",
  "shopping_lists",
  "projects",
  "loans",
  "savings",
] as const;

export type ModuleName = (typeof MODULE_NAMES)[number];
export type PermissionLevel = "none" | "view" | "edit";
export type PermissionMap = Partial<Record<ModuleName, PermissionLevel>>;

const labels: Record<ModuleName, string> = {
  dashboard: "Inicio",
  accounts: "Cuentas",
  transactions: "Movimientos",
  budgets: "Presupuestos",
  projections: "Proyecciones",
  reports: "Reportes",
  inventory: "Inventario",
  shopping: "Compras próximas",
  shopping_lists: "Listas de compra",
  projects: "Proyectos",
  loans: "Préstamos",
  savings: "Ahorros",
};

export const MODULES = MODULE_NAMES.map((name) => ({
  name,
  label: labels[name],
}));

export function canAccess(
  role: "admin" | "member",
  permissions: PermissionMap,
  module: ModuleName,
  required: "view" | "edit",
): boolean {
  if (role === "admin") return true;
  const level = permissions[module] ?? "none";
  return level === "edit" || (level === "view" && required === "view");
}
