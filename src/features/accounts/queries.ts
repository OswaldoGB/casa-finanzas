import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { cardStatementCycle } from "@/features/finance/card-cycle";
import { todayInTimeZone } from "@/features/recurring/processing";
import type { Database } from "@/lib/supabase/database.types";
import { accountIdSchema } from "./schemas";
import { collectPages } from "../exports/format";
import {
  installmentSettlementStatus,
  statementSettlementStatus,
  type CardStatementSummary,
} from "./card-settlement";

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
        .select("id,date,type,status,amount,description,category_id")
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
  const historyCategoriesPromise = canViewTransactions
    ? supabase
        .from("categories")
        .select("id,name,color,icon")
        .eq("household_id", profile.household_id)
    : null;
  const [historyResult, timezoneResult, historyCategoriesResult] =
    await Promise.all([
      historyPromise,
      timezonePromise,
      historyCategoriesPromise,
    ]);
  if (
    historyResult?.error ||
    timezoneResult?.error ||
    historyCategoriesResult?.error
  )
    throw new Error("No se pudo cargar el detalle de la cuenta.");
  let statement: {
    startsOn: string;
    closesOn: string;
    dueOn: string;
    balance: number;
    unpaid: number;
    future: number;
  } | null = null;
  let today = "";
  let firstClose = "";
  let plans: Database["public"]["Tables"]["card_installment_plans"]["Row"][] =
    [];
  let schedule: Database["public"]["Functions"]["card_installment_schedule"]["Returns"] =
    [];
  let categories: { id: string; name: string }[] = [];
  let statements: CardStatementSummary[] = [];
  const canTransact = canAccess(
    profile.role,
    permissions,
    "transactions",
    "edit",
  );
  if (account.type === "credit_card" && timezoneResult?.data) {
    today = todayInTimeZone(new Date(), timezoneResult.data.timezone);
    const cycle = cardStatementCycle(
      today,
      account.statement_closing_day!,
      account.payment_due_day!,
    );
    const { data: balance, error } = await supabase.rpc("account_balance_on", {
      p_account_id: id,
      p_date: cycle.closesOn,
    });
    if (error) throw new Error("No se pudo calcular el estado de cuenta.");
    const [
      unpaid,
      unbilled,
      loadedPlans,
      loadedSchedule,
      categoryResult,
      statementResult,
    ] = await Promise.all([
      supabase.rpc("card_statement_unpaid", {
        p_account_id: id,
        p_close: cycle.closesOn,
        p_today: today,
      }),
      supabase.rpc("card_unbilled_installments", {
        p_card_id: id,
        p_date: cycle.closesOn,
      }),
      collectPages(async (offset, size) => {
        const result = await supabase
          .from("card_installment_plans")
          .select("*")
          .eq("card_id", id)
          .order("created_at")
          .order("id")
          .range(offset, offset + size - 1);
        if (result.error) throw new Error("No se pudieron cargar los planes.");
        return result.data;
      }),
      collectPages(async (offset, size) => {
        const result = await supabase
          .rpc("card_installment_schedule", {
            p_card_id: id,
            p_after: "0001-01-01",
            p_until: "9999-12-31",
          })
          .order("plan_id")
          .order("installment")
          .range(offset, offset + size - 1);
        if (result.error) throw new Error("No se pudieron cargar las cuotas.");
        return result.data;
      }),
      canTransact
        ? supabase
            .from("categories")
            .select("id,name")
            .eq("type", "expense")
            .eq("is_archived", false)
            .order("name")
        : null,
      supabase
        .from("card_statements")
        .select(
          "id,closes_on,due_on,app_total,bank_cash_due,note,card_statement_allocations(amount),card_statement_installments(id,plan_id,installment,close_date,due_date,amount,card_installment_payment_allocations(amount))",
        )
        .eq("card_id", id)
        .order("due_on"),
    ]);
    if (
      unpaid.error ||
      unbilled.error ||
      categoryResult?.error ||
      statementResult.error
    )
      throw new Error("No se pudo calcular el pago mensual.");
    plans = loadedPlans;
    schedule = loadedSchedule;
    categories = categoryResult?.data ?? [];
    statements = (statementResult.data ?? []).map((item) => {
      const paid = (item.card_statement_allocations ?? []).reduce(
        (sum, allocation) => sum + Number(allocation.amount),
        0,
      );
      const bankDue = Number(item.bank_cash_due);
      return {
        id: item.id,
        closesOn: item.closes_on,
        dueOn: item.due_on,
        appTotal: Number(item.app_total),
        bankDue,
        paid,
        unpaid: Math.max(0, bankDue - paid),
        note: item.note,
        status: statementSettlementStatus({ bankDue, paid }),
        installments: (item.card_statement_installments ?? []).map((line) => {
          const linePaid = (
            line.card_installment_payment_allocations ?? []
          ).reduce((sum, allocation) => sum + Number(allocation.amount), 0);
          const amount = Number(line.amount);
          return {
            id: line.id,
            planId: line.plan_id,
            installment: line.installment,
            closeOn: line.close_date,
            dueOn: line.due_date,
            amount,
            paid: linePaid,
            status: installmentSettlementStatus({ amount, paid: linePaid }),
          };
        }),
      };
    });
    statement = {
      ...cycle,
      balance: Math.max(0, Number(balance ?? 0) - Number(unbilled.data ?? 0)),
      unpaid: Number(unpaid.data ?? 0),
      future: Math.min(
        Math.max(0, account.balance),
        schedule
          .filter((row) => row.close_date > cycle.closesOn)
          .reduce((sum, row) => sum + Number(row.amount), 0),
      ),
    };
    const monthEnd = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    monthEnd.setUTCDate(0);
    firstClose = cardStatementCycle(
      monthEnd.toISOString().slice(0, 10),
      account.statement_closing_day!,
      account.payment_due_day!,
    ).closesOn;
    if (firstClose < today) {
      monthEnd.setUTCDate(1);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 2);
      monthEnd.setUTCDate(0);
      firstClose = cardStatementCycle(
        monthEnd.toISOString().slice(0, 10),
        account.statement_closing_day!,
        account.payment_due_day!,
      ).closesOn;
    }
  }
  return {
    account,
    canEdit,
    statement,
    history: historyResult?.data ?? [],
    historyCategories: historyCategoriesResult?.data ?? [],
    today,
    firstClose,
    plans,
    schedule,
    categories,
    statements,
    canTransact,
    paymentAccounts: accounts.filter(
      (item) => !item.is_archived && item.type !== "credit_card",
    ),
  };
}
