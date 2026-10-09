"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import type { Database } from "@/lib/supabase/database.types";
import {
  deactivateRecurringRule,
  deleteRecurringRule,
  saveRecurringRule,
} from "../actions";

type Rule = Database["public"]["Tables"]["recurring_rules"]["Row"];
type Option = { id: string; name: string; is_archived: boolean };
type Category = Option & { type: "income" | "expense" };

type Props = {
  rules: Rule[];
  accounts: Option[];
  categories: Category[];
  methods: Option[];
};

const selectClass = "bg-background h-9 w-full rounded-md border px-3 text-sm";

function RuleForm({
  current,
  accounts,
  categories,
  methods,
}: Omit<Props, "rules"> & { current?: Rule }) {
  const [state, action, pending] = useActionState(saveRecurringRule, undefined);
  const [type, setType] = useState<"income" | "expense" | "transfer">(
    current?.type === "income" || current?.type === "transfer"
      ? current.type
      : "expense",
  );
  const [accountId, setAccountId] = useState(current?.account_id ?? "");
  const [destinationId, setDestinationId] = useState(
    current?.destination_account_id ?? "",
  );
  const [categoryId, setCategoryId] = useState(current?.category_id ?? "");
  const prefix = current?.id ?? "new";
  const fields = [
    {
      name: "name",
      label: "Nombre",
      value: current?.name ?? "",
      required: true,
    },
    {
      name: "amount",
      label: "Monto USD",
      value: current?.amount ?? "",
      required: true,
      type: "number",
      step: "0.01",
      min: "0.01",
    },
    {
      name: "description",
      label: "Descripción",
      value: current?.description ?? "",
    },
    { name: "notes", label: "Notas", value: current?.notes ?? "" },
  ];

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {current && <input type="hidden" name="id" value={current.id} />}
      {fields.map((field) => (
        <div key={field.name} className="grid gap-1.5">
          <Label htmlFor={`${prefix}-${field.name}`}>{field.label}</Label>
          <Input
            id={`${prefix}-${field.name}`}
            name={field.name}
            type={field.type ?? "text"}
            step={field.step}
            min={field.min}
            defaultValue={field.value}
            required={field.required}
          />
        </div>
      ))}
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-type`}>Tipo</Label>
        <select
          id={`${prefix}-type`}
          name="type"
          className={selectClass}
          value={type}
          onChange={(event) => {
            setType(event.target.value as typeof type);
            setCategoryId("");
          }}
        >
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
          <option value="transfer">Transferencia</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-account`}>
          {type === "transfer" ? "Cuenta origen" : "Cuenta"}
        </Label>
        <select
          id={`${prefix}-account`}
          name="accountId"
          className={selectClass}
          value={accountId}
          onChange={(event) => {
            setAccountId(event.target.value);
            if (event.target.value === destinationId) setDestinationId("");
          }}
          required
        >
          <option value="">Selecciona una cuenta</option>
          {accounts
            .filter((item) => !item.is_archived)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </div>
      {type === "transfer" ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-destination`}>Cuenta destino</Label>
          <FormSelect
            id={`${prefix}-destination`}
            name="destinationAccountId"
            value={destinationId}
            onValueChange={setDestinationId}
            placeholder="Selecciona otra cuenta"
            options={accounts
              .filter((item) => !item.is_archived && item.id !== accountId)
              .map((item) => ({ value: item.id, label: item.name }))}
          />
          <input type="hidden" name="categoryId" value="" />
        </div>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-category`}>Categoría</Label>
          <select
            id={`${prefix}-category`}
            name="categoryId"
            className={selectClass}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            <option value="">Selecciona una categoría</option>
            {categories
              .filter((item) => !item.is_archived && item.type === type)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
          <input type="hidden" name="destinationAccountId" value="" />
        </div>
      )}
      {type !== "transfer" ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-method`}>Método de pago</Label>
          <select
            id={`${prefix}-method`}
            name="paymentMethodId"
            className={selectClass}
            defaultValue={current?.payment_method_id ?? ""}
          >
            <option value="">Ninguno</option>
            {methods
              .filter((item) => !item.is_archived)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="paymentMethodId" value="" />
      )}
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-frequency`}>Frecuencia</Label>
        <select
          id={`${prefix}-frequency`}
          name="frequency"
          className={selectClass}
          defaultValue={current?.frequency ?? "monthly"}
        >
          <option value="weekly">Semanal</option>
          <option value="biweekly">Quincenal</option>
          <option value="monthly">Mensual</option>
          <option value="yearly">Anual</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-interval`}>Cada cuántos períodos</Label>
        <Input
          id={`${prefix}-interval`}
          name="intervalCount"
          type="number"
          min="1"
          max="100"
          defaultValue={current?.interval_count ?? 1}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-mode`}>Registro</Label>
        <select
          id={`${prefix}-mode`}
          name="mode"
          className={selectClass}
          defaultValue={current?.mode ?? "confirm"}
        >
          <option value="confirm">Pendiente de confirmar</option>
          <option value="auto">Automático</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-start`}>Inicio</Label>
        <Input
          id={`${prefix}-start`}
          name="startDate"
          type="date"
          defaultValue={current?.start_date ?? ""}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-end`}>Fin (opcional)</Label>
        <Input
          id={`${prefix}-end`}
          name="endDate"
          type="date"
          defaultValue={current?.end_date ?? ""}
        />
      </div>
      {(state?.error || state?.fieldErrors) && (
        <p role="alert" className="text-destructive text-sm sm:col-span-2">
          {state.error ?? "Revisa los campos del formulario."}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-income text-sm sm:col-span-2">
          {state.ok}
        </p>
      )}
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {current ? "Guardar cambios" : "Crear recurrente"}
      </Button>
    </form>
  );
}

function ExistingRule({
  rule,
  accounts,
  categories,
  methods,
}: Omit<Props, "rules"> & { rule: Rule }) {
  const [removeState, removeAction, removing] = useActionState(
    deleteRecurringRule,
    undefined,
  );
  return (
    <details className="rounded-xl border p-4">
      <summary className="cursor-pointer font-medium">
        {rule.name} · {rule.next_run_date} ·{" "}
        {rule.is_active ? "Activo" : "Inactivo"}
      </summary>
      <div className="mt-4 space-y-4">
        <RuleForm
          current={rule}
          accounts={accounts}
          categories={categories}
          methods={methods}
        />
        <div className="flex flex-wrap gap-2">
          {rule.is_active && (
            <form action={deactivateRecurringRule}>
              <input type="hidden" name="id" value={rule.id} />
              <Button type="submit" variant="outline">
                Desactivar
              </Button>
            </form>
          )}
          <form id={`delete-recurring-${rule.id}`} action={removeAction}>
            <input type="hidden" name="id" value={rule.id} />
            <ConfirmDialog
              title="¿Eliminar este recurrente?"
              description="Se eliminará la regla y no se crearán más movimientos programados."
              confirmLabel="Eliminar recurrente"
              trigger={
                <Button type="button" variant="destructive" disabled={removing}>
                  Eliminar
                </Button>
              }
              actionProps={{
                type: "submit",
                form: `delete-recurring-${rule.id}`,
                disabled: removing,
              }}
            />
          </form>
        </div>
        {removeState?.error && (
          <p role="alert" className="text-destructive text-sm">
            {removeState.error}
          </p>
        )}
      </div>
    </details>
  );
}

export function RecurringSettings({
  rules,
  accounts,
  categories,
  methods,
}: Props) {
  return (
    <section
      className="bg-card space-y-5 rounded-2xl border p-5 sm:p-6"
      aria-labelledby="recurring-title"
    >
      <div>
        <h2 id="recurring-title" className="text-lg font-semibold">
          Movimientos recurrentes
        </h2>
        <p className="text-muted-foreground text-sm">
          Los automáticos se registran al vencer; los demás quedan pendientes de
          confirmar.
        </p>
      </div>
      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer font-medium">
          Crear recurrente
        </summary>
        <div className="mt-4">
          <RuleForm
            accounts={accounts}
            categories={categories}
            methods={methods}
          />
        </div>
      </details>
      {rules.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aún no hay movimientos recurrentes.
        </p>
      ) : (
        rules.map((rule) => (
          <ExistingRule
            key={rule.id}
            rule={rule}
            accounts={accounts}
            categories={categories}
            methods={methods}
          />
        ))
      )}
    </section>
  );
}
