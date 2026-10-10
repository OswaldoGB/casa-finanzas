import { MoneyInput } from "@/components/ui/money-input";
import { ActionForm } from "./action-form";
import { saveProject } from "../actions";
import { projectStatus, inputClass } from "../schemas";

type Project = {
  id: string;
  name: string;
  description: string | null;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  status: keyof typeof projectStatus;
};
export function ProjectForm({ project }: { project?: Project }) {
  return (
    <ActionForm action={saveProject}>
      {project && <input type="hidden" name="id" value={project.id} />}
      <label className="block space-y-1 text-sm">
        Nombre
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={project?.name}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        Descripción
        <textarea
          name="description"
          maxLength={2000}
          defaultValue={project?.description ?? ""}
          className={inputClass}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          Presupuesto ($)
          <MoneyInput
            name="budget"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={project?.budget ?? 0}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          Estado
          <select
            name="status"
            defaultValue={project?.status ?? "planned"}
            className={inputClass}
          >
            {Object.entries(projectStatus).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          Inicio
          <input
            name="start_date"
            type="date"
            defaultValue={project?.start_date ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          Final
          <input
            name="end_date"
            type="date"
            defaultValue={project?.end_date ?? ""}
            className={inputClass}
          />
        </label>
      </div>
    </ActionForm>
  );
}
