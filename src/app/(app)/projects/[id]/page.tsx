import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjects } from "@/features/projects/queries";
import { ProjectForm } from "@/features/projects/components/project-form";
import { ActionForm } from "@/features/projects/components/action-form";
import { deleteProject } from "@/features/projects/actions";
import { projectStatus } from "@/features/projects/schemas";
import { formatUSD } from "@/lib/format";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { projects, canEdit } = await getProjects();
  const project = projects.find((item) => item.id === id);
  if (!project) notFound();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/projects" className="text-sm underline">
        ← Proyectos
      </Link>
      <header>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-muted-foreground text-sm">
          {projectStatus[project.status]} · {project.start_date ?? "Sin inicio"}{" "}
          — {project.end_date ?? "Sin fecha final"}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Presupuesto", project.budget],
          ["Gasto confirmado", project.spent],
          ["Disponible", project.budget - project.spent],
        ].map(([name, value]) => (
          <div className="bg-card rounded-2xl border p-5" key={String(name)}>
            <p className="text-muted-foreground text-xs">{name}</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatUSD(Number(value))}
            </p>
          </div>
        ))}
      </div>
      <p>{project.description}</p>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <section className="bg-card rounded-2xl border p-5">
          <h2 className="mb-3 font-semibold">Gastos vinculados</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Vincula un movimiento a este proyecto al crear o editar un gasto.
            Solo se suman gastos confirmados.
          </p>
          {project.expenses.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Todavía no hay gastos vinculados.
            </p>
          )}
          <ul className="divide-y">
            {project.expenses.map((expense) => (
              <li key={expense.id} className="flex justify-between gap-3 py-3">
                <div>
                  <p className="text-sm">{expense.description || "Gasto"}</p>
                  <time className="text-muted-foreground text-xs">
                    {expense.date}
                  </time>
                </div>
                <span className="text-sm font-medium">
                  {formatUSD(expense.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        {canEdit && (
          <aside className="bg-card space-y-6 rounded-2xl border p-5">
            <h2 className="font-semibold">Editar proyecto</h2>
            <ProjectForm project={project} />
            <ActionForm
              action={deleteProject}
              label="Eliminar proyecto"
              confirm="¿Eliminar este proyecto? Si tiene movimientos vinculados, archívalo en su lugar."
            >
              <input type="hidden" name="id" value={id} />
            </ActionForm>
          </aside>
        )}
      </div>
    </div>
  );
}
