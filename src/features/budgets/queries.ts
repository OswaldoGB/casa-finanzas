import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { todayInTimeZone } from "@/features/recurring/processing";
import { budgetMonthSchema, budgetSnapshotSchema } from "./schemas";

export async function getBudgets(selectedMonth?: string) {
  const { supabase, profile, permissions } = await requireModule("budgets");
  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("timezone")
    .eq("id", profile.household_id)
    .single();
  if (householdError || !household)
    throw new Error("No se pudo cargar el mes del hogar.");
  const candidate =
    selectedMonth?.length === 7 ? `${selectedMonth}-01` : selectedMonth;
  const month = budgetMonthSchema.safeParse(candidate).success
    ? candidate!
    : `${todayInTimeZone(new Date(), household.timezone).slice(0, 7)}-01`;
  const [snapshot, categories] = await Promise.all([
    supabase.rpc("budget_snapshot", { p_month: month, p_module: "budgets" }),
    supabase
      .from("categories")
      .select("id,name,parent_id")
      .eq("household_id", profile.household_id)
      .eq("type", "expense")
      .eq("is_archived", false)
      .order("sort_order")
      .order("name"),
  ]);
  if (snapshot.error || categories.error)
    throw new Error("No se pudieron cargar los presupuestos.");
  return {
    month,
    budgets: budgetSnapshotSchema.parse(snapshot.data),
    categories: categories.data ?? [],
    canEdit: canAccess(profile.role, permissions, "budgets", "edit"),
  };
}

export async function getDashboardBudgets(month: string) {
  const { supabase } = await requireModule("dashboard");
  const result = await supabase.rpc("budget_snapshot", {
    p_month: month,
    p_module: "dashboard",
  });
  if (result.error)
    throw new Error("No se pudo cargar el progreso de presupuestos.");
  return budgetSnapshotSchema.parse(result.data);
}
