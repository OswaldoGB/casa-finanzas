import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { todayInTimeZone } from "@/features/recurring/processing";
import { savingsSnapshotSchema } from "./schemas";
export async function getSavings() {
  const { supabase, profile, permissions } = await requireModule("savings");
  const [snapshot, accounts, household] = await Promise.all([
    supabase.rpc("savings_snapshot", { p_module: "savings" }),
    supabase
      .from("accounts")
      .select("id,name")
      .eq("household_id", profile.household_id)
      .eq("is_archived", false)
      .neq("type", "credit_card")
      .order("name"),
    supabase
      .from("households")
      .select("timezone")
      .eq("id", profile.household_id)
      .single(),
  ]);
  if (snapshot.error || accounts.error || household.error)
    throw new Error("No se pudieron cargar las metas.");
  return {
    goals: savingsSnapshotSchema.parse(snapshot.data),
    accounts: accounts.data ?? [],
    today: todayInTimeZone(new Date(), household.data!.timezone),
    canEdit: canAccess(profile.role, permissions, "savings", "edit"),
    canOperate:
      canAccess(profile.role, permissions, "savings", "edit") &&
      canAccess(profile.role, permissions, "transactions", "edit"),
  };
}
