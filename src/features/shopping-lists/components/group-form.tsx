"use client";
import { useActionState } from "react";
import { saveGroup, archiveGroup, resolveItem, reopenList } from "../actions";
import { Feedback, buttonClass, fieldClass } from "./forms";
export function GroupForm({
  listId,
  group,
}: {
  listId: string;
  group?: { id: string; name: string };
}) {
  const [state, action, pending] = useActionState(saveGroup, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="list_id" value={listId} />
      {group && <input type="hidden" name="id" value={group.id} />}
      <label className="min-w-0 flex-1 text-sm">
        {group ? "Nombre del lugar" : "Nuevo lugar"}
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={group?.name}
          placeholder="Ej. Selectos"
          className={`${fieldClass} mt-1`}
        />
      </label>
      <button disabled={pending} className={buttonClass}>
        {group ? "Guardar lugar" : "Agregar lugar"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
export function ListAction({
  kind,
  listId,
  id,
  resolution,
  label,
}: {
  kind: "archive" | "resolve" | "reopen";
  listId: string;
  id?: string;
  resolution?: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(
    kind === "archive"
      ? archiveGroup
      : kind === "resolve"
        ? resolveItem
        : reopenList,
    undefined,
  );
  return (
    <form action={action} className="inline-flex flex-wrap gap-2">
      <input type="hidden" name="list_id" value={listId} />
      <input type="hidden" name="id" value={id ?? listId} />
      <input type="hidden" name="group_id" value={id ?? ""} />
      <input type="hidden" name="resolution" value={resolution ?? ""} />
      <button
        disabled={pending}
        className="hover:bg-accent rounded-lg border px-3 py-2 text-xs disabled:opacity-50"
      >
        {label}
      </button>
      <Feedback state={state} />
    </form>
  );
}
