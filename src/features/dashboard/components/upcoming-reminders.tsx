import Link from "next/link";
import { BellRing } from "lucide-react";
import { getAccess } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
export async function UpcomingReminders() {
  const { supabase, profile, permissions } = await getAccess();
  if (!canAccess(profile.role, permissions, "reminders", "view")) return null;
  const { data, error } = await supabase
    .from("reminders")
    .select("id,title,reference,effective_date,due_km,current_km")
    .eq("household_id", profile.household_id)
    .eq("status", "active")
    .neq("kind", "note")
    .order("effective_date", { ascending: true, nullsFirst: false })
    .limit(5);
  return (
    <section className="bg-card min-w-0 rounded-2xl border p-5">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <BellRing className="text-primary size-4" />
          Por recordar
        </h2>
        <Link href="/reminders" className="text-primary text-xs">
          Ver todos →
        </Link>
      </header>
      {error ? (
        <p className="text-muted-foreground text-sm">
          No se pudieron cargar los recordatorios.
        </p>
      ) : !data?.length ? (
        <p className="text-muted-foreground text-sm">
          Anota una tarea o programa tu próximo mantenimiento en Recordatorios.
        </p>
      ) : (
        <ul className="divide-y">
          {data.map((r) => (
            <li key={r.id}>
              <Link
                href={`/reminders/${r.id}`}
                className="flex min-w-0 items-start justify-between gap-3 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium break-words">
                    {r.title}
                  </span>
                  {r.reference && (
                    <span className="text-muted-foreground text-xs break-words">
                      {r.reference}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {r.effective_date ??
                    (r.due_km != null
                      ? `${r.due_km.toLocaleString("es")} km`
                      : "Por revisar")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
