import Link from "next/link";
import { requireModule } from "@/features/permissions/queries";
import { ListForm } from "@/features/shopping-lists/components/forms";
export const metadata = { title: "Nueva lista de compra" };
export default async function NewListPage() {
  await requireModule("shopping_lists", "edit");
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/lists"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Listas de compra
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nueva lista</h1>
      <div className="bg-card rounded-2xl border p-5">
        <ListForm />
      </div>
    </div>
  );
}
