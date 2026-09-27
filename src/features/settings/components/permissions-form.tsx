"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MODULES,
  type PermissionLevel,
  type PermissionMap,
} from "@/features/permissions/modules";
import { savePermissions } from "../actions";

const LEVELS: { value: PermissionLevel; label: string }[] = [
  { value: "none", label: "Sin acceso" },
  { value: "view", label: "Ver" },
  { value: "edit", label: "Editar" },
];

export function PermissionsForm({
  memberId,
  initial,
}: {
  memberId: string;
  initial: PermissionMap;
}) {
  const [state, formAction, pending] = useActionState(
    savePermissions,
    undefined,
  );
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="userId" value={memberId} />
      <div className="divide-border divide-y">
        {MODULES.map(({ name, label }) => (
          <fieldset
            key={name}
            className="grid gap-3 py-3 sm:grid-cols-[minmax(8rem,1fr)_auto] sm:items-center"
          >
            <legend className="text-sm font-medium sm:float-left">
              {label}
            </legend>
            <div
              className="bg-muted inline-flex w-fit flex-wrap gap-1 rounded-lg p-1"
              role="group"
              aria-label={`Permiso para ${label}`}
            >
              {LEVELS.map(({ value, label: levelLabel }) => (
                <label key={value} className="cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name={name}
                    value={value}
                    defaultChecked={(initial[name] ?? "none") === value}
                  />
                  <span className="peer-checked:bg-background peer-checked:text-foreground peer-focus-visible:ring-ring text-muted-foreground block rounded-md px-2.5 py-1.5 text-xs font-medium shadow-none transition peer-checked:shadow-sm peer-focus-visible:ring-2">
                    {levelLabel}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-income text-sm">
          {state.ok}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Guardar permisos
      </Button>
    </form>
  );
}
