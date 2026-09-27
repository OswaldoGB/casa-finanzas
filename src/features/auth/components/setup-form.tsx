"use client";

import { useSyncExternalStore } from "react";
import type { FormState } from "../schemas";
import { AuthForm } from "./auth-form";

const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const noopSubscribe = () => () => {};

export function SetupForm({ action }: { action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  // Zona horaria del navegador; "UTC" durante el render en servidor.
  const timezone = useSyncExternalStore(noopSubscribe, browserTz, () => "UTC");
  return (
    <AuthForm
      action={action}
      submitLabel="Crear hogar"
      fields={[
        { name: "fullName", label: "Tu nombre", autoComplete: "name" },
        { name: "householdName", label: "Nombre del hogar", defaultValue: "Nuestra casa" },
        { name: "email", label: "Correo", type: "email", autoComplete: "email" },
        { name: "password", label: "Contraseña", type: "password", autoComplete: "new-password" },
        { name: "timezone", label: "", hidden: true, defaultValue: timezone },
      ]}
    />
  );
}
