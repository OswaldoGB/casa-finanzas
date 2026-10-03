"use client";

import { useActionState, useId, type ReactNode } from "react";
import type { FormState } from "@/features/auth/schemas";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ActionForm({
  action,
  children,
  label = "Guardar",
  className = "space-y-4",
  confirm,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  children: ReactNode;
  label?: string;
  className?: string;
  confirm?: string;
}) {
  const [state, submit, pending] = useActionState(action, undefined);
  const formId = useId();
  return (
    <form id={formId} action={submit} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.fieldErrors && (
        <ul role="alert" className="text-destructive text-sm">
          {Object.entries(state.fieldErrors).flatMap(([key, errors]) =>
            (errors ?? []).map((message) => (
              <li key={`${key}-${message}`}>{message}</li>
            )),
          )}
        </ul>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-600">
          {state.ok}
        </p>
      )}
      {confirm ? (
        <ConfirmDialog
          title="¿Confirmar esta acción?"
          description={confirm}
          confirmLabel={label}
          trigger={
            <button
              type="button"
              disabled={pending}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {label}
            </button>
          }
          actionProps={{ type: "submit", form: formId, disabled: pending }}
        />
      ) : (
        <button
          disabled={pending}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Guardando…" : label}
        </button>
      )}
    </form>
  );
}
