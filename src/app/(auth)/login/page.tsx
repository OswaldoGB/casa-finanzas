import Link from "next/link";
import { login } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Bienvenido de vuelta</h1>
      <p className="text-muted-foreground mb-6 text-sm">Entra con tu correo y contraseña.</p>
      {(error === "link" || error === "profile") && (
        <p className="text-destructive mb-4 text-sm" role="alert">
          {error === "link" ? "El enlace expiró o no es válido. Pide uno nuevo." : "Tu usuario no tiene perfil en este hogar. Contacta al administrador."}
        </p>
      )}
      <AuthForm
        action={login}
        submitLabel="Entrar"
        fields={[
          { name: "email", label: "Correo", type: "email", autoComplete: "email" },
          { name: "password", label: "Contraseña", type: "password", autoComplete: "current-password" },
          { name: "next", label: "", hidden: true, defaultValue: typeof next === "string" ? next : "" },
        ]}
        footer={
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-center text-sm underline-offset-4 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        }
      />
    </>
  );
}
