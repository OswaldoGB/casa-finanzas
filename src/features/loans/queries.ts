import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { todayInTimeZone } from "@/features/recurring/processing";
import { loanSnapshotSchema } from "./schemas";

export async function getLoans() {
  const { supabase, profile, permissions } = await requireModule("loans");
  const [snapshot, sourceAccounts, household, people] = await Promise.all([
    supabase.rpc("loan_snapshot", { p_module: "loans" }),
    supabase
      .from("accounts")
      .select("id,name,type")
      .eq("household_id", profile.household_id)
      .eq("is_archived", false)
      .order("sort_rank")
      .order("name"),
    supabase
      .from("households")
      .select("timezone")
      .eq("id", profile.household_id)
      .single(),
    supabase
      .from("loan_people")
      .select("id,name,emoji,color")
      .eq("household_id", profile.household_id)
      .order("name"),
  ]);
  if (snapshot.error || sourceAccounts.error || household.error || people.error)
    throw new Error("No se pudieron cargar los préstamos.");
  return {
    timezone: household.data!.timezone,
    loans: loanSnapshotSchema.parse(snapshot.data),
    people: people.data,
    sourceAccounts: sourceAccounts.data ?? [],
    depositAccounts: sourceAccounts.data
      .filter((account) => account.type !== "credit_card")
      .sort((a, b) => a.name.localeCompare(b.name)),
    today: todayInTimeZone(new Date(), household.data!.timezone),
    canEdit: canAccess(profile.role, permissions, "loans", "edit"),
    canOperate:
      canAccess(profile.role, permissions, "loans", "edit") &&
      canAccess(profile.role, permissions, "transactions", "edit"),
  };
}

export type LoanItem = {
  id: string;
  purchaseId: string;
  name: string;
  quantity: number;
  unitCents: number;
  pendingCents: number;
  payments: {
    transactionId: string;
    cents: number;
    date: string | null;
    createdAt: string | null;
  }[];
};
