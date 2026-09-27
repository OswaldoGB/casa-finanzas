import { Wallet } from "lucide-react";
import { requireModule } from "@/features/permissions/queries";

export const metadata = { title: "Inicio" };

export default async function DashboardPage() {
  await requireModule("dashboard");
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
      <div className="bg-card mt-6 flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
        <span className="bg-accent text-accent-foreground mb-4 grid size-12 place-items-center rounded-2xl">
          <Wallet className="size-6" aria-hidden />
        </span>
        <h2 className="font-medium">Todo listo para empezar</h2>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          El resumen de tus finanzas aparecerá aquí cuando registres cuentas y
          movimientos.
        </p>
      </div>
    </div>
  );
}
