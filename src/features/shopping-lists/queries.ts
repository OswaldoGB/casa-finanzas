import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import type { Database } from "@/lib/supabase/database.types";
import { listIdSchema } from "./schemas";
import { z } from "zod";
import { todayInTimeZone } from "@/features/recurring/processing";
export type ShoppingGroup =
  Database["public"]["Tables"]["shopping_list_groups"]["Row"];
export type ShoppingPurchase =
  Database["public"]["Tables"]["shopping_list_purchases"]["Row"];

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
  const [list, items, history, groups, purchases, paymentSnapshot, household] =
    await Promise.all([
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
        .select("name,real_price,updated_at")
        .eq("household_id", profile.household_id)
        .not("purchase_id", "is", null)
        .eq("checked", true)
        .not("real_price", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1000),
      supabase
        .from("shopping_list_groups")
        .select("*")
        .eq("list_id", id)
        .eq("household_id", profile.household_id)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("shopping_list_purchases")
        .select("*")
        .eq("list_id", id)
        .eq("household_id", profile.household_id)
        .order("created_at", { ascending: false }),
      supabase.rpc("shopping_purchase_snapshot", { p_list_id: id }),
      supabase
        .from("households")
        .select("timezone")
        .eq("id", profile.household_id)
        .single(),
    ]);
  if (list.error || items.error || history.error)
    throw new Error("No se pudo cargar la lista.");
  if (!list.data) return null;
  if (
    groups.error ||
    purchases.error ||
    paymentSnapshot.error ||
    household.error
  )
    throw new Error("No se pudo cargar el historial de compras.");
  const purchaseTransactions = z
    .array(
      z.object({
        id: z.string().uuid(),
        amount: z.number(),
        date: z.string(),
        status: z.string(),
      }),
    )
    .parse(paymentSnapshot.data);
  const seen = new Set<string>();
  const suggestions = (history.data ?? [])
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
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
    groups: groups.data ?? [],
    purchases: purchases.data ?? [],
    purchaseTransactions,
    today: todayInTimeZone(
      new Date(),
      household.data?.timezone ?? "America/El_Salvador",
    ),
    suggestions,
    canEdit:
      canAccess(profile.role, permissions, "shopping_lists", "edit") &&
      (!list.data.project_id ||
        canAccess(profile.role, permissions, "projects", "edit")),
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
