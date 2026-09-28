import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getInventory } from "@/features/inventory/queries";
import { InventoryForm } from "@/features/inventory/components/inventory-form";
import { InventoryPhoto } from "@/features/inventory/components/photo";
import { ActionForm } from "@/features/projects/components/action-form";
import { deleteInventory } from "@/features/inventory/actions";
import { requireModule } from "@/features/permissions/queries";
import { formatUSD } from "@/lib/format";

export default async function InventoryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { items, canEdit, transactions } = await getInventory();
  const item = items.find((row) => row.id === id);
  if (!item) notFound();
  const { supabase } = await requireModule("inventory");
  const photo = item.photo_path
    ? await supabase.storage
        .from("inventory")
        .createSignedUrl(item.photo_path, 60)
    : null;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/inventory" className="text-sm underline">
        ← Inventario
      </Link>
      <h1 className="text-2xl font-semibold">{item.name}</h1>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <section className="bg-card space-y-4 rounded-2xl border p-5">
          {photo?.data?.signedUrl && (
            /* Private signed images intentionally bypass the public Next image cache. */ <Image
              unoptimized
              width={500}
              height={500}
              src={photo.data.signedUrl}
              alt={item.name}
              className="max-h-80 w-full rounded-lg object-contain"
            />
          )}
          <dl className="space-y-2 text-sm">
            {[
              ["Ubicación", item.location],
              ["Categoría", item.category],
              ["Cantidad", item.quantity],
              [
                "Precio por unidad",
                item.purchase_price == null
                  ? "Sin precio"
                  : formatUSD(item.purchase_price),
              ],
              ["Compra", item.purchase_date],
              ["Garantía", item.warranty_until],
              ["Notas", item.notes],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <InventoryPhoto id={id} canEdit={canEdit} />
        </section>
        {canEdit && (
          <aside className="bg-card space-y-6 rounded-2xl border p-5">
            <h2 className="font-semibold">Editar artículo</h2>
            <InventoryForm item={item} transactions={transactions} />
            <ActionForm
              action={deleteInventory}
              label="Eliminar artículo"
              confirm="¿Eliminar este artículo y su foto?"
            >
              <input name="id" type="hidden" value={id} />
            </ActionForm>
          </aside>
        )}
      </div>
    </div>
  );
}
