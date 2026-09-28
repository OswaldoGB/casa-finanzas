import type { ModuleName } from "@/features/permissions/modules";

export type MobileCreateAction = {
  href: string;
  label: string;
  module: ModuleName;
};

const actions: [string, MobileCreateAction][] = [
  [
    "/accounts",
    { href: "/accounts/new", label: "Nueva cuenta", module: "accounts" },
  ],
  [
    "/transactions",
    {
      href: "/transactions/new",
      label: "Registrar movimiento",
      module: "transactions",
    },
  ],
  [
    "/lists",
    { href: "/lists/new", label: "Nueva lista", module: "shopping_lists" },
  ],
  [
    "/loans",
    { href: "/loans#new-loan", label: "Nuevo préstamo", module: "loans" },
  ],
  [
    "/savings",
    { href: "/savings#new-savings", label: "Nueva meta", module: "savings" },
  ],
  [
    "/inventory",
    {
      href: "/inventory#new-inventory",
      label: "Nuevo artículo",
      module: "inventory",
    },
  ],
  [
    "/projects",
    {
      href: "/projects#new-project",
      label: "Nuevo proyecto",
      module: "projects",
    },
  ],
];

const fallback: MobileCreateAction = {
  href: "/transactions/new",
  label: "Registrar movimiento",
  module: "transactions",
};

export function getMobileCreateAction(pathname: string): MobileCreateAction {
  return actions.find(([path]) => pathname.startsWith(path))?.[1] ?? fallback;
}
