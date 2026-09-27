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
        ready: false,
      },
      {
        module: "transactions",
        href: "/transactions",
        label: "Movimientos",
        icon: ArrowLeftRight,
        ready: false,
      },
      {
        module: "budgets",
        href: "/budgets",
        label: "Presupuestos",
        icon: ChartPie,
        ready: false,
      },
      {
        module: "projections",
        href: "/projections",
        label: "Proyecciones",
        icon: TrendingUp,
        ready: false,
      },
      {
        module: "reports",
        href: "/reports",
        label: "Reportes",
        icon: ChartColumn,
        ready: false,
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
        ready: false,
      },
      {
        module: "shopping",
        href: "/shopping",
        label: "Compras próximas",
        icon: ShoppingBag,
        ready: false,
      },
      {
        module: "inventory",
        href: "/inventory",
        label: "Inventario",
        icon: Package,
        ready: false,
      },
      {
        module: "projects",
        href: "/projects",
        label: "Proyectos",
        icon: FolderKanban,
        ready: false,
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
        ready: false,
      },
      {
        module: "savings",
        href: "/savings",
        label: "Ahorros",
        icon: PiggyBank,
        ready: false,
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
