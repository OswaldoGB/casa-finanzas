import Link from "next/link";
import { requestPasswordReset } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Recuperar contraseña</h1>
      <p className="text-muted-foreground mb-6 text-sm">Te enviaremos un enlace a tu correo.</p>
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Enviar enlace"
        fields={[{ name: "email", label: "Correo", type: "email", autoComplete: "email" }]}
        footer={
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-center text-sm underline-offset-4 hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        }
      />
    </>
  );
}
