import { AuthForm } from "@/features/auth/components/auth-form";
import { PermissionsForm } from "@/features/settings/components/permissions-form";
import { createMember, updateHousehold } from "@/features/settings/actions";
import { getSettings } from "@/features/settings/queries";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { household, members, member, permissions } = await getSettings();
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gestiona tu hogar y decide a qué puede acceder cada persona.
        </p>
      </div>

      <section
        className="bg-card space-y-5 rounded-2xl border p-5 sm:p-6"
        aria-labelledby="household-title"
      >
        <div>
          <h2 id="household-title" className="text-lg font-semibold">
            Hogar
          </h2>
          <p className="text-muted-foreground text-sm">
            La zona horaria determina el día local para próximos pagos y
            movimientos.
          </p>
        </div>
        <div className="max-w-md">
          <AuthForm
            action={updateHousehold}
            submitLabel="Guardar hogar"
            stayOpenOnSuccess
            fields={[
              {
                name: "name",
                label: "Nombre del hogar",
                defaultValue: household.name,
              },
              {
                name: "timezone",
                label: "Zona horaria",
                defaultValue: household.timezone,
              },
            ]}
          />
        </div>
      </section>

      <section
        className="bg-card space-y-5 rounded-2xl border p-5 sm:p-6"
        aria-labelledby="members-title"
      >
        <div>
          <h2 id="members-title" className="text-lg font-semibold">
            Miembros
          </h2>
          <p className="text-muted-foreground text-sm">
            El hogar admite dos personas: administrador y miembro.
          </p>
        </div>
        <ul className="divide-border divide-y rounded-xl border">
          {members.map((person) => (
            <li
              key={person.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="font-medium">{person.full_name}</span>
              <span className="text-muted-foreground">
                {person.role === "admin" ? "Administrador" : "Miembro"}
              </span>
            </li>
          ))}
        </ul>
        {!member && (
          <div className="max-w-md space-y-3 border-t pt-5">
            <div>
              <h3 className="font-medium">Agregar a tu pareja</h3>
              <p className="text-muted-foreground text-sm">
                Crea su acceso. Tú definirás sus permisos después; inicialmente
                no tendrá acceso a módulos.
              </p>
            </div>
            <AuthForm
              action={createMember}
              submitLabel="Crear miembro"
              fields={[
                { name: "fullName", label: "Nombre", autoComplete: "name" },
                {
                  name: "email",
                  label: "Correo",
                  type: "email",
                  autoComplete: "email",
                },
                {
                  name: "password",
                  label: "Contraseña inicial",
                  type: "password",
                  autoComplete: "new-password",
                },
              ]}
            />
          </div>
        )}
      </section>

      {member && (
        <section
          className="bg-card space-y-5 rounded-2xl border p-5 sm:p-6"
          aria-labelledby="permissions-title"
        >
          <div>
            <h2 id="permissions-title" className="text-lg font-semibold">
              Permisos de {member.full_name}
            </h2>
            <p className="text-muted-foreground text-sm">
              “Ver” permite solo lectura. “Editar” permite crear, cambiar y
              borrar. Tú siempre tienes acceso completo.
            </p>
          </div>
          <PermissionsForm memberId={member.id} initial={permissions} />
        </section>
      )}
    </div>
  );
}
