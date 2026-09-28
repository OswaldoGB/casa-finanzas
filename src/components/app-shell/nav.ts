import {
  ArrowLeftRight,
  ChartColumn,
  ChartPie,
  FolderKanban,
  HandCoins,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Package,
  PiggyBank,
  Settings,
  ShoppingBag,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ModuleName } from "@/features/permissions/modules";

export type NavItem = {
  module: ModuleName | "settings";
  href: string;
  label: string;
  icon: LucideIcon;
  ready: boolean;
};

// ponytail: `ready` marca lo ya construido; se quita cuando todas las fases estén listas.
export const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Finanzas",
    items: [
      {
        module: "dashboard",
        href: "/dashboard",
        label: "Inicio",
        icon: LayoutDashboard,
        ready: true,
      },
      {
        module: "accounts",
        href: "/accounts",
        label: "Cuentas",
        icon: Landmark,
        ready: true,
      },
      {
        module: "transactions",
        href: "/transactions",
        label: "Movimientos",
        icon: ArrowLeftRight,
        ready: true,
      },
      {
        module: "budgets",
        href: "/budgets",
        label: "Presupuestos",
        icon: ChartPie,
        ready: true,
      },
      {
        module: "projections",
        href: "/projections",
        label: "Proyecciones",
        icon: TrendingUp,
        ready: true,
      },
      {
        module: "reports",
        href: "/reports",
        label: "Reportes",
        icon: ChartColumn,
        ready: true,
      },
    ],
  },
  {
    label: "Hogar",
    items: [
      {
        module: "shopping_lists",
        href: "/lists",
        label: "Listas de compra",
        icon: ListChecks,
        ready: true,
      },
      {
        module: "shopping",
        href: "/shopping",
        label: "Compras próximas",
        icon: ShoppingBag,
        ready: true,
      },
      {
        module: "inventory",
        href: "/inventory",
        label: "Inventario",
        icon: Package,
        ready: true,
      },
      {
        module: "projects",
        href: "/projects",
        label: "Proyectos",
        icon: FolderKanban,
        ready: true,
      },
    ],
  },
  {
    label: "Ahorro y deudas",
    items: [
      {
        module: "loans",
        href: "/loans",
        label: "Préstamos",
        icon: HandCoins,
        ready: true,
      },
      {
        module: "savings",
        href: "/savings",
        label: "Ahorros",
        icon: PiggyBank,
        ready: true,
      },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  module: "settings",
  href: "/settings",
  label: "Configuración",
  icon: Settings,
  ready: true,
};
