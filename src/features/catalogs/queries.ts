import "server-only";
import { requireAdmin } from "@/features/permissions/queries";

export async function getCatalogs() {
  const { supabase, profile } = await requireAdmin();
  const [categories, methods, accounts] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,type,parent_id,color,icon,is_archived,sort_order")
      .eq("household_id", profile.household_id)
      .order("sort_order")
      .order("name")
      .order("id"),
    supabase
      .from("payment_methods")
      .select("id,name,type,account_id,is_archived")
      .eq("household_id", profile.household_id)
      .order("name"),
    supabase
      .from("accounts")
      .select("id,name,is_archived")
      .eq("household_id", profile.household_id)
      .order("name"),
  ]);
  if (categories.error || methods.error || accounts.error)
    throw new Error("No se pudieron cargar los catálogos.");
  return {
    categories: categories.data ?? [],
    methods: methods.data ?? [],
    accounts: accounts.data ?? [],
  };
}
