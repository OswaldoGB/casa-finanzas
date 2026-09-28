import { canAccess, type PermissionMap } from "../permissions/modules";

const targets = [
  {
    module: "accounts",
    table: "accounts",
    column: "name",
    label: "Cuenta",
    path: "/accounts",
  },
  {
    module: "transactions",
    table: "transactions",
    column: "description",
    label: "Movimiento",
    path: "/transactions",
  },
  {
    module: "inventory",
    table: "inventory_items",
    column: "name",
    label: "Inventario",
    path: "/inventory",
  },
  {
    module: "projects",
    table: "projects",
    column: "name",
    label: "Proyecto",
    path: "/projects",
  },
  {
    module: "shopping_lists",
    table: "shopping_lists",
    column: "name",
    label: "Lista",
    path: "/lists",
  },
  {
    module: "shopping",
    table: "shopping_items",
    column: "name",
    label: "Compra próxima",
    path: "/shopping",
  },
  {
    module: "loans",
    table: "loans",
    column: "debtor",
    label: "Préstamo",
    path: "/loans",
  },
  {
    module: "savings",
    table: "savings_goals",
    column: "name",
    label: "Ahorro",
    path: "/savings",
  },
] as const;

export type SearchResult = {
  id: string;
  title: string;
  label: string;
  href: string;
};

export function allowedSearchTargets(
  role: "admin" | "member",
  permissions: PermissionMap,
) {
  return targets.filter((target) =>
    canAccess(role, permissions, target.module, "view"),
  );
}

export function normalizeSearch(value: string) {
  return value
    .replace(/[%_\\]/g, "")
    .trim()
    .slice(0, 80);
}
