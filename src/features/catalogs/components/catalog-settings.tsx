"use client";

import { useActionState, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  archiveCategory,
  archivePaymentMethod,
  saveCategory,
  savePaymentMethod,
  moveCategory,
} from "../actions";
import { CategoryIcon } from "./category-icon";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  parent_id: string | null;
  color: string;
  icon: string;
  is_archived: boolean;
  sort_order: number;
};
type Method = {
  id: string;
  name: string;
  type: "cash" | "debit" | "credit" | "transfer" | "other";
  account_id: string | null;
  is_archived: boolean;
};
type Account = { id: string; name: string; is_archived: boolean };

const iconOptions = [
  ["tag", "Etiqueta"],
  ["shopping-cart", "Supermercado"],
  ["shopping-bag", "Compras y ventas"],
  ["house", "Hogar"],
  ["car", "Transporte"],
  ["utensils", "Comida"],
  ["briefcase-business", "Trabajo"],
  ["landmark", "Honorarios"],
  ["trending-up", "Inversiones"],
  ["rotate-ccw", "Reembolso"],
  ["circle-plus", "Extra"],
  ["receipt", "Recibos"],
  ["heart-pulse", "Salud"],
  ["clapperboard", "Entretenimiento"],
  ["smartphone", "Suscripciones"],
  ["shirt", "Ropa y cuidado"],
  ["paw-print", "Mascotas"],
  ["plane", "Viajes"],
  ["hand-coins", "Deudas y comisiones"],
  ["file-text", "Impuestos"],
  ["ellipsis", "Otros"],
  ["gift", "Regalos"],
  ["graduation-cap", "Educación"],
];

function Feedback({
  state,
}: {
  state:
    | {
        error?: string;
        ok?: string;
        fieldErrors?: Record<string, string[] | undefined>;
      }
    | undefined;
}) {
  return (
    <>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.fieldErrors && (
        <p role="alert" className="text-destructive text-sm">
          Revisa los campos del formulario.
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-income text-sm">
          {state.ok}
        </p>
      )}
    </>
  );
}

function CategoryForm({
  current,
  categories,
}: {
  current?: Category;
  categories: Category[];
}) {
  const [state, formAction, pending] = useActionState(saveCategory, undefined);
  const [type, setType] = useState<"income" | "expense">(
    current?.type ?? "expense",
  );
  const parents = categories.filter(
    (item) =>
      !item.parent_id &&
      item.type === type &&
      item.id !== current?.id &&
      !item.is_archived,
  );
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      {current && <input type="hidden" name="id" value={current.id} />}
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`cat-name-${current?.id ?? "new"}`}>Nombre</Label>
        <Input
          id={`cat-name-${current?.id ?? "new"}`}
          name="name"
          defaultValue={current?.name}
          required
          maxLength={80}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`cat-type-${current?.id ?? "new"}`}>Tipo</Label>
        <select
          id={`cat-type-${current?.id ?? "new"}`}
          name="type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as "income" | "expense")
          }
          className="bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
      </div>
      {parents.length > 0 ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`cat-parent-${current?.id ?? "new"}`}>
            Categoría principal
          </Label>
          <select
            key={type}
            id={`cat-parent-${current?.id ?? "new"}`}
            name="parentId"
            defaultValue={
              parents.some((item) => item.id === current?.parent_id)
                ? (current?.parent_id ?? "")
                : ""
            }
            className="bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Ninguna</option>
            {parents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="parentId" value="" />
      )}
      <div className="grid gap-1.5">
        <Label htmlFor={`cat-color-${current?.id ?? "new"}`}>Color</Label>
        <Input
          id={`cat-color-${current?.id ?? "new"}`}
          type="color"
          name="color"
          defaultValue={current?.color ?? "#6366f1"}
          className="h-9 w-full p-1"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`cat-icon-${current?.id ?? "new"}`}>Ícono</Label>
        <select
          id={`cat-icon-${current?.id ?? "new"}`}
          name="icon"
          defaultValue={current?.icon ?? "tag"}
          className="bg-background h-9 rounded-md border px-3 text-sm"
        >
          {iconOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {current ? "Guardar cambios" : "Crear categoría"}
      </Button>
    </form>
  );
}

function MethodForm({
  current,
  accounts,
}: {
  current?: Method;
  accounts: Account[];
}) {
  const [state, formAction, pending] = useActionState(
    savePaymentMethod,
    undefined,
  );
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      {current && <input type="hidden" name="id" value={current.id} />}
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`method-name-${current?.id ?? "new"}`}>Nombre</Label>
        <Input
          id={`method-name-${current?.id ?? "new"}`}
          name="name"
          defaultValue={current?.name}
          required
          maxLength={80}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`method-type-${current?.id ?? "new"}`}>Tipo</Label>
        <select
          id={`method-type-${current?.id ?? "new"}`}
          name="type"
          defaultValue={current?.type ?? "debit"}
          className="bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="cash">Efectivo</option>
          <option value="debit">Débito</option>
          <option value="credit">Crédito</option>
          <option value="transfer">Transferencia</option>
          <option value="other">Otro</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`method-account-${current?.id ?? "new"}`}>
          Cuenta vinculada
        </Label>
        <select
          id={`method-account-${current?.id ?? "new"}`}
          name="accountId"
          defaultValue={current?.account_id ?? ""}
          className="bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="">Ninguna</option>
          {accounts
            .filter((account) => !account.is_archived)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
        </select>
      </div>
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {current ? "Guardar cambios" : "Crear método"}
      </Button>
    </form>
  );
}

export function CatalogSettings({
  categories,
  methods,
  accounts,
}: {
  categories: Category[];
  methods: Method[];
  accounts: Account[];
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [ordering, startOrdering] = useTransition();
  function canDrop(target: Category) {
    const source = categories.find((item) => item.id === draggedId);
    return (
      !ordering &&
      source &&
      source.id !== target.id &&
      source.type === target.type &&
      source.parent_id === target.parent_id
    );
  }
  function dropCategory(target: Category) {
    setDropId(null);
    if (!canDrop(target) || !draggedId) return;
    const form = new FormData();
    form.set("id", draggedId);
    form.set("targetId", target.id);
    setDraggedId(null);
    startOrdering(async () => {
      try {
        await moveCategory(form);
        toast.success("Orden de categorías guardado.");
      } catch {
        toast.error("No se pudo guardar el orden. Inténtalo de nuevo.");
      }
    });
  }
  return (
    <>
      <section
        className="bg-card space-y-5 rounded-2xl border p-5 sm:p-6"
        aria-labelledby="categories-title"
      >
        <div>
          <h2 id="categories-title" className="text-lg font-semibold">
            Categorías
          </h2>
          <p className="text-muted-foreground text-sm">
            Organiza ingresos y gastos. Puedes crear subcategorías y archivar
            las que ya no uses. Arrastra el ícono para ordenar categorías del
            mismo tipo y nivel, o usa Subir y Bajar al abrirlas.
          </p>
        </div>
        <div className="divide-border divide-y rounded-xl border">
          {categories
            .filter((item) => !item.is_archived)
            .map((item) => (
              <details
                key={item.id}
                className={`group px-4 py-3 ${dropId === item.id ? "bg-accent" : ""}`}
                onDragOver={(event) => {
                  if (canDrop(item)) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropId(item.id);
                  }
                }}
                onDragLeave={() => setDropId(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  dropCategory(item);
                }}
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      draggable={!ordering}
                      className="text-muted-foreground cursor-grab touch-none"
                      title={`Arrastrar ${item.name}`}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", item.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggedId(item.id);
                      }}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDropId(null);
                      }}
                    >
                      <GripVertical className="size-4" aria-hidden="true" />
                    </span>
                    <span
                      className="grid size-7 place-items-center rounded-lg"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <CategoryIcon icon={item.icon} color={item.color} />
                    </span>
                    {item.name}
                  </span>
                  <span className="text-muted-foreground">
                    {item.type === "income" ? "Ingreso" : "Gasto"} · Editar
                  </span>
                </summary>
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    {(["up", "down"] as const).map((direction) => (
                      <form action={moveCategory} key={direction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="direction"
                          value={direction}
                        />
                        <Button
                          type="submit"
                          disabled={ordering}
                          variant="outline"
                          aria-label={`${direction === "up" ? "Subir" : "Bajar"} ${item.name}`}
                        >
                          {direction === "up" ? "↑ Subir" : "↓ Bajar"}
                        </Button>
                      </form>
                    ))}
                  </div>
                  <CategoryForm current={item} categories={categories} />
                  <form action={archiveCategory}>
                    <input type="hidden" name="id" value={item.id} />
                    <Button type="submit" variant="destructive">
                      Archivar categoría
                    </Button>
                  </form>
                </div>
              </details>
            ))}
        </div>
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Nueva categoría
          </summary>
          <div className="mt-4">
            <CategoryForm categories={categories} />
          </div>
        </details>
      </section>
      <section
        className="bg-card space-y-5 rounded-2xl border p-5 sm:p-6"
        aria-labelledby="methods-title"
      >
        <div>
          <h2 id="methods-title" className="text-lg font-semibold">
            Métodos de pago
          </h2>
          <p className="text-muted-foreground text-sm">
            Puedes vincularlos a una cuenta para agilizar los movimientos.
          </p>
        </div>
        <div className="divide-border divide-y rounded-xl border">
          {methods
            .filter((item) => !item.is_archived)
            .map((item) => (
              <details key={item.id} className="px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {item.name} · Editar
                </summary>
                <div className="mt-4 space-y-3">
                  <MethodForm current={item} accounts={accounts} />
                  <form action={archivePaymentMethod}>
                    <input type="hidden" name="id" value={item.id} />
                    <Button type="submit" variant="destructive">
                      Archivar método
                    </Button>
                  </form>
                </div>
              </details>
            ))}
        </div>
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Nuevo método de pago
          </summary>
          <div className="mt-4">
            <MethodForm accounts={accounts} />
          </div>
        </details>
      </section>
    </>
  );
}
