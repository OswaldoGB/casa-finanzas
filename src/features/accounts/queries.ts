import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { cardStatementCycle } from "@/features/finance/card-cycle";
import { todayInTimeZone } from "@/features/recurring/processing";
import type { Database } from "@/lib/supabase/database.types";
import { accountIdSchema } from "./schemas";

export type Account = Database["public"]["Tables"]["accounts"]["Row"];
export type AccountWithBalance = Account & { balance: number };

export async function getAccounts() {
  const { supabase, profile, permissions } = await requireModule(
    "accounts",
    "view",
  );
  const [accountsResult, balancesResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("household_id", profile.household_id)
      .order("is_archived")
      .order("name"),
    supabase.rpc("account_balances"),
  ]);
  if (accountsResult.error || balancesResult.error)
    throw new Error("No se pudieron cargar las cuentas.");
  const balances = new Map(
    (balancesResult.data ?? []).map(({ account_id, balance }) => [
      account_id,
      Number(balance),
    ]),
  );
  return {
    accounts: (accountsResult.data ?? []).map((account) => ({
      ...account,
      balance: balances.get(account.id) ?? Number(account.opening_balance),
    })),
    canEdit: profile.role === "admin" || permissions.accounts === "edit",
  };
}

export async function getAccount(id: string) {
  if (!accountIdSchema.safeParse(id).success) return null;
  const { accounts, canEdit } = await getAccounts();
  const account = accounts.find((item) => item.id === id) ?? null;
  if (!account) return { account: null, canEdit, statement: null, history: [] };
  const { supabase, profile, permissions } = await requireModule("accounts");
  const canViewTransactions = canAccess(
    profile.role,
    permissions,
    "transactions",
    "view",
  );
  const historyPromise = canViewTransactions
    ? supabase
        .from("transactions")
        .select("id,date,type,status,amount,description")
        .eq("household_id", profile.household_id)
        .or(`account_id.eq.${id},destination_account_id.eq.${id}`)
        .order("date", { ascending: false })
        .limit(50)
    : null;
  const timezonePromise =
    account.type === "credit_card"
      ? supabase
          .from("households")
          .select("timezone")
          .eq("id", profile.household_id)
          .single()
      : null;
  const [historyResult, timezoneResult] = await Promise.all([
    historyPromise,
    timezonePromise,
  ]);
  if (historyResult?.error || timezoneResult?.error)
    throw new Error("No se pudo cargar el detalle de la cuenta.");
  let statement: {
    startsOn: string;
    closesOn: string;
    dueOn: string;
    balance: number;
  } | null = null;
  if (account.type === "credit_card" && timezoneResult?.data) {
    const cycle = cardStatementCycle(
      todayInTimeZone(new Date(), timezoneResult.data.timezone),
      account.statement_closing_day!,
      account.payment_due_day!,
    );
    const { data: balance, error } = await supabase.rpc("account_balance_on", {
      p_account_id: id,
      p_date: cycle.closesOn,
    });
    if (error) throw new Error("No se pudo calcular el estado de cuenta.");
    statement = { ...cycle, balance: Number(balance ?? 0) };
  }
  return {
    account,
    canEdit,
    statement,
    history: historyResult?.data ?? [],
  };
}
