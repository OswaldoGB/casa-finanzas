import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { todayInTimeZone } from "@/features/recurring/processing";
import { loanSnapshotSchema } from "./schemas";

export async function getLoans() {
  const { supabase, profile, permissions } = await requireModule("loans");
  const [
    snapshot,
    sourceAccounts,
    depositAccounts,
    household,
    people,
    allocations,
  ] = await Promise.all([
    supabase.rpc("loan_snapshot", { p_module: "loans" }),
    supabase
      .from("accounts")
      .select("id,name,type")
      .eq("household_id", profile.household_id)
      .eq("is_archived", false)
      .order("sort_rank")
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
    supabase
      .from("loan_people")
      .select("id,name,emoji,color")
      .eq("household_id", profile.household_id)
      .order("name"),
    supabase
      .from("loan_purchase_items")
      .select(
        "*,loan_item_repayments(amount_cents,transaction_id,transactions(date,created_at))",
      ),
  ]);
  if (
    snapshot.error ||
    sourceAccounts.error ||
    depositAccounts.error ||
    household.error ||
    people.error ||
    allocations.error
  )
    throw new Error("No se pudieron cargar los préstamos.");
  const itemsByLoan: Record<string, LoanItem[]> = {};
  for (const item of allocations.data ?? []) {
    const payments = item.loan_item_repayments.map((payment) => ({
      transactionId: payment.transaction_id,
      cents: payment.amount_cents,
      date: payment.transactions?.date ?? null,
      createdAt: payment.transactions?.created_at ?? null,
    }));
    (itemsByLoan[item.loan_id] ??= []).push({
      id: item.id,
      purchaseId: item.purchase_id,
      name: item.name,
      quantity: item.quantity,
      unitCents: item.unit_cents,
      pendingCents:
        item.quantity * item.unit_cents -
        payments.reduce((sum, payment) => sum + payment.cents, 0),
      payments,
    });
  }
  return {
    itemsByLoan,
    timezone: household.data!.timezone,
    loans: loanSnapshotSchema.parse(snapshot.data),
    people: people.data,
    sourceAccounts: sourceAccounts.data ?? [],
    depositAccounts: depositAccounts.data ?? [],
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
