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

## Datos de ejemplo en desarrollo

Después de crear el administrador, puedes cargar ejemplos con:

```bash
node --env-file=.env.local scripts/seed-dev.mjs --confirmar
```

El script acepta únicamente el proyecto Supabase de desarrollo configurado y requiere la llave de servicio en `.env.local`. Agrega registros con el prefijo **Demo ·**, incluidos seis meses de movimientos, presupuestos, cuentas, proyecto, meta, inventario y lista. No crea usuarios ni cambia registros existentes. Si ya encuentra registros Demo, termina sin agregar nada. Los ejemplos permanecen en desarrollo; no ejecutes este comando para preparar producción.

Consulta la ayuda sin escribir datos con `node scripts/seed-dev.mjs --help`. Comprueba sus bloqueos de ejecución con `node --test scripts/seed-dev.check.mjs`.

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

## Uso y descargas

Registra ingresos, gastos y transferencias en Movimientos. Los movimientos recurrentes pendientes afectan los saldos cuando se confirman. Los precios de las listas de compra ya incluyen impuesto. El administrador decide los permisos por módulo desde Ajustes.

Usa **Buscar** o `Ctrl/Cmd + K` para abrir páginas, encontrar registros de tus módulos y crear movimientos o listas cuando tengas permiso. En el celular, abre el menú del navegador para agregar la app a la pantalla de inicio; necesitas conexión para consultar y guardar datos.

En las páginas de datos, **Descargar CSV** y **Descargar Excel** conservan los filtros elegidos y requieren permiso de lectura del módulo. Para descargar los artículos de una lista, abre esa lista. Las descargas recorren todas las páginas de datos, aunque la pantalla muestre una lista limitada.

El admin dispone en Ajustes de un **respaldo JSON** y un **reporte mensual Excel**. Movimientos, presupuestos y gastos por categoría corresponden al mes seleccionado; las demás hojas muestran el estado actual del hogar. El JSON incluye los registros y permisos, pero las fotos, comprobantes y cuentas de autenticación se conservan por separado. No incluye contraseñas ni existe importación automática desde la app. Guarda las descargas fuera del repositorio.

## Publicación y mantenimiento

La publicación es la última tarea. Sigue la [guía de despliegue](docs/DEPLOY.md) para crear un Supabase Free de producción independiente, configurar Vercel Hobby, aplicar migraciones, crear el admin, revisar el cron y conservar respaldos. Incluye las variables exactas y soluciones a problemas comunes.

Una vez publicada, puedes entrar desde cualquier red o dispositivo con navegador e internet, usando tus credenciales. Supabase Free puede pausar el proyecto por baja actividad; el cron diario no garantiza evitarlo. La guía explica cómo reactivarlo. Esta instalación no depende de recuperación por correo ni requiere configurar SMTP.
