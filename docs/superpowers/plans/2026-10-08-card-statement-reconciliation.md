# Conciliación de estados de cuenta de tarjetas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conciliar el pago de contado y fecha límite que reporta el banco con el cálculo propio de cada tarjeta, y presentar cuotas claras y vinculadas al corte correspondiente.

**Architecture:** Se agregan estados de cuenta inmutables por tarjeta/corte y asignaciones de pago por antigüedad. Las consultas combinan el estado conciliado con el cálculo existente sin reescribir transacciones ni planes de cuota; las mutaciones SQL continúan siendo la fuente de verdad para saldos y permisos.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Supabase/PostgreSQL, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-08-card-statement-reconciliation-design.md`

## Global Constraints

- El corte configurado de una tarjeta no cambia por estado; la fecha límite se ingresa por estado emitido por el banco.
- El “Pago de contado según el banco” no modifica transacciones, cuotas ni la deuda calculada por la app.
- Los pagos desde una o varias cuentas siguen siendo transferencias y no duplican gastos.
- Estados y asignaciones deben validar hogar, permisos, tarjeta activa, dos decimales e idempotencia.
- Los pagos existentes se conservan sin asignación y siguen reduciendo la deuda total.
- La interfaz de cuotas debe responder en móvil sin desbordamiento horizontal.

## Review Focus

- Un estado con un importe bancario menor que lo ya abonado debe rechazarse al editarse; se prueba en la validación SQL y de esquema del Task 1.
- Un pago que cubre dos estados debe asignarse al más antiguo antes de tocar el siguiente; se prueba en `card-statements.test.ts` del Task 2.
- Una tarjeta sin estados conciliados debe conservar el cálculo y formulario de pago actual; se prueba en `card-statement-view.test.ts` del Task 3.
- Una cuota con pagos previos debe mostrar el número original de cuota y saldo pendiente correctos; se prueba en `installment-presenter.test.ts` del Task 4.
- Un cargo procesado fuera de su corte debe conservarse en el total de la app y exponer la diferencia bancaria sin mutar su movimiento; se prueba en `card-statements.test.ts` del Task 2.

---

## File Structure

- `supabase/migrations/20261008000037_card_statement_reconciliation.sql`: tablas, RLS y funciones SQL para estados, asignaciones y pago.
- `src/features/accounts/card-statements.ts`: tipos y lógica pura de diferencia, pendiente y reparto por antigüedad.
- `src/features/accounts/card-statements.test.ts`: pruebas de cálculo y asignación.
- `src/features/accounts/card-schemas.ts`: esquemas Zod de estado conciliado y pago con asignaciones.
- `src/features/accounts/card-actions.ts`: acciones para crear/editar estados y registrar pagos asignados.
- `src/features/accounts/queries.ts`: lectura de estados conciliados, cuotas enriquecidas y resumen de tarjeta.
- `src/features/accounts/components/card-statement-form.tsx`: formulario de registro/edición de estado del banco.
- `src/features/accounts/components/card-forms.tsx`: pago de tarjeta con desglose de estados y tarjetas de cuotas renovadas.
- `src/app/(app)/accounts/[id]/page.tsx`: composición de resumen, historial de estados, pagos y cuotas.
- `src/features/accounts/card-statement-view.test.ts`: pruebas del modelo de vista sin estado conciliado y con diferencia.
- `src/features/accounts/installment-presenter.ts`: modelo de vista compacto de cuotas.
- `src/features/accounts/installment-presenter.test.ts`: pruebas de progreso y próxima cuota.

## Task 1: Persistencia segura de estados y asignaciones

**Files:**
- Create: `supabase/migrations/20261008000037_card_statement_reconciliation.sql`
- Modify: `src/lib/supabase/database.types.ts` mediante `npm run db:types`
- Modify: `src/features/accounts/card-schemas.ts`
- Test: `src/features/accounts/card-schemas.test.ts`

**Interfaces:**
- Produces SQL tables `card_statements`, `card_statement_allocations`.
- Produces RPC `upsert_card_statement(p_id uuid, p_card_id uuid, p_closes_on date, p_due_on date, p_bank_cash_due numeric, p_note text)` and an extension of `pay_credit_card` that accepts `p_allocations jsonb`.
- Produces TypeScript schema `cardStatementSchema` with `card_id`, `closes_on`, `due_on`, `bank_cash_due`, `note`.

- [ ] **Step 1: Write the failing schema tests**

```ts
it("acepta el pago de contado y una fecha límite posterior al corte", () => {
  expect(cardStatementSchema.safeParse({
    card_id: "00000000-0000-4000-8000-000000000001",
    closes_on: "2026-10-07",
    due_on: "2026-10-27",
    bank_cash_due: "154.80",
    note: "Compra en proceso",
  }).success).toBe(true);
});

it("rechaza una fecha límite igual o anterior al corte", () => {
  expect(cardStatementSchema.safeParse({
    card_id: "00000000-0000-4000-8000-000000000001",
    closes_on: "2026-10-07",
    due_on: "2026-10-07",
    bank_cash_due: "154.80",
    note: "",
  }).success).toBe(false);
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run: `npx vitest run src/features/accounts/card-schemas.test.ts`

Expected: FAIL because `cardStatementSchema` does not exist.

- [ ] **Step 3: Add the minimal Zod schema**

```ts
export const cardStatementSchema = z.object({
  card_id: id,
  closes_on: date,
  due_on: date,
  bank_cash_due: amount,
  note: z.string().trim().max(500),
}).refine(({ closes_on, due_on }) => due_on > closes_on, {
  path: ["due_on"],
  message: "La fecha límite debe ser posterior al corte",
});
```

- [ ] **Step 4: Add the migration**

Create `card_statements` with a unique `(card_id, closes_on)` constraint, numeric values constrained to positive two-decimal money, RLS read policy tied to Accounts view access, and all mutation access only through security-definer functions.

Create `card_statement_allocations` with unique `(card_payment_id, statement_id)`, positive money, RLS read policy, and no direct client writes.

The statement function must calculate `app_total` server-side using the existing close-date calculation, reject a non-card/archived card, validate that `closes_on` matches the configured closing day, and reject reducing `bank_cash_due` below allocated payments. It must lock its statement row before update and be idempotent by `p_id`.

Extend `pay_credit_card` to atomically validate allocations, insert the unchanged transfer transactions, allocate in order, and reject any allocation that exceeds a statement’s unpaid bank amount. An empty allocation array preserves the current general-payment behavior.

- [ ] **Step 5: Apply migration and regenerate types**

Run: `npx supabase db push`

Run: `npm run db:types`

Expected: migration is applied once and generated types include both new tables and the updated RPC signature.

- [ ] **Step 6: Run schema tests to verify they pass**

Run: `npx vitest run src/features/accounts/card-schemas.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261008000037_card_statement_reconciliation.sql src/lib/supabase/database.types.ts src/features/accounts/card-schemas.ts src/features/accounts/card-schemas.test.ts
git commit -m "feat: conciliar estados de cuenta de tarjetas"
```

## Task 2: Lógica de conciliación y asignación legible

**Files:**
- Create: `src/features/accounts/card-statements.ts`
- Create: `src/features/accounts/card-statements.test.ts`
- Modify: `src/features/accounts/queries.ts`

**Interfaces:**
- Consumes `card_statements`, `card_statement_allocations`, `card_statement_unpaid`, and `card_installment_schedule` from Task 1/existing database.
- Produces `summarizeStatement(statement)` returning `{ appTotal, bankCashDue, difference, allocated, unpaid, status }`.
- Produces `allocatePayment(amount, statements)` returning `{ statementId, amount }[]` in due-date/close-date order.
- Produces `getAccount(id)` fields `statements`, `currentStatement`, and `installments` enriched with next cycle data.

- [ ] **Step 1: Write the failing pure logic tests**

```ts
it("asigna un pago a los estados pendientes de más antiguo a más reciente", () => {
  expect(allocatePayment(140, [
    { id: "old", dueOn: "2026-10-20", unpaid: 100 },
    { id: "new", dueOn: "2026-11-20", unpaid: 80 },
  ])).toEqual([
    { statementId: "old", amount: 100 },
    { statementId: "new", amount: 40 },
  ]);
});

it("conserva una diferencia cuando el banco procesa una compra para otro corte", () => {
  expect(summarizeStatement({ appTotal: 120, bankCashDue: 100, allocated: 30 }))
    .toMatchObject({ difference: -20, unpaid: 70, status: "partial" });
});
```

- [ ] **Step 2: Run the logic test to verify it fails**

Run: `npx vitest run src/features/accounts/card-statements.test.ts`

Expected: FAIL because `allocatePayment` and `summarizeStatement` do not exist.

- [ ] **Step 3: Implement pure money-safe helpers**

Use integer cents internally. `allocatePayment` sorts by `dueOn`, then `closesOn`, and never returns a negative or zero allocation. `summarizeStatement` computes difference, unpaid and statuses `unpaid`, `partial`, `paid`.

- [ ] **Step 4: Extend account query data**

Load statements and their allocations only for the selected card. Convert numeric database values to numbers at the query boundary. For the current cycle, expose a calculated estimate when no matching statement exists; once one exists, preserve both `appTotal` snapshot and `bankCashDue`.

For installment schedules, expose `planId`, `installment`, `totalInstallments`, `amount`, `closeDate`, `dueDate`, `dueIsEstimated`, and `remainingAmount`. A due date is not estimated only if a corresponding reconciled statement exists.

- [ ] **Step 5: Run logic tests to verify they pass**

Run: `npx vitest run src/features/accounts/card-statements.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/accounts/card-statements.ts src/features/accounts/card-statements.test.ts src/features/accounts/queries.ts
git commit -m "feat: calcular conciliación y pagos de tarjeta"
```

## Task 3: Estados de cuenta y pagos en la interfaz

**Files:**
- Create: `src/features/accounts/components/card-statement-form.tsx`
- Create: `src/features/accounts/card-statement-view.test.ts`
- Modify: `src/features/accounts/card-actions.ts`
- Modify: `src/features/accounts/components/card-forms.tsx`
- Modify: `src/app/(app)/accounts/[id]/page.tsx`

**Interfaces:**
- Consumes `cardStatementSchema`, `getAccount().statements`, `getAccount().currentStatement`, `allocatePayment` and Task 1 RPCs.
- Produces server action `saveCardStatement` and a `CardStatementForm` that accepts `cardId`, `estimate`, `requestId`, and optional `statement`.
- Produces `CardPaymentForm` that accepts ordered `statements` and sends `allocation_statement_id`/`allocation_amount` alongside source accounts.

- [ ] **Step 1: Write failing view-model tests**

```ts
it("muestra una estimación cuando el corte aún no fue conciliado", () => {
  expect(statementPresentation({ appTotal: 90, statement: null })).toEqual(
    expect.objectContaining({ label: "Estimado por la app", bankCashDue: null }),
  );
});

it("muestra app, banco y diferencia cuando existe un estado", () => {
  expect(statementPresentation({ appTotal: 90, statement: { bankCashDue: 84, allocated: 20 } }))
    .toMatchObject({ appTotal: 90, bankCashDue: 84, difference: -6, unpaid: 64 });
});
```

- [ ] **Step 2: Run the view-model test to verify it fails**

Run: `npx vitest run src/features/accounts/card-statement-view.test.ts`

Expected: FAIL because `statementPresentation` does not exist.

- [ ] **Step 3: Implement action and form**

`saveCardStatement` parses `cardStatementSchema`, generates/reuses `request_id`, calls `upsert_card_statement`, revalidates account/dashboard/projections paths, and returns a single success or field error.

The form preloads the app total as read-only, requires bank cash due and due date, and accepts an optional note. It labels the difference as a reconciliation, not an error.

- [ ] **Step 4: Implement payment assignment UI**

Keep the multi-account source rows. Above them, show pending reconciled states ordered by due date and a clear per-state allocation summary. The default allocation comes from `allocatePayment(total, statements)` and updates while the total changes. Submit only nonzero allocations.

For cards without states, show the existing general-payment copy and submit an empty allocation list.

- [ ] **Step 5: Compose the account page**

Replace the single “último corte” block with a primary statement card showing App, Banco, Diferencia, Pagado and Pendiente. Add a compact state history below it. Keep debt total separate, with copy that it includes future quotas.

- [ ] **Step 6: Run view-model tests to verify they pass**

Run: `npx vitest run src/features/accounts/card-statement-view.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/accounts/components/card-statement-form.tsx src/features/accounts/card-statement-view.test.ts src/features/accounts/card-actions.ts src/features/accounts/components/card-forms.tsx 'src/app/(app)/accounts/[id]/page.tsx'
git commit -m "feat: registrar y pagar estados de tarjeta"
```

## Task 4: Renovar la experiencia de cuotas

**Files:**
- Create: `src/features/accounts/installment-presenter.ts`
- Create: `src/features/accounts/installment-presenter.test.ts`
- Modify: `src/app/(app)/accounts/[id]/page.tsx`
- Modify: `src/features/accounts/components/card-forms.tsx`

**Interfaces:**
- Consumes enriched installment schedule from Task 2.
- Produces `presentInstallment(plan, schedule, today)` returning progress, paid/total labels, next payment and remaining amount.
- Produces responsive quota cards and a collapsed schedule detail.

- [ ] **Step 1: Write failing presenter tests**

```ts
it("mantiene la cuota original al importar un plan ya avanzado", () => {
  expect(presentInstallment(
    { id: "plan", paidInstallments: 4, installments: 8, amount: 400 },
    [{ installment: 5, amount: 50, closeDate: "2026-10-07", dueDate: "2026-10-28", dueIsEstimated: false }],
    "2026-10-08",
  )).toMatchObject({ progress: 50, label: "Cuota 5 de 8", remainingAmount: 200 });
});
```

- [ ] **Step 2: Run the presenter test to verify it fails**

Run: `npx vitest run src/features/accounts/installment-presenter.test.ts`

Expected: FAIL because `presentInstallment` does not exist.

- [ ] **Step 3: Implement the presenter**

Calculate progress from original total installments (`paidInstallments + pending schedule length`), select the nearest upcoming schedule row, and mark it `estimated` unless the query attached a reconciled state due date.

- [ ] **Step 4: Replace quota rows with responsive cards**

Each card includes name, progress bar, `Cuota X de Y`, pending balance, monthly amount, next close and payment date. Place the full schedule inside `details`; use `min-w-0`, `truncate`, `tabular-nums`, and a horizontal scroll wrapper only for the detailed table.

- [ ] **Step 5: Run presenter tests to verify they pass**

Run: `npx vitest run src/features/accounts/installment-presenter.test.ts`

Expected: PASS.

- [ ] **Step 6: Run the full suite and production build**

Run: `npm run check`

Run: `npm run build`

Expected: lint, types, all tests and production build pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/accounts/installment-presenter.ts src/features/accounts/installment-presenter.test.ts 'src/app/(app)/accounts/[id]/page.tsx' src/features/accounts/components/card-forms.tsx
git commit -m "feat: mejorar cuotas de tarjeta"
```

## Task 5: Publicación y comprobación final

**Files:**
- Modify: none unless a validation finding requires a minimal corrective change.

**Interfaces:**
- Consumes commits from Tasks 1–4.
- Produces a production deployment with the migration applied and an inspectable alias.

- [ ] **Step 1: Verify migration state**

Run: `npx supabase db push`

Expected: reports that all migrations are applied.

- [ ] **Step 2: Deploy production**

Run: `npx --yes vercel@latest deploy --prod --yes --logs`

Expected: build completes successfully.

- [ ] **Step 3: Verify the production alias**

Run: `npx --yes vercel@latest inspect https://casa-finanzas-six.vercel.app`

Expected: status is `Ready` and the alias resolves to the new deployment.

- [ ] **Step 4: Commit plan tracking only if changed**

```bash
git add docs/superpowers/plans/2026-10-08-card-statement-reconciliation.md
git commit -m "docs: registrar plan de conciliación de tarjeta"
```
