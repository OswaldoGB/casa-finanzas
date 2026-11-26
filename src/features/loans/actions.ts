"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModule } from "@/features/permissions/queries";
import { readPurchaseItems } from "@/features/transactions/purchase-items";
import { canAccess } from "@/features/permissions/modules";
import type { FormState } from "@/features/auth/schemas";
import {
  debtSchema,
  loanEditSchema,
  loanPersonAppearance,
  loanPersonName,
  loanPersonSelection,
  loanSchema,
  repaymentSchema,
} from "./schemas";
function refresh() {
  for (const path of [
    "/loans",
    "/accounts",
    "/transactions",
    "/dashboard",
    "/reports",
    "/projections",
  ])
    revalidatePath(path);
}
export async function saveLoanPerson(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("loans", "edit");
  const appearance = loanPersonAppearance.safeParse(Object.fromEntries(form));
  if (!appearance.success) return { error: appearance.error.issues[0].message };
  const id = form.get("id");
  if (id) {
    const person = z.string().uuid().safeParse(id);
    if (!person.success) return { error: "Persona inválida." };
    const { data, error } = await supabase
      .from("loan_people")
      .update(appearance.data)
      .eq("id", person.data)
      .eq("household_id", profile.household_id)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "No se pudo actualizar la persona." };
    revalidatePath("/loans");
    return { ok: "Apariencia actualizada." };
  }
  const name = loanPersonName.safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const { error } = await supabase.from("loan_people").insert({
    household_id: profile.household_id,
    name: name.data,
    ...appearance.data,
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "Ya existe una persona con ese nombre."
          : "No se pudo guardar la persona.",
    };
  revalidatePath("/loans");
  return { ok: "Persona agregada al catálogo." };
}

export async function setLoanPerson(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("loans", "edit");
  const id = z.string().uuid().safeParse(form.get("id"));
  const person = loanPersonSelection.safeParse(form.get("person_id"));
  if (!id.success || !person.success)
    return { error: "Revisa el préstamo y la persona seleccionada." };
  const { error } = await supabase.rpc("loan_set_person", {
    p_loan_id: id.data,
    p_person_id: person.data,
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: person.data ? "Persona vinculada." : "Persona desvinculada." };
}

export async function findLoanPurchases(search: string) {
  const { supabase, profile } = await requireModule("transactions");
  const term = z
    .string()
    .trim()
    .max(120)
    .parse(search)
    .replace(/[^\p{L}\p{N} -]/gu, " ")
    .trim();
  const query = supabase
    .from("transactions")
    .select("id,date,description,purchase_place,purchase_items,amount")
    .eq("household_id", profile.household_id)
    .eq("type", "expense")
    .eq("status", "posted")
    .neq("purchase_items", "[]")
    .order("date", { ascending: false })
    .limit(30);
  if (term)
    query.or(`description.ilike.%${term}%,purchase_place.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw new Error("No se pudieron buscar las compras.");
  if (!data.length) return [];
  const { data: allocations, error: allocationError } = await supabase
    .from("loan_purchase_items")
    .select("purchase_id,item_id,quantity")
    .in(
      "purchase_id",
      data.map((row) => row.id),
    );
  if (allocationError)
    throw new Error("No se pudieron comprobar las unidades disponibles.");
  return data
    .map(({ purchase_items, ...purchase }) => ({
      ...purchase,
      items: readPurchaseItems(purchase_items)
        .map((item) => ({
          ...item,
          quantity:
            item.quantity -
            (allocations ?? []).reduce(
              (sum, allocation) =>
                allocation.purchase_id === purchase.id &&
                allocation.item_id === item.id
                  ? sum + allocation.quantity
                  : sum,
              0,
            ),
        }))
        .filter((item) => item.quantity > 0 && item.unitCents > 0),
    }))
    .filter((purchase) => purchase.items.length > 0);
}

const purchaseSelection = z
  .array(
    z.object({
      purchase_id: z.string().uuid(),
      item_id: z.string().uuid(),
      quantity: z.number().int().min(1).max(100000),
    }),
  )
  .min(1)
  .max(100);
const repaymentSelection = z
  .array(
    z.object({
      loan_item_id: z.string().uuid(),
      amount_cents: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    }),
  )
  .min(1)
  .max(100);

function parseSelection(value: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

export async function createLoan(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule(
    "loans",
    "edit",
  );
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para editar movimientos." };
  if (form.has("selected_purchases")) {
    const person = z.string().uuid().safeParse(form.get("person_id"));
    const selection = purchaseSelection.safeParse(
      parseSelection(form.get("selected_purchases")),
    );
    const date = z.string().date().safeParse(form.get("date"));
    const expectedValue = form.get("expected_payment_date");
    const expected = expectedValue
      ? z.string().date().safeParse(expectedValue)
      : null;
    const notes = z
      .string()
      .trim()
      .max(2000)
      .safeParse(form.get("notes") ?? "");
    if (!person.success) return { error: "Elige una persona del catálogo." };
    if (!selection.success)
      return { error: "Selecciona los ítems y las unidades de cada compra." };
    if (!date.success || expected?.success === false || !notes.success)
      return { error: "Revisa las fechas y notas del préstamo." };
    const result = await supabase.rpc("loan_create_from_purchases", {
      p_person_id: person.data,
      p_date: date.data,
      p_expected_payment_date: expected?.data ?? null,
      p_notes: notes.data || null,
      p_items: selection.data,
    });
    if (result.error) return { error: result.error.message };
    refresh();
    return { ok: "Préstamo registrado con sus compras vinculadas." };
  }
  const parsed = loanSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const v = parsed.data;
  const person = loanPersonSelection.safeParse(form.get("person_id") ?? "");
  if (!person.success) return { error: "Persona inválida." };
  const values = {
    p_amount: v.amount,
    p_date: v.date,
    p_expected_payment_date: v.expected_payment_date || undefined,
    p_notes: v.notes,
    p_account_id: v.account_id,
    p_already_recorded: v.balance_effect === "already_recorded",
  };
  const result = person.data
    ? await supabase.rpc("loan_create_for_person", {
        ...values,
        p_person_id: person.data,
        p_direction: "lent",
      })
    : await supabase.rpc("loan_create_with_balance_effect", {
        ...values,
        p_debtor: v.debtor,
      });
  if (result.error) return { error: result.error.message };
  refresh();
  return {
    ok:
      v.balance_effect === "already_recorded"
        ? "Préstamo registrado sin volver a mover el saldo."
        : "Préstamo registrado y saldo actualizado.",
  };
}
export async function updateLoan(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule(
    "loans",
    "edit",
  );
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para editar movimientos." };
  const parsed = loanEditSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const value = parsed.data;
  const result = await supabase.rpc("loan_update", {
    p_loan_id: value.id,
    p_debtor: value.debtor,
    p_amount: value.amount,
    p_date: value.date,
    p_expected_payment_date: value.expected_payment_date || undefined,
    p_notes: value.notes,
    p_account_id: value.account_id,
    p_already_recorded: value.balance_effect === "already_recorded",
  });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: "Préstamo actualizado." };
}
export async function saveDebt(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("loans", "edit");
  const parsed = debtSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const v = parsed.data;
  const person = loanPersonSelection.safeParse(form.get("person_id") ?? "");
  if (!person.success) return { error: "Persona inválida." };
  const result = v.id
    ? await supabase.rpc("loan_update", {
        p_loan_id: v.id,
        p_debtor: v.creditor,
        p_amount: v.amount,
        p_date: v.date,
        p_expected_payment_date: v.expected_payment_date || undefined,
        p_notes: v.notes,
        p_already_recorded: false,
      })
    : person.data
      ? await supabase.rpc("loan_create_for_person", {
          p_person_id: person.data,
          p_direction: "borrowed",
          p_amount: v.amount,
          p_date: v.date,
          p_expected_payment_date: v.expected_payment_date || undefined,
          p_notes: v.notes,
        })
      : await supabase.rpc("debt_create", {
          p_creditor: v.creditor,
          p_amount: v.amount,
          p_date: v.date,
          p_expected_payment_date: v.expected_payment_date || undefined,
          p_notes: v.notes,
        });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: v.id ? "Deuda actualizada." : "Deuda registrada." };
}
export async function payDebt(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule(
    "loans",
    "edit",
  );
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para editar movimientos." };
  const parsed = repaymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const result = await supabase.rpc("debt_pay", {
    p_loan_id: v.id,
    p_amount: v.amount,
    p_date: v.date,
    p_account_id: v.account_id,
  });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: "Abono registrado." };
}
export async function repayLoan(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule(
    "loans",
    "edit",
  );
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para editar movimientos." };
  if (form.has("selected_repayments")) {
    const selection = repaymentSelection.safeParse(
      parseSelection(form.get("selected_repayments")),
    );
    const ids = z
      .object({
        id: z.string().uuid(),
        date: z.string().date(),
        account_id: z.string().uuid(),
      })
      .safeParse(Object.fromEntries(form));
    if (!ids.success || !selection.success)
      return { error: "Revisa la cuenta y los importes a abonar." };
    const result = await supabase.rpc("loan_repay_items", {
      p_loan_id: ids.data.id,
      p_account_id: ids.data.account_id,
      p_date: ids.data.date,
      p_items: selection.data,
    });
    if (result.error) return { error: result.error.message };
    refresh();
    return { ok: "Abono registrado." };
  }
  const parsed = repaymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const result = await supabase.rpc("loan_repay", {
    p_loan_id: v.id,
    p_amount: v.amount,
    p_date: v.date,
    p_account_id: v.account_id,
  });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: "Abono registrado." };
}
export async function writeOffLoan(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("loans", "edit");
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Préstamo inválido." };
  const result = await supabase.rpc("loan_write_off", { p_loan_id: id.data });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: "Préstamo cerrado sin registrar un gasto." };
}
