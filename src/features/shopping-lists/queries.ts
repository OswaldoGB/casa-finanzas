import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import type { Database } from "@/lib/supabase/database.types";
import { listIdSchema } from "./schemas";

export type ShoppingList =
  Database["public"]["Tables"]["shopping_lists"]["Row"];
export type ShoppingItem =
  Database["public"]["Tables"]["shopping_list_items"]["Row"];
export async function getShoppingLists() {
  const access = await requireModule("shopping_lists");
  const { data, error } = await access.supabase
    .from("shopping_lists")
    .select("*")
    .eq("household_id", access.profile.household_id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar las listas.");
  return {
    lists: data ?? [],
    canEdit: canAccess(
      access.profile.role,
      access.permissions,
      "shopping_lists",
      "edit",
    ),
  };
}
export async function getShoppingList(id: string) {
  if (!listIdSchema.safeParse(id).success) return null;
  const { supabase, profile, permissions } =
    await requireModule("shopping_lists");
  const [list, items, history] = await Promise.all([
    supabase
      .from("shopping_lists")
      .select("*")
      .eq("id", id)
      .eq("household_id", profile.household_id)
      .maybeSingle(),
    supabase
      .from("shopping_list_items")
      .select("*")
      .eq("list_id", id)
      .eq("household_id", profile.household_id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("shopping_list_items")
      .select("name,real_price,shopping_lists!inner(transaction_id,completed_at)")
      .eq("household_id", profile.household_id)
      .not("shopping_lists.transaction_id", "is", null)
      .eq("checked", true)
      .not("real_price", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1000),
  ]);
  if (list.error || items.error || history.error)
    throw new Error("No se pudo cargar la lista.");
  if (!list.data) return null;
  const seen = new Set<string>();
  const suggestions = (history.data ?? [])
    .sort((a, b) =>
      (b.shopping_lists.completed_at ?? "").localeCompare(a.shopping_lists.completed_at ?? ""),
    )
    .filter((item) => {
      const key = item.name.trim().toLocaleLowerCase("es");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({ name: item.name, price: item.real_price }));
  const canClose = canAccess(profile.role, permissions, "transactions", "edit");
  const canViewTransaction = canAccess(
    profile.role,
    permissions,
    "transactions",
    "view",
  );
  const options = canClose
    ? await Promise.all([
        supabase
          .from("accounts")
          .select("id,name")
          .eq("household_id", profile.household_id)
          .eq("is_archived", false)
          .order("name"),
        supabase
          .from("categories")
          .select("id,name")
          .eq("household_id", profile.household_id)
          .eq("type", "expense")
          .eq("is_archived", false)
          .order("name"),
        supabase
          .from("payment_methods")
          .select("id,name")
          .eq("household_id", profile.household_id)
          .eq("is_archived", false)
          .order("name"),
      ])
    : null;
  if (options?.some((result) => result.error))
    throw new Error("No se pudieron cargar las opciones de pago.");
  return {
    list: list.data,
    items: items.data ?? [],
    suggestions,
    canEdit: canAccess(profile.role, permissions, "shopping_lists", "edit"),
    canClose,
    canViewTransaction,
    options: options
      ? {
          accounts: options[0].data ?? [],
          categories: options[1].data ?? [],
          methods: options[2].data ?? [],
        }
      : null,
  };
}
