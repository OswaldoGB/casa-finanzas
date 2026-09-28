import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { todayInTimeZone } from "@/features/recurring/processing";
import { loanSnapshotSchema } from "./schemas";

export async function getLoans() {
  const { supabase, profile, permissions } = await requireModule("loans");
  const [snapshot, sourceAccounts, depositAccounts, household] =
    await Promise.all([
      supabase.rpc("loan_snapshot", { p_module: "loans" }),
      supabase
        .from("accounts")
        .select("id,name,type")
        .eq("household_id", profile.household_id)
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("accounts")
        .select("id,name,type")
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
  if (
    snapshot.error ||
    sourceAccounts.error ||
    depositAccounts.error ||
    household.error
  )
    throw new Error("No se pudieron cargar los préstamos.");
  return {
    loans: loanSnapshotSchema.parse(snapshot.data),
    sourceAccounts: sourceAccounts.data ?? [],
    depositAccounts: depositAccounts.data ?? [],
    today: todayInTimeZone(new Date(), household.data!.timezone),
    canEdit: canAccess(profile.role, permissions, "loans", "edit"),
    canOperate:
      canAccess(profile.role, permissions, "loans", "edit") &&
      canAccess(profile.role, permissions, "transactions", "edit"),
  };
}
