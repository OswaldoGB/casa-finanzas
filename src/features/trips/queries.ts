import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { getProjects } from "@/features/projects/queries";
import { getTransactionOptions } from "@/features/transactions/queries";
import { todayInTimeZone } from "@/features/recurring/processing";
import { tripSnapshotSchema, uuid, type TripSnapshot } from "./schemas";

export async function getTrips() {
  const access = await requireModule("projects");
  const [projects, details] = await Promise.all([
    getProjects(),
    access.supabase
      .from("trip_details")
      .select("*")
      .eq("household_id", access.profile.household_id),
  ]);
  if (details.error) throw new Error("No se pudieron cargar los viajes.");
  const byId = new Map((details.data ?? []).map((d) => [d.project_id, d]));
  return {
    trips: projects.projects
      .filter((p) => byId.has(p.id))
      .map((p) => ({ ...p, detail: byId.get(p.id)! })),
    canEdit: projects.canEdit,
  };
}
export async function getTrip(id: string): Promise<TripSnapshot | null> {
  if (!uuid.safeParse(id).success) return null;
  const { supabase, profile, permissions } = await requireModule("projects");
  const canEditTransactions = canAccess(
    profile.role,
    permissions,
    "transactions",
    "edit",
  );
  const [snapshot, household, transactionOptions, expenses] = await Promise.all(
    [
      supabase.rpc("trip_snapshot", { p_project_id: id }),
      supabase
        .from("households")
        .select("timezone")
        .eq("id", profile.household_id)
        .single(),
      canEditTransactions ? getTransactionOptions() : null,
      canEditTransactions
        ? supabase
            .from("transactions")
            .select("id,description,date,amount")
            .eq("household_id", profile.household_id)
            .eq("type", "expense")
            .eq("status", "posted")
            .or(`project_id.eq.${id},project_id.is.null`)
            .order("date", { ascending: false })
            .limit(500)
        : null,
    ],
  );
  if (snapshot.error || household.error || expenses?.error)
    throw new Error("No se pudo cargar el viaje.");
  if (!snapshot.data) return null;
  return {
    ...tripSnapshotSchema.parse(snapshot.data),
    canEdit: canAccess(profile.role, permissions, "projects", "edit"),
    canEditLists: canAccess(
      profile.role,
      permissions,
      "shopping_lists",
      "edit",
    ),
    canViewLists: canAccess(
      profile.role,
      permissions,
      "shopping_lists",
      "view",
    ),
    canEditTransactions,
    canViewTransactions: canAccess(
      profile.role,
      permissions,
      "transactions",
      "view",
    ),
    today: todayInTimeZone(
      new Date(),
      household.data?.timezone ?? "America/El_Salvador",
    ),
    options: {
      accounts: transactionOptions?.accounts ?? [],
      categories:
        transactionOptions?.categories.filter((c) => c.type === "expense") ??
        [],
      methods: transactionOptions?.methods ?? [],
      expenses: expenses?.data ?? [],
    },
  };
}
