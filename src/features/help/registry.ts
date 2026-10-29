import { NAV, SETTINGS_ITEM } from "../../components/app-shell/nav";
import { canAccess, type PermissionMap } from "../permissions/modules";
import type { Manual } from "./types";

// Un manual por pantalla del menú; la clave es la ruta ("/accounts" → "accounts").
// Cada uno se descarga solo cuando se abre el panel de ayuda.
const LOADERS: Record<string, () => Promise<{ default: Manual }>> = {
  dashboard: () => import("./content/dashboard"),
  accounts: () => import("./content/accounts"),
  transactions: () => import("./content/transactions"),
  budgets: () => import("./content/budgets"),
  projections: () => import("./content/projections"),
  reports: () => import("./content/reports"),
  loans: () => import("./content/loans"),
  savings: () => import("./content/savings"),
  reminders: () => import("./content/reminders"),
  lists: () => import("./content/lists"),
  shopping: () => import("./content/shopping"),
  inventory: () => import("./content/inventory"),
  projects: () => import("./content/projects"),
  trips: () => import("./content/trips"),
  settings: () => import("./content/settings"),
};

export type ManualEntry = { key: string; title: string; group: string };

/** Índice de manuales que este usuario puede ver, en el orden y grupos del menú. */
export function visibleManuals(
  role: "admin" | "member",
  permissions: PermissionMap,
): ManualEntry[] {
  const groups = [...NAV, { label: "Configuración", items: [SETTINGS_ITEM] }];
  return groups.flatMap((group) =>
    group.items
      .filter((item) => item.href.slice(1) in LOADERS)
      .filter((item) =>
        item.module === "settings"
          ? role === "admin"
          : canAccess(role, permissions, item.module, "view"),
      )
      .map((item) => ({ key: item.href.slice(1), title: item.label, group: group.label })),
  );
}

/** Manual de la pantalla actual (incluye subrutas: /accounts/123 → accounts). */
export function manualForPath(pathname: string, manuals: ManualEntry[]) {
  return manuals.find((m) => pathname === `/${m.key}` || pathname.startsWith(`/${m.key}/`)) ?? null;
}

export function loadManual(key: string) {
  return LOADERS[key]?.().then((m) => m.default) ?? Promise.reject(new Error("Sin manual"));
}
