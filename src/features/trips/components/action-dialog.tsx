"use client";
import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Feedback,
  buttonClass,
} from "@/features/shopping-lists/components/forms";
import type { FormState } from "@/features/auth/schemas";
import { removeTripRecord } from "../actions";
type Action = (state: FormState, form: FormData) => Promise<FormState>;
export function ActionDialog({
  title,
  description = "Los cambios se guardan sin salir de esta pantalla.",
  trigger,
  action,
  children,
  listenToNew = false,
  redirectCreated = false,
}: {
  title: string;
  description?: string;
  trigger: ReactNode;
  action: Action;
  children: ReactNode;
  listenToNew?: boolean;
  redirectCreated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const requested = useSearchParams().get("new") === "1" && listenToNew;
  useEffect(() => {
    if (!requested) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [requested]);
  const changeOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next && listenToNew) {
        const url = new URL(window.location.href);
        if (url.searchParams.has("new")) {
          url.searchParams.delete("new");
          window.history.replaceState(
            null,
            "",
            `${url.pathname}${url.search}${url.hash}`,
          );
        }
      }
    },
    [listenToNew],
  );
  const saved = useCallback(
    (state: Exclude<FormState, undefined>) => {
      changeOpen(false);
      if (redirectCreated && "id" in state && typeof state.id === "string")
        router.push(`/trips/${state.id}`);
      else router.refresh();
    },
    [changeOpen, router, redirectCreated],
  );
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ActionForm action={action} onSuccess={saved}>
          {children}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
export function ActionForm({
  action,
  children,
  onSuccess,
  submitLabel = "Guardar",
}: {
  action: Action;
  children: ReactNode;
  onSuccess?: (state: Exclude<FormState, undefined>) => void;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const router = useRouter();
  const toastId = useId();
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.ok, { id: toastId });
      if (onSuccess) onSuccess(state);
      else router.refresh();
    }
  }, [state, onSuccess, router, toastId]);
  return (
    <form
      onResetCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      action={formAction}
      className="grid gap-4"
      noValidate
    >
      {children}
      <Feedback state={state?.ok ? undefined : state} />
      <button disabled={pending} className={buttonClass}>
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
export function RemoveRecord({
  id,
  kind,
  label,
}: {
  id: string;
  kind: "activity" | "cost" | "ingredient";
  label: string;
}) {
  const [state, action, pending] = useActionState(removeTripRecord, undefined);
  const formId = useId();
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
  return (
    <form id={formId} action={action} className="inline-flex gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <ConfirmDialog
        title={label}
        description="Se quitará de la planificación. Los movimientos y productos comprados se conservan."
        confirmLabel="Quitar"
        trigger={
          <button
            type="button"
            className="text-destructive rounded-lg px-2 py-1 text-xs"
            disabled={pending}
          >
            {label}
          </button>
        }
        actionProps={{ type: "submit", form: formId, disabled: pending }}
      />
      <Feedback state={state} />
    </form>
  );
}
