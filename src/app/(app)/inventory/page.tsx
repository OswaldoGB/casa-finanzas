import Link from "next/link";
import Image from "next/image";
import { getInventory } from "@/features/inventory/queries";
import { inventoryValue, warrantyExpiring } from "@/features/inventory/schemas";
import { InventoryForm } from "@/features/inventory/components/inventory-form";
import { formatUSD } from "@/lib/format";
import { inputClass } from "@/features/projects/schemas";

export const metadata = { title: "Inventario" };
export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; view?: string }>;
}) {
  const filters = await searchParams;
  const { items, today, canEdit, transactions } = await getInventory();
  const visible = items.filter(
    (item) => !filters.location || item.location === filters.location,
  );
  const locations = [
    ...new Set(items.map((item) => item.location).filter(Boolean)),
  ];
  const expiring = items.filter((item) =>
    warrantyExpiring(item.warranty_until, today),
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Inventario</h1>
        <p className="text-muted-foreground text-sm">
          Lo que tienes en casa, dónde está y su garantía.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Valor registrado", formatUSD(inventoryValue(items))],
          ["Artículos", String(items.length)],
          ["Garantías por vencer (30 días)", String(expiring.length)],
        ].map(([label, value]) => (
          <div key={label} className="bg-card rounded-2xl border p-5">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Valor = cantidad × precio de compra. Los artículos sin precio no se
        suman. El inventario no forma parte del patrimonio financiero.
      </p>
      <form className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Ubicación
          <select
            name="location"
            defaultValue={filters.location ?? ""}
            className={inputClass}
          >
            <option value="">Todas</option>
            {locations.map((location) => (
              <option key={location}>{location}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Vista
          <select
            name="view"
            defaultValue={filters.view ?? "cards"}
            className={inputClass}
          >
            <option value="cards">Tarjetas</option>
            <option value="table">Tabla</option>
          </select>
        </label>
        <button className="rounded-lg border px-4 py-2.5 text-sm">
          Aplicar
        </button>
      </form>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          {visible.length === 0 && (
            <p className="text-muted-foreground rounded-2xl border p-6 text-sm">
              No hay artículos en esta ubicación.
            </p>
          )}
          {filters.view === "table" ? (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    {[
                      "Artículo",
                      "Ubicación",
                      "Cantidad",
                      "Valor",
                      "Garantía",
                    ].map((label) => (
                      <th key={label} className="p-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">
                        <Link
                          className="underline"
                          href={`/inventory/${item.id}`}
                        >
                          {item.name}
                        </Link>
                      </td>
                      <td className="p-3">{item.location || "—"}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">
                        {formatUSD(inventoryValue([item]))}
                      </td>
                      <td className="p-3">{item.warranty_until ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {visible.map((item) => (
                <Link
                  href={`/inventory/${item.id}`}
                  key={item.id}
                  className="bg-card hover:border-primary space-y-2 rounded-2xl border p-5"
                >
                  {item.photoUrl && (
                    <Image
                      unoptimized
                      src={item.photoUrl}
                      width={400}
                      height={300}
                      alt={item.name}
                      className="h-36 w-full rounded-lg object-cover"
                    />
                  )}
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {item.location || "Sin ubicación"} ·{" "}
                    {item.category || "Sin categoría"}
                  </p>
                  <p className="text-sm">
                    {item.quantity} unidades ·{" "}
                    {item.purchase_price == null
                      ? "Sin precio"
                      : formatUSD(inventoryValue([item]))}
                  </p>
                  {item.warranty_until && (
                    <p
                      className={`text-xs ${warrantyExpiring(item.warranty_until, today) ? "text-amber-600" : "text-muted-foreground"}`}
                    >
                      Garantía: {item.warranty_until}
                      {warrantyExpiring(item.warranty_until, today)
                        ? " · Por vencer"
                        : ""}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
        {canEdit && (
          <aside className="bg-card rounded-2xl border p-5">
            <h2 className="mb-4 font-semibold">Nuevo artículo</h2>
            <InventoryForm transactions={transactions} />
          </aside>
        )}
      </div>
    </div>
  );
}
