# Casa & Finanzas

App personal para las finanzas e inventario del hogar. Next.js 16 + Supabase. Spec y decisiones en [`docs/SPEC.md`](docs/SPEC.md).

## Desarrollo local

Requisitos: Node 24+, un proyecto Supabase **dev** (Free). No hace falta Docker.

1. `npm install`
2. `cp .env.example .env.local` y completa las llaves (Supabase → Project Settings → API).
3. Enlaza y aplica migraciones:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto-dev>
   npx supabase db push
   npm run db:types
   ```
4. En Supabase → Authentication → Sign In / Providers: desactiva **Allow new users to sign up**.
   En URL Configuration: Site URL `http://localhost:3000` y Redirect URL `http://localhost:3000/auth/confirm`.
5. `npm run dev` y abre http://localhost:3000/setup para crear el hogar y el admin.

## Hogar y miembros

El administrador entra a `/settings` para cambiar el nombre y la zona horaria del hogar, crear la cuenta de su pareja y asignarle permisos. Al crearla, la cuenta queda sin acceso a los módulos hasta que el administrador elija `Sin acceso`, `Ver` o `Editar` para cada uno y pulse **Guardar permisos**. Comparte la contraseña inicial de forma privada; la persona puede cambiarla después de iniciar sesión.

Para comprobar las políticas de la Fase 1 contra el proyecto **dev** enlazado, ejecuta `node scripts/verify-phase1.mjs`. El script crea un usuario temporal y lo elimina al terminar. No lo ejecutes en producción.

## Scripts

| Script             | Qué hace                                               |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Servidor de desarrollo                                 |
| `npm run check`    | Lint + typecheck + tests (correr antes de cada commit) |
| `npm run db:types` | Regenera `src/lib/supabase/database.types.ts`          |
| `npm run format`   | Prettier                                               |

El despliegue a Vercel se documenta en la Fase 8.
