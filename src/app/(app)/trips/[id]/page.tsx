import Link from "next/link";
import { notFound } from "next/navigation";
import { Plane, MapPin, CalendarDays } from "lucide-react";
import { getTrip } from "@/features/trips/queries";
import { TripDialog } from "@/features/trips/components/trip-dialog";
import { TripWorkspace } from "@/features/trips/components/trip-workspace";
import { requireModule } from "@/features/permissions/queries";
export const metadata = { title: "Plan del viaje" };
export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snapshot = await getTrip(id);
  if (!snapshot) notFound();
  const access = await requireModule("projects");
  const choices =
    snapshot.canEdit && snapshot.canEditLists
      ? await access.supabase
          .from("shopping_lists")
          .select("id,name")
          .eq("household_id", access.profile.household_id)
          .is("project_id", null)
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
      : null;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/trips" className="text-muted-foreground text-sm">
        ← Viajes
      </Link>
      <header className="bg-card from-primary/10 to-card min-w-0 rounded-2xl border bg-linear-to-br p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-primary mb-2 flex items-center gap-2 text-xs">
              <Plane className="size-5" />
              SU VIAJE
            </div>
            <h1 className="text-2xl font-semibold break-words sm:text-3xl">
              {snapshot.project.name}
            </h1>
            <div className="text-muted-foreground mt-3 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {snapshot.detail.destination || "Destino por definir"}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" />
                {snapshot.project.start_date} — {snapshot.project.end_date}
              </span>
            </div>
          </div>
          {snapshot.canEdit && <TripDialog trip={snapshot} />}
        </div>
      </header>
      <TripWorkspace snapshot={snapshot} availableLists={choices?.data ?? []} />
    </div>
  );
}
