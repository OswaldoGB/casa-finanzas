import Link from "next/link";
import { requireModule } from "@/features/permissions/queries";
import { AccountForm } from "@/features/accounts/components/account-form";

export const metadata = { title: "Nueva cuenta" };

export default async function NewAccountPage() {
  await requireModule("accounts", "edit");
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/accounts"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Cuentas y tarjetas
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva cuenta</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Agrega una cuenta o tarjeta del hogar.
        </p>
      </div>
      <div className="bg-card rounded-2xl border p-5 sm:p-6">
        <AccountForm />
      </div>
    </div>
  );
}
