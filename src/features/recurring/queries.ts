import "server-only";
import { requireAdmin } from "@/features/permissions/queries";

export async function getRecurringSettings() {
  const { supabase, profile } = await requireAdmin();
  const [rules, accounts, categories, methods] = await Promise.all([
    supabase
      .from("recurring_rules")
      .select("*")
      .eq("household_id", profile.household_id)
      .order("next_run_date"),
    supabase
      .from("accounts")
      .select("id,name,is_archived")
      .eq("household_id", profile.household_id)
      .order("name"),
    supabase
      .from("categories")
      .select("id,name,type,is_archived")
      .eq("household_id", profile.household_id)
      .order("name"),
    supabase
      .from("payment_methods")
      .select("id,name,is_archived")
      .eq("household_id", profile.household_id)
      .order("name"),
  ]);
  if (rules.error || accounts.error || categories.error || methods.error)
    throw new Error("No se pudieron cargar los recurrentes.");
  return {
    rules: rules.data ?? [],
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    methods: methods.data ?? [],
  };
}
