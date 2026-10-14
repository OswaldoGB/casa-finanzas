import Link from "next/link";
import { Plane, MapPin, CalendarDays } from "lucide-react";
import { getTrips } from "@/features/trips/queries";
import { TripDialog } from "@/features/trips/components/trip-dialog";
import { projectStatus } from "@/features/projects/schemas";
import { formatUSD } from "@/lib/format";
import { ExportButtons } from "@/features/exports/components/export-buttons";
export const metadata = { title: "Viajes" };
export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { trips, canEdit } = await getTrips();
  const { status } = await searchParams;
  const visible = trips.filter((t) =>
    status === "archived" ? t.status === "archived" : t.status !== "archived",
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Viajes</h1>
          <p className="text-muted-foreground text-sm">
            Planeen sus días, compras y presupuesto juntos.
          </p>
        </div>
        {canEdit && <TripDialog listenToNew />}
      </header>
      <ExportButtons target="trips" />
      <div className="flex gap-2">
        <Link
          href="/trips"
          className={`rounded-lg border px-3 py-2 text-sm ${status !== "archived" ? "bg-primary/10 text-primary" : ""}`}
        >
          Tus viajes
        </Link>
        <Link
          href="/trips?status=archived"
          className={`rounded-lg border px-3 py-2 text-sm ${status === "archived" ? "bg-primary/10 text-primary" : ""}`}
        >
          Archivados
        </Link>
      </div>
      {!visible.length && (
        <div className="bg-card rounded-2xl border border-dashed p-10 text-center">
          <Plane className="text-primary mx-auto mb-3 size-10" />
          <h2 className="font-semibold">Su próxima aventura empieza aquí</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Crea un viaje para planear el menú, experiencias y compras por
            lugar.
          </p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((trip) => (
          <Link
            key={trip.id}
            href={`/trips/${trip.id}`}
            className="bg-card hover:border-primary/50 min-w-0 rounded-2xl border p-5 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold break-words">
                  {trip.name}
                </h2>
                <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
                  <MapPin className="size-4 shrink-0" />
                  {trip.detail.destination || "Destino por definir"}
                </p>
              </div>
              <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-1 text-xs">
                {projectStatus[trip.status]}
              </span>
            </div>
            <p className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
              <CalendarDays className="size-4" />
              {trip.start_date} — {trip.end_date}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Máximo</p>
                <p className="font-semibold tabular-nums">
                  {formatUSD(trip.budget)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Gastado</p>
                <p className="font-semibold tabular-nums">
                  {formatUSD(trip.spent)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
