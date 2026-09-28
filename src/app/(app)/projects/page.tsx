import { ExportButtons } from "@/features/exports/components/export-buttons";
import Link from "next/link";
import { getProjects } from "@/features/projects/queries";
import { ProjectForm } from "@/features/projects/components/project-form";
import { projectStatus } from "@/features/projects/schemas";
import { formatUSD } from "@/lib/format";

export const metadata = { title: "Proyectos" };
export default async function ProjectsPage() {
  const { projects, canEdit } = await getProjects();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Proyectos</h1>
        <p className="text-muted-foreground text-sm">
          Planes del hogar y lo que realmente cuestan.
        </p>
      </header>
      <ExportButtons target="projects" />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-4 sm:grid-cols-2">
          {projects.length === 0 && (
            <p className="text-muted-foreground rounded-2xl border p-6 text-sm">
              Todavía no hay proyectos. Crea uno y vincula sus gastos desde
              Movimientos.
            </p>
          )}
          {projects.map((project) => (
            <Link
              href={`/projects/${project.id}`}
              key={project.id}
              className="bg-card hover:border-primary space-y-3 rounded-2xl border p-5"
            >
              <div className="flex justify-between gap-2">
                <h2 className="font-semibold">{project.name}</h2>
                <span className="text-muted-foreground text-xs">
                  {projectStatus[project.status]}
                </span>
              </div>
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {project.description}
              </p>
              <p className="text-xl font-semibold">
                {formatUSD(project.spent)}{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  de {formatUSD(project.budget)}
                </span>
              </p>
              <progress
                className="h-2 w-full"
                max={project.budget || 1}
                value={Math.min(project.spent, project.budget || 1)}
                aria-label={`Gasto de ${project.name}`}
              />
              <p
                className={
                  project.spent > project.budget
                    ? "text-destructive text-sm"
                    : "text-muted-foreground text-sm"
                }
              >
                {project.spent > project.budget
                  ? `Excedido ${formatUSD(project.spent - project.budget)}`
                  : `Disponible ${formatUSD(project.budget - project.spent)}`}
              </p>
            </Link>
          ))}
        </section>
        {canEdit && (
          <aside className="bg-card rounded-2xl border p-5">
            <h2 className="mb-4 font-semibold">Nuevo proyecto</h2>
            <ProjectForm />
          </aside>
        )}
      </div>
    </div>
  );
}
