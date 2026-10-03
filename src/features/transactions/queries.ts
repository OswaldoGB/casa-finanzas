import "server-only";
import { requireModule } from "@/features/permissions/queries";
import type { Database } from "@/lib/supabase/database.types";
import { transactionIdSchema } from "./schemas";
import { todayInTimeZone } from "@/features/recurring/processing";

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Filters = {
  from?: string;
  to?: string;
  type?: string;
  account?: string;
  category?: string;
  method?: string;
  user?: string;
  project?: string;
  q?: string;
};

export async function getTransactionOptions() {
  const { supabase, profile, permissions } =
    await requireModule("transactions");
  const household = profile.household_id;
  const [accounts, categories, methods, members, householdResult, projects] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id,name,is_archived")
        .eq("household_id", household)
        .order("name"),
      supabase
        .from("categories")
        .select("id,name,type,is_archived")
        .eq("household_id", household)
        .order("name"),
      supabase
        .from("payment_methods")
        .select("id,name,is_archived")
        .eq("household_id", household)
        .order("name"),
      supabase
        .from("profiles")
        .select("id,full_name")
        .eq("household_id", household)
        .order("full_name"),
      supabase
        .from("households")
        .select("timezone")
        .eq("id", household)
        .single(),
      supabase
        .from("projects")
        .select("id,name,status")
        .eq("household_id", household)
        .order("name"),
    ]);
  if (
    accounts.error ||
    categories.error ||
    methods.error ||
    members.error ||
    householdResult.error ||
    projects.error
  )
    throw new Error("No se pudieron cargar las opciones.");
  return {
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    methods: methods.data ?? [],
    members: members.data ?? [],
    projects: projects.data ?? [],
    today: todayInTimeZone(new Date(), householdResult.data.timezone),
    canEdit: profile.role === "admin" || permissions.transactions === "edit",
  };
}

export async function getTransactions(filters: Filters = {}) {
  const { supabase, profile } = await requireModule("transactions");
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("household_id", profile.household_id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from))
    query = query.gte("date", filters.from);
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to))
    query = query.lte("date", filters.to);
  if (filters.type && ["income", "expense", "transfer"].includes(filters.type))
    query = query.eq("type", filters.type as "income" | "expense" | "transfer");
  if (filters.account && transactionIdSchema.safeParse(filters.account).success)
    query = query.or(
      `account_id.eq.${filters.account},destination_account_id.eq.${filters.account}`,
    );
  if (
    filters.category &&
    transactionIdSchema.safeParse(filters.category).success
  )
    query = query.eq("category_id", filters.category);
  if (filters.method && transactionIdSchema.safeParse(filters.method).success)
    query = query.eq("payment_method_id", filters.method);
  if (filters.user && transactionIdSchema.safeParse(filters.user).success)
    query = query.eq("created_by", filters.user);
  if (filters.project && transactionIdSchema.safeParse(filters.project).success)
    query = query.eq("project_id", filters.project);
  if (filters.q?.trim())
    query = query.ilike(
      "description",
      `%${filters.q
        .trim()
        .replaceAll(/[%,()]/g, "")
        .slice(0, 80)}%`,
    );
  const { data, error } = await query;
  if (error) throw new Error("No se pudieron cargar los movimientos.");
  return data ?? [];
}

export async function getTransaction(id: string) {
  if (!transactionIdSchema.safeParse(id).success) return null;
  const { supabase, profile, permissions } =
    await requireModule("transactions");
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("household_id", profile.household_id)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el movimiento.");
  const [loan, shoppingList, shoppingItem, inventoryItem] = await Promise.all([
    data?.loan_id
      ? supabase
          .from("loans")
          .select(
            "id,debtor,amount,recovered_amount,date,expected_payment_date",
          )
          .eq("id", data.loan_id)
          .eq("household_id", profile.household_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    data
      ? supabase
          .from("shopping_lists")
          .select("id,name,store,status")
          .eq("transaction_id", data.id)
          .eq("household_id", profile.household_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    data
      ? supabase
          .from("shopping_items")
          .select("id,name,status")
          .eq("transaction_id", data.id)
          .eq("household_id", profile.household_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    data
      ? supabase
          .from("inventory_items")
          .select("id,name,location")
          .eq("transaction_id", data.id)
          .eq("household_id", profile.household_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (
    loan.error ||
    shoppingList.error ||
    shoppingItem.error ||
    inventoryItem.error
  )
    throw new Error("No se pudo cargar el origen del movimiento.");
  return {
    transaction: data,
    loan: loan.data,
    sources: {
      shoppingList: shoppingList.data,
      shoppingItem: shoppingItem.data,
      inventoryItem: inventoryItem.data,
    },
    canEdit: profile.role === "admin" || permissions.transactions === "edit",
  };
}
