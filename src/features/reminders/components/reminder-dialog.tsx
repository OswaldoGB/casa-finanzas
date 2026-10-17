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
import {
  Feedback,
  buttonClass,
} from "@/features/shopping-lists/components/forms";
import type { FormState } from "@/features/auth/schemas";
type Action = (state: FormState, form: FormData) => Promise<FormState>;
export function ReminderActionForm({
  action,
  children,
  onSuccess,
  label = "Guardar",
}: {
  action: Action;
  children: ReactNode;
  onSuccess?: () => void;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined),
    router = useRouter(),
    id = useId();
  const [key] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.ok, { id });
      if (onSuccess) onSuccess();
      else router.refresh();
    }
  }, [state, id, onSuccess, router]);
  return (
    <form
      action={formAction}
      onResetCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="grid min-w-0 gap-4"
      noValidate
    >
      <input
        name="request_key"
        type="hidden"
        value={key}
        suppressHydrationWarning
      />
      {children}
      <Feedback state={state?.ok ? undefined : state} />
      <button className={buttonClass} disabled={pending}>
        {pending ? "Guardando…" : label}
      </button>
    </form>
  );
}
export function ReminderDialog({
  title,
  description = "Los cambios se guardan sin salir de esta pantalla.",
  trigger,
  action,
  children,
  listenToNew = false,
  label,
}: {
  title: string;
  description?: string;
  trigger: ReactNode;
  action: Action;
  children: ReactNode;
  listenToNew?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false),
    router = useRouter(),
    requested = useSearchParams().get("new") === "1" && listenToNew;
  useEffect(() => {
    if (requested) {
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [requested]);
  const change = useCallback(
    (value: boolean) => {
      setOpen(value);
      if (!value && listenToNew) {
        const url = new URL(location.href);
        url.searchParams.delete("new");
        history.replaceState(
          null,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
    },
    [listenToNew],
  );
  const saved = useCallback(() => {
    change(false);
    router.refresh();
  }, [change, router]);
  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ReminderActionForm action={action} onSuccess={saved} label={label}>
          {children}
        </ReminderActionForm>
      </DialogContent>
    </Dialog>
  );
}
