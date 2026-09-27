"use client";

import { useActionState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "../schemas";

export type Field = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  hidden?: boolean;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  footer,
  stayOpenOnSuccess = false,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  footer?: ReactNode;
  stayOpenOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.ok && !stayOpenOnSuccess) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        {state.ok}
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {fields.map((f) => {
        if (f.hidden)
          return (
            <input
              key={f.name}
              type="hidden"
              name={f.name}
              value={f.defaultValue ?? ""}
            />
          );
        const err = state?.fieldErrors?.[f.name]?.[0];
        return (
          <div key={f.name} className="grid gap-1.5">
            <Label htmlFor={f.name}>{f.label}</Label>
            <Input
              id={f.name}
              name={f.name}
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              defaultValue={f.defaultValue}
              aria-invalid={Boolean(err)}
              aria-describedby={err ? `${f.name}-error` : undefined}
              required
            />
            {err && (
              <p id={`${f.name}-error`} className="text-destructive text-xs">
                {err}
              </p>
            )}
          </div>
        );
      })}
      {state?.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-income text-sm" role="status">
          {state.ok}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 h-10">
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {submitLabel}
      </Button>
      {footer}
    </form>
  );
}
