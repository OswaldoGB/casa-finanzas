"use client";
import { useActionState, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/ui/form-select";
import { formatUSD } from "@/lib/format";
import { recordPurchase } from "../actions";
import { Feedback, buttonClass, fieldClass } from "./forms";
import type { ShoppingItem } from "../queries";
type Props = {
  listId: string;
  groupId: string | null;
  name: string;
  items: ShoppingItem[];
  today: string;
  options: {
    accounts: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    methods: { id: string; name: string }[];
  };
};
export function PurchaseDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const saved = useCallback(
    (message: string) => {
      toast.success(message);
      setOpen(false);
      router.refresh();
    },
    [router],
  );
  const total = props.items.reduce(
    (sum, i) => sum + (i.real_price ?? 0) * i.quantity,
    0,
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={buttonClass}
          disabled={
            !props.items.length ||
            total <= 0 ||
            props.items.some((i) => i.real_price == null)
          }
        >
          Registrar compra · {formatUSD(total)}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compra en {props.name}</DialogTitle>
          <DialogDescription>
            Solo se pagarán los artículos de este carrito. Los demás siguen
            pendientes.
          </DialogDescription>
        </DialogHeader>
        <PurchaseForm {...props} onSuccess={saved} />
      </DialogContent>
    </Dialog>
  );
}
function PurchaseForm({
  onSuccess,
  ...props
}: Props & { onSuccess: (message: string) => void }) {
  const [key] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState(recordPurchase, undefined);
  useEffect(() => {
    if (state?.ok) onSuccess(state.ok);
  }, [state?.ok, onSuccess]);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="list_id" value={props.listId} />
      <input type="hidden" name="group_id" value={props.groupId ?? ""} />
      <input type="hidden" name="request_key" value={key} />
      <ul className="rounded-lg border p-3 text-sm">
        {props.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-2 py-1">
            <input type="hidden" name="item_ids" value={i.id} />
            <span>
              {i.quantity} {i.unit} · {i.name}
            </span>
            <span className="shrink-0">
              {formatUSD((i.real_price ?? 0) * i.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <label className="grid gap-1 text-sm">
        Cuenta o tarjeta
        <FormSelect
          name="account_id"
          placeholder="Seleccionar cuenta"
          options={props.options.accounts.map((a) => ({
            value: a.id,
            label: a.name,
          }))}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Categoría de gasto
        <FormSelect
          name="category_id"
          placeholder="Seleccionar categoría"
          options={props.options.categories.map((a) => ({
            value: a.id,
            label: a.name,
          }))}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Método de pago
        <FormSelect
          name="payment_method_id"
          placeholder="Sin especificar"
          options={props.options.methods.map((a) => ({
            value: a.id,
            label: a.name,
          }))}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Fecha
        <input
          type="date"
          name="date"
          required
          defaultValue={props.today}
          className={fieldClass}
        />
      </label>
      <Feedback state={state} />
      <button disabled={pending} className={buttonClass}>
        {pending ? "Registrando…" : "Confirmar compra"}
      </button>
    </form>
  );
}
