import { updatePassword } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata = { title: "Nueva contraseña" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-sm py-10">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Elige una contraseña nueva</h1>
      <AuthForm
        action={updatePassword}
        submitLabel="Guardar contraseña"
        fields={[
          { name: "password", label: "Contraseña nueva", type: "password", autoComplete: "new-password" },
          { name: "confirm", label: "Repite la contraseña", type: "password", autoComplete: "new-password" },
        ]}
      />
    </div>
  );
}
