import { LockKeyhole } from "lucide-react";

export const metadata = { title: "Esperando permisos" };

export default function AccessPendingPage() {
  return (
    <div className="mx-auto grid max-w-xl place-items-center px-4 py-16 text-center">
      <div className="bg-accent text-accent-foreground mb-4 grid size-14 place-items-center rounded-2xl">
        <LockKeyhole className="size-6" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold">Esperando permisos</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        El administrador aún no te ha dado acceso a este módulo. Pídele que lo
        configure desde Miembros.
      </p>
    </div>
  );
}
