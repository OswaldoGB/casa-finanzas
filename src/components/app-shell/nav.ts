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
};

export const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Finanzas",
    items: [
      {
        module: "dashboard",
        href: "/dashboard",
        label: "Inicio",
        icon: LayoutDashboard,
      },
      {
        module: "accounts",
        href: "/accounts",
        label: "Billetera",
        icon: Landmark,
      },
      {
        module: "transactions",
        href: "/transactions",
        label: "Movimientos",
        icon: ArrowLeftRight,
      },
      {
        module: "budgets",
        href: "/budgets",
        label: "Presupuestos",
        icon: ChartPie,
      },
      {
        module: "projections",
        href: "/projections",
        label: "Proyecciones",
        icon: TrendingUp,
      },
      {
        module: "reports",
        href: "/reports",
        label: "Reportes",
        icon: ChartColumn,
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
      },
      {
        module: "shopping",
        href: "/shopping",
        label: "Compras próximas",
        icon: ShoppingBag,
      },
      {
        module: "inventory",
        href: "/inventory",
        label: "Inventario",
        icon: Package,
      },
      {
        module: "projects",
        href: "/projects",
        label: "Proyectos",
        icon: FolderKanban,
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
      },
      {
        module: "savings",
        href: "/savings",
        label: "Ahorros",
        icon: PiggyBank,
      },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  module: "settings",
  href: "/settings",
  label: "Configuración",
  icon: Settings,
};
