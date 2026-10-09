# Card Statement Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bank-reconciled credit-card statements and their included installments visually clear, and settle them automatically when a card payment covers the bank amount.

**Architecture:** Persist a snapshot of each installment included in a bank statement and each payment amount applied to that snapshot. A replacement atomic payment RPC distributes payment value FIFO over open statements and their installment lines. Server queries expose normalized statement status and installment state; the account page renders those values without recreating financial rules in React.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Tailwind CSS 4, Supabase/PostgreSQL RPCs, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-card-statement-settlement-design.md`

## Global Constraints

- The bank's `bank_cash_due` is authoritative for whether a reconciled statement is paid.
- Keep the app-calculated total visible as a comparison; never turn its difference into another payment.
- Do not mutate `card_installment_plans.paid_installments` for payments made in this new flow.
- Apply partial payments to the oldest open statement, then its oldest included installment.
- Do not settle installments whose statement cutoff has not occurred.
- Preserve idempotency by using the existing request UUID passed to the payment RPC.

## Review Focus

- A payment exactly equal to the bank amount must settle its statement even when the app total differs.
- A partial payment spanning two statements must never allocate to the newer statement first.
- A repeated submission with the same request UUID must not create duplicate transfers or allocations.
- A bank statement edited after an allocation must reject a new amount below the amount already allocated.
- Installments not yet included in a statement must remain future installments in projections and UI.

---

### Task 1: Persist statement-installment snapshots and settle payments atomically

**Files:**
- Create: `supabase/migrations/20261009000039_card_statement_installment_settlement.sql`
- Create: `src/features/accounts/card-payment-allocation.ts`
- Create: `src/features/accounts/card-payment-allocation.test.ts`

**Interfaces:**
- Consumes: `public.card_statements`, `public.card_statement_allocations`, `public.card_installment_schedule`, `public.pay_credit_card`, and `public.upsert_card_statement`.
- Produces: `public.card_statement_installments`, `public.card_installment_payment_allocations`, `public.card_statement_settlement_snapshot(uuid)`, `public.save_card_statement_with_installments(...)`, and `public.pay_credit_card_and_settle(...)`.

- [ ] **Step 1: Write failing allocation tests that define FIFO behavior**

Create a pure allocation planner. It gives the database implementation an exact,
tested order and keeps the financial rule reviewable without requiring a local
Docker Supabase instance:

```ts
expect(planCardPayment(45, [
  { id: "old", unpaid: 40, closesOn: "2026-10-07", installments: [{ id: "one", amount: 15, paid: 0 }] },
  { id: "new", unpaid: 50, closesOn: "2026-11-07", installments: [{ id: "two", amount: 20, paid: 0 }] },
])).toEqual({
  statements: [{ statementId: "old", amount: 40 }, { statementId: "new", amount: 5 }],
  installments: [{ installmentId: "one", amount: 15 }],
});
```

- [ ] **Step 2: Run the test and verify it fails because the planner does not exist**

Run: `npm test -- --run src/features/accounts/card-payment-allocation.test.ts`

Expected: FAIL with module or export not found.

- [ ] **Step 3: Implement the cents-safe allocation planner**

Implement `planCardPayment(payment, statements)` using integer cents. It must
return statement and installment allocations in cutoff order, only allocate an
installment up to its unpaid value, and never allocate an installment from a
newer statement before the older statement is fully covered.

- [ ] **Step 4: Add snapshot tables and read access in one migration**

Add `card_statement_installments` with immutable schedule values, and payment allocations against those lines:

```sql
create table public.card_statement_installments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  statement_id uuid not null,
  plan_id uuid not null,
  installment smallint not null,
  close_date date not null,
  due_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  unique (statement_id, plan_id, installment),
  foreign key (statement_id, household_id) references public.card_statements(id, household_id) on delete cascade,
  foreign key (plan_id, household_id) references public.card_installment_plans(id, household_id) on delete restrict
);
create table public.card_installment_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  card_payment_id uuid not null,
  statement_installment_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  unique (card_payment_id, statement_installment_id),
  foreign key (card_payment_id, household_id) references public.card_payments(id, household_id) on delete cascade,
  foreign key (statement_installment_id, household_id) references public.card_statement_installments(id, household_id) on delete cascade
);
```

Enable RLS and grant a household-scoped `select` policy to authenticated users with `accounts:view` for both tables. Add indexes on `statement_id` and `statement_installment_id`.

- [ ] **Step 5: Implement statement snapshot and payment settlement RPCs**

Implement `card_statement_settlement_snapshot(p_statement_id uuid)` to insert scheduled rows satisfying `schedule.close_date <= statement.closes_on`, skip rows already bound to another statement, and return nothing. Replace the action-facing entry point with:

```sql
create function public.save_card_statement_with_installments(
  p_id uuid, p_card_id uuid, p_closes_on date, p_due_on date,
  p_bank_cash_due numeric, p_note text default ''
) returns uuid;

create function public.pay_credit_card_and_settle(
  p_id uuid, p_card_id uuid, p_date date, p_sources jsonb
) returns uuid;
```

`pay_credit_card_and_settle` must call `pay_credit_card`, calculate the payment total from its source rows, lock open statement rows ordered by `closes_on,id`, insert `card_statement_allocations` until the amount is exhausted, and insert line allocations in `close_date,installment,id` order. When a statement is fully covered, its remaining snapshot lines must be fully allocated even if prior partial allocation logic left none pending. Reject invalid data with clear Spanish messages.

- [ ] **Step 6: Run unit tests and apply the migration**

Run: `npm test -- --run src/features/accounts/card-payment-allocation.test.ts`

Expected: PASS. Then run `npx supabase db reset` against the local test database and `npx supabase db push` only after reviewing the remote migration list.

- [ ] **Step 7: Commit the database layer**

```bash
git add supabase/migrations/20261009000039_card_statement_installment_settlement.sql src/features/accounts/card-payment-allocation.ts src/features/accounts/card-payment-allocation.test.ts
git commit -m "feat: liquidar cuotas con estados de tarjeta"
```

### Task 2: Normalize statement and installment status for server consumers

**Files:**
- Create: `src/features/accounts/card-settlement.ts`
- Create: `src/features/accounts/card-settlement.test.ts`
- Modify: `src/features/accounts/queries.ts`
- Modify: `src/features/accounts/card-actions.ts`
- Modify: `src/features/accounts/card-schemas.ts`

**Interfaces:**
- Consumes: raw `card_statements`, snapshot installment rows, and their allocations.
- Produces: `statementSettlementStatus(input)`, `installmentSettlementStatus(input)`, and `CardStatementSummary` returned by `getAccount`.

- [ ] **Step 1: Write failing unit tests for the pure status helpers**

```ts
expect(statementSettlementStatus({ bankDue: 80, paid: 0 })).toBe("pending");
expect(statementSettlementStatus({ bankDue: 80, paid: 30 })).toBe("partial");
expect(statementSettlementStatus({ bankDue: 80, paid: 80 })).toBe("settled");
expect(installmentSettlementStatus({ amount: 15, paid: 14.99 })).toBe("included");
expect(installmentSettlementStatus({ amount: 15, paid: 15 })).toBe("settled");
```

- [ ] **Step 2: Run the tests and verify they fail because the helpers do not exist**

Run: `npm test -- --run src/features/accounts/card-settlement.test.ts`

Expected: FAIL with module or export not found.

- [ ] **Step 3: Implement cents-safe status helpers and typed summaries**

Create `card-settlement.ts` with integer-cent comparisons and these types:

```ts
export type StatementStatus = "pending" | "partial" | "settled";
export type InstallmentStatus = "future" | "included" | "settled";
export type CardStatementSummary = {
  id: string; closesOn: string; dueOn: string; appTotal: number;
  bankDue: number; paid: number; unpaid: number; status: StatementStatus;
  note: string; installments: CardStatementInstallmentSummary[];
};
```

In `getAccount`, query statement installment snapshots and their payment allocations, group them by statement, and expose the typed summaries. Query the schedule only for rows not present in a snapshot when building a plan’s future state.

- [ ] **Step 4: Replace manual allocation input in actions**

In `payCard`, remove parsing of hidden `allocation` fields and call `pay_credit_card_and_settle` with the validated sources. In `saveCardStatement`, call `save_card_statement_with_installments` so snapshots exist as soon as the bank state is saved. Keep existing request IDs and path revalidation.

- [ ] **Step 5: Run focused tests and type checking**

Run: `npm test -- --run src/features/accounts/card-settlement.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the server data contract**

```bash
git add src/features/accounts/card-settlement.ts src/features/accounts/card-settlement.test.ts src/features/accounts/queries.ts src/features/accounts/card-actions.ts src/features/accounts/card-schemas.ts
git commit -m "feat: exponer estados conciliados de tarjeta"
```

### Task 3: Replace the credit-card detail with a visual settlement view

**Files:**
- Create: `src/features/accounts/components/card-statement-cards.tsx`
- Create: `src/features/accounts/components/card-installment-timeline.tsx`
- Create: `src/features/accounts/card-payment-preview.ts`
- Create: `src/features/accounts/card-payment-preview.test.ts`
- Modify: `src/features/accounts/components/card-forms.tsx`
- Modify: `src/features/accounts/components/card-statement-form.tsx`
- Modify: `src/app/(app)/accounts/[id]/page.tsx`

**Interfaces:**
- Consumes: `CardStatementSummary`, card balance, future installment amount, and account payment sources.
- Produces: visual summary header, state cards, installment timeline, and a payment form with automatic settlement preview.

- [ ] **Step 1: Write failing tests for the payment preview**

The project has Vitest unit tests but no browser/component test runner. Test the
pure copy model used by the payment form instead:

```ts
expect(paymentPreview(80, [{ dueOn: "2026-10-12", unpaid: 50 }, { dueOn: "2026-11-12", unpaid: 45 }]))
  .toBe("Este pago salda 1 corte y deja $15.00 pendientes del siguiente.");
```

- [ ] **Step 2: Run the test and verify it fails because the preview does not exist**

Run: `npm test -- --run src/features/accounts/card-payment-preview.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Build the focused visual components**

Create a three-card summary with `Deuda total`, `Próximo pago según banco`, and `Cuotas futuras`. Create a state-card component that uses an accessible progress element:

```tsx
<progress max={statement.bankDue} value={statement.paid} aria-label={`Pago de ${statement.closesOn}`} />
```

Show Bank, App, paid, remaining, difference, note, and a color chip for status. Create a timeline for each installment plan where snapshot rows become `Saldada`, snapshot rows unpaid become `Incluida en el corte`, and unsnapshotted schedule rows are `Futura`.

- [ ] **Step 4: Simplify the payment form**

Remove the manual statement checkbox/allocation UI from `CardPaymentForm`. Its default amount is the sum of currently unpaid statement values. Under the amount, render a plain-language preview such as `Este pago salda el corte del 7 oct. y deja $12.40 pendientes del siguiente`. The final distribution remains server-authoritative.

- [ ] **Step 5: Integrate the components into the account page**

Replace the current four-column statement rows and text-only installment calendar with the new components. Preserve all account editing, archive, payment-source, and transaction-history behavior. Keep the layout horizontally safe on 320px mobile screens by using wrapping grids and no fixed widths.

- [ ] **Step 6: Run preview tests and full validation**

Run: `npm test -- --run src/features/accounts/card-payment-preview.test.ts`

Expected: PASS.

Run: `npm run check`

Expected: PASS.

- [ ] **Step 7: Commit the visual experience**

```bash
git add src/features/accounts/components/card-statement-cards.tsx src/features/accounts/components/card-installment-timeline.tsx src/features/accounts/card-payment-preview.ts src/features/accounts/card-payment-preview.test.ts src/features/accounts/components/card-forms.tsx src/features/accounts/components/card-statement-form.tsx src/app/(app)/accounts/[id]/page.tsx
git commit -m "feat: visualizar cortes y cuotas de tarjeta"
```

### Task 4: Keep forecasts and activity consistent with reconciled settlement

**Files:**
- Modify: `src/features/analytics/queries.ts`
- Modify: `src/features/projections/queries.ts`
- Modify: `src/features/projections/logic.ts`
- Modify: `src/features/projections/logic.test.ts`
- Modify: `src/features/analytics/queries.test.ts` or create `src/features/analytics/card-reconciliation.test.ts`

**Interfaces:**
- Consumes: normalized unpaid bank statements and future-only installment data.
- Produces: one upcoming bank payment per open reconciled statement and forecasts that do not add its settled/included installments a second time.

- [ ] **Step 1: Write failing regression tests for no double counting**

Add a projection fixture with a $100 reconciled bank statement that contains a $20 installment and a $40 future installment. Assert the statement month includes $100 once and the future installment is projected only after its own future cutoff:

```ts
expect(months[0].expense).toBe(100);
expect(months[1].expense).toBe(40);
```

Add an upcoming-payment fixture that excludes a settled statement and includes an unpaid one at its bank due date.

- [ ] **Step 2: Run the regression tests and verify they fail on the current duplicate schedule behavior**

Run: `npm test -- --run src/features/projections/logic.test.ts src/features/analytics/card-reconciliation.test.ts`

Expected: FAIL with the statement installment counted again or an invalid future item.

- [ ] **Step 3: Filter schedules through settlement snapshots**

Extend the query contracts to fetch open statement IDs and snapshot cutoff data. In `projectCash`, omit installment schedule rows whose `plan_id/installment` is in a reconciled statement, whether that statement is unpaid or settled; retain only installments with no statement snapshot. In analytics, use each unpaid reconciled statement’s bank amount and omit settled statements.

- [ ] **Step 4: Run regression tests, full check, and production build**

Run: `npm test -- --run src/features/projections/logic.test.ts src/features/analytics/card-reconciliation.test.ts`

Expected: PASS.

Run: `npm run check`

Expected: PASS.

Run: `npm run build`

Expected: PASS with `/accounts/[id]`, `/dashboard`, and `/projections` listed as dynamic routes.

- [ ] **Step 5: Commit the downstream reconciliation behavior**

```bash
git add src/features/analytics/queries.ts src/features/projections/queries.ts src/features/projections/logic.ts src/features/projections/logic.test.ts src/features/analytics/card-reconciliation.test.ts
git commit -m "fix: evitar cuotas duplicadas tras conciliación"
```

## Final verification

- [ ] Apply the new migration to the linked Supabase project with `npx supabase db push`.
- [ ] Run `npm run db:types` and commit generated types if they change.
- [ ] Execute `npm run check` and `npm run build` after type generation.
- [ ] Deploy with `npx --yes vercel@latest deploy --prod --yes` and inspect the resulting URL until status is `Ready`.
- [ ] Manually verify a full statement payment, a partial payment, an installment status transition, dashboard upcoming amount, and a mobile-width card page.
