"use client";
import { FormSelect } from "@/components/ui/form-select";
import { ActionDialog } from "@/features/trips/components/action-dialog";
import { assignListProject } from "@/features/trips/actions";
export function ListProjectLink({
  listId,
  projectId,
  projects,
  hasPurchases,
}: {
  listId: string;
  projectId: string | null;
  projects: { id: string; name: string }[];
  hasPurchases: boolean;
}) {
  return (
    <ActionDialog
      title="Vincular lista a un viaje o proyecto"
      action={assignListProject}
      trigger={
        <button className="text-primary rounded-lg border px-3 py-2 text-sm">
          {projectId
            ? `Proyecto: ${projects.find((p) => p.id === projectId)?.name ?? "Vinculado"}`
            : "Vincular a viaje o proyecto"}
        </button>
      }
    >
      <input type="hidden" name="list_id" value={listId} />
      <label className="grid gap-2 text-sm">
        Viaje o proyecto
        <FormSelect
          name="project_id"
          defaultValue={projectId ?? "none"}
          placeholder="Selecciona un proyecto"
          options={[
            { value: "none", label: "Sin proyecto" },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </label>
      <p className="text-muted-foreground text-sm">
        Las compras aparecerán en el gasto real del proyecto sin crear
        movimientos adicionales. Los ingredientes vinculados a actividades deben
        separarse primero.
      </p>
      {hasPurchases && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="confirm_financial_change"
            className="mt-1"
          />
          También actualizar el proyecto de las compras ya pagadas.
        </label>
      )}
    </ActionDialog>
  );
}
