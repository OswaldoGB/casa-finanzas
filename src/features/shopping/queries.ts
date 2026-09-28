import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { todayInTimeZone } from "@/features/recurring/processing";

export async function getShopping() {
  const { supabase, profile, permissions } = await requireModule("shopping");
  const household = profile.household_id;
  const [items, accounts, categories, methods, home] = await Promise.all([
    supabase
      .from("shopping_items")
      .select("*")
      .eq("household_id", household)
      .order("sort_order")
      .order("created_at", { ascending: false }),
    supabase
      .from("accounts")
      .select("id,name")
      .eq("household_id", household)
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("categories")
      .select("id,name")
      .eq("household_id", household)
      .eq("type", "expense")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("payment_methods")
      .select("id,name")
      .eq("household_id", household)
      .eq("is_archived", false)
      .order("name"),
    supabase.from("households").select("timezone").eq("id", household).single(),
  ]);
  if (
    items.error ||
    accounts.error ||
    categories.error ||
    methods.error ||
    home.error
  )
    throw new Error("No se pudieron cargar las compras.");
  const rank = { high: 0, medium: 1, low: 2 };
  return {
    items: items.data.sort(
      (a, b) =>
        rank[a.priority as keyof typeof rank] -
        rank[b.priority as keyof typeof rank],
    ),
    accounts: accounts.data,
    categories: categories.data,
    methods: methods.data,
    today: todayInTimeZone(new Date(), home.data.timezone),
    canEdit: canAccess(profile.role, permissions, "shopping", "edit"),
    canBuy: canAccess(profile.role, permissions, "transactions", "edit"),
    canInventory: canAccess(profile.role, permissions, "inventory", "edit"),
  };
}
export type ShoppingItem = Awaited<
  ReturnType<typeof getShopping>
>["items"][number];
