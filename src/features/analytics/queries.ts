import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { todayInTimeZone } from "@/features/recurring/processing";
import { cardStatementCycle } from "@/features/finance/card-cycle";
import { remainingCardPayment } from "./card-payment";
import { analyticsSnapshotSchema, reportDateRange } from "./schemas";

export type UpcomingPayment = {
  id: string;
  name: string;
  date: string;
  amount: number;
  cashImpact: number;
  kind: "recurring" | "card";
};

export async function getAnalytics(
  module: "dashboard" | "reports",
  from?: string,
  to?: string,
) {
  const { supabase, profile } = await requireModule(module);
  const [household, catalog, categoryCatalog, statementCatalog] =
    await Promise.all([
      supabase
        .from("households")
        .select("timezone")
        .eq("id", profile.household_id)
        .single(),
      supabase
        .from("accounts")
        .select(
          "id,name,type,color,is_archived,statement_closing_day,payment_due_day",
        )
        .eq("household_id", profile.household_id)
        .order("name"),
      supabase
        .from("categories")
        .select("id,icon")
        .eq("household_id", profile.household_id),
      supabase
        .from("card_statements")
        .select(
          "card_id,due_on,bank_cash_due,card_statement_allocations(amount)",
        )
        .eq("household_id", profile.household_id)
        .order("due_on"),
    ]);
  if (
    household.error ||
    catalog.error ||
    categoryCatalog.error ||
    statementCatalog.error
  )
    throw new Error("No se pudo cargar el resumen financiero.");
  const today = todayInTimeZone(new Date(), household.data.timezone);
  const datedBalances = await Promise.all(
    catalog.data.map(async (account) => {
      const result = await supabase.rpc("account_balance_on", {
        p_account_id: account.id,
        p_date: today,
      });
      if (result.error)
        throw new Error("No se pudieron calcular los saldos de hoy.");
      return [account.id, Number(result.data ?? 0)] as const;
    }),
  );
  const range = reportDateRange(today, from, to);
  const { data, error } = await supabase.rpc("analytics_snapshot", {
    p_from: range.from,
    p_to: range.to,
    p_module: module,
  });
  if (error) throw new Error("No se pudieron cargar los reportes.");
  const snapshot = analyticsSnapshotSchema.parse(data);
  const categoryIcons = new Map(
    (categoryCatalog.data ?? []).map((category) => [
      category.id,
      category.icon,
    ]),
  );
  const balances = new Map(datedBalances);
  const accounts = catalog.data.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    color: account.color,
    balance: balances.get(account.id) ?? 0,
  }));
  const horizon = new Date(`${today}T00:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 14);
  const lastDate = horizon.toISOString().slice(0, 10);
  const upcoming: UpcomingPayment[] = [...snapshot.upcoming];
  const bankStatements = new Map<string, { dueOn: string; unpaid: number }>();
  for (const item of statementCatalog.data ?? []) {
    if (bankStatements.has(item.card_id)) continue;
    bankStatements.set(item.card_id, {
      dueOn: item.due_on,
      unpaid: Math.max(
        0,
        Number(item.bank_cash_due) -
          (item.card_statement_allocations ?? []).reduce(
            (sum, allocation) => sum + Number(allocation.amount),
            0,
          ),
      ),
    });
  }
  for (const card of catalog.data.filter(
    (account) => account.type === "credit_card" && !account.is_archived,
  )) {
    const cycle = cardStatementCycle(
      today,
      card.statement_closing_day!,
      card.payment_due_day!,
    );
    const bank = bankStatements.get(card.id);
    const dueOn = bank?.dueOn ?? cycle.dueOn;
    if (dueOn < today || dueOn > lastDate) continue;
    const { data: unpaid, error: unpaidError } = await supabase.rpc(
      "card_statement_unpaid",
      {
        p_account_id: card.id,
        p_close: cycle.closesOn,
        p_today: today,
      },
    );
    if (unpaidError) throw new Error("No se pudo calcular el pago de tarjeta.");
    const debt = remainingCardPayment(
      bank?.unpaid ?? Number(unpaid ?? 0),
      card.id,
      dueOn,
      snapshot.upcoming,
    );
    if (debt > 0)
      upcoming.push({
        id: card.id,
        name: card.name,
        date: dueOn,
        amount: -debt,
        cashImpact: -debt,
        kind: "card",
      });
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  return {
    ...snapshot,
    ...range,
    today,
    accounts,
    upcoming,
    categories: snapshot.categories.map((category) => ({
      ...category,
      icon: categoryIcons.get(category.id) ?? "tag",
    })),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
