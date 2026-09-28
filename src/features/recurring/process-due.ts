import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { planOccurrence, todayInTimeZone } from "./processing";

type Rule = Database["public"]["Tables"]["recurring_rules"]["Row"];

// The caller must have already checked that the session belongs to this household.
export async function processRecurringForHousehold(
  householdId: string,
  now = new Date(),
) {
  const admin = createAdminClient();
  const { data: household, error: householdError } = await admin
    .from("households")
    .select("timezone")
    .eq("id", householdId)
    .single();
  if (householdError) throw householdError;
  const today = todayInTimeZone(now, household.timezone);
  const { data: rules, error: rulesError } = await admin
    .from("recurring_rules")
    .select("*")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .lte("next_run_date", today);
  if (rulesError) throw rulesError;

  let created = 0;
  for (const initialRule of rules) {
    const accountIds = [
      initialRule.account_id,
      initialRule.destination_account_id,
    ].filter((id): id is string => Boolean(id));
    if (accountIds.length > 0) {
      const { data: accounts, error } = await admin
        .from("accounts")
        .select("id,is_archived")
        .eq("household_id", householdId)
        .in("id", accountIds);
      if (error) throw error;
      if (
        accounts.length !== accountIds.length ||
        accounts.some((account) => account.is_archived)
      ) {
        const { error: deactivateError } = await admin
          .from("recurring_rules")
          .update({ is_active: false })
          .eq("id", initialRule.id)
          .eq("household_id", householdId);
        if (deactivateError) throw deactivateError;
        continue;
      }
    }
    let rule: Rule = initialRule;
    while (true) {
      const occurrence = planOccurrence(rule, today);
      if (!occurrence) break;
      const { error: insertError } = await admin.from("transactions").insert({
        household_id: rule.household_id,
        created_by: rule.created_by,
        type: rule.type,
        status: occurrence.status,
        amount: rule.amount,
        date: occurrence.date,
        account_id: rule.account_id,
        destination_account_id: rule.destination_account_id,
        category_id: rule.category_id,
        payment_method_id: rule.payment_method_id,
        description: rule.description,
        notes: rule.notes,
        project_id: rule.project_id,
        loan_id: rule.loan_id,
        savings_goal_id: rule.savings_goal_id,
        recurring_rule_id: rule.id,
      });
      if (insertError) {
        if (insertError.code !== "23505") throw insertError;
        const { data: existing, error: lookupError } = await admin
          .from("transactions")
          .select("id")
          .eq("recurring_rule_id", rule.id)
          .eq("date", occurrence.date)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (!existing) throw insertError;
      } else {
        created++;
      }

      const { data: advanced, error: updateError } = await admin
        .from("recurring_rules")
        .update({
          next_run_date: occurrence.nextRunDate,
          is_active: occurrence.isActive,
        })
        .eq("id", rule.id)
        .eq("household_id", householdId)
        .eq("next_run_date", occurrence.date)
        .eq("updated_at", rule.updated_at)
        .select("*")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!advanced) break; // Another worker or an edit moved the rule forward.
      rule = advanced;
    }
  }
  return created;
}

export async function processAllDueRecurring(now = new Date()) {
  const admin = createAdminClient();
  let created = 0;
  for (let offset = 0; ; offset += 1000) {
    const { data: households, error } = await admin
      .from("households")
      .select("id")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    for (const household of households)
      created += await processRecurringForHousehold(household.id, now);
    if (households.length < 1000) break;
  }
  return created;
}
