import { redirect } from "next/navigation";
import { connection } from "next/server";
import { setupHousehold } from "@/features/auth/actions";
import { SetupForm } from "@/features/auth/components/setup-form";
import { hasAnyProfile } from "@/features/auth/queries";

export const metadata = { title: "Configuración inicial" };

export default async function SetupPage() {
  await connection();
  if (await hasAnyProfile()) redirect("/login");
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Configuración inicial</h1>
      <p className="text-muted-foreground mb-6 text-sm">Crea tu hogar y tu cuenta de administrador.</p>
      <SetupForm action={setupHousehold} />
    </>
  );
}
